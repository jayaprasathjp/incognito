import express from "express";
import multer from "multer";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { checkIfTournamentFinished } from "../utils/tournamentHelpers.js";
import {
    expirePlayerDisputes,
    hasOpenPlayerDispute,
    hasScoreConflictDisputePending,
    ensureScoreConflictDispute,
} from "../utils/disputeHelpers.js";

// Supabase client for storage
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Configure multer to hold files in memory (buffer) for Supabase upload
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype);
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error("Only image files (jpg, png, gif, webp) are allowed."));
    }
});

const router = express.Router();

// Upload proof screenshot to Supabase Storage
router.post("/upload-proof", authenticateToken, upload.single("proof"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
        const ext = path.extname(req.file.originalname).toLowerCase();
        const fileName = `proof-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;

        const { data, error } = await supabase.storage
            .from("match-proofs")
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) throw error;

        // Get the permanent public URL
        const { data: urlData } = supabase.storage
            .from("match-proofs")
            .getPublicUrl(fileName);

        res.json({ url: urlData.publicUrl });
    } catch (err) {
        console.error("Supabase upload error:", err);
        res.status(500).json({ error: "Failed to upload image" });
    }
});

// Submit Match Result (Independent Claim & Auto-Resolve)
router.post("/:id/submit", authenticateToken, async (req, res) => {
    const { id } = req.params;
    // We expect the client to send 'my_score', 'opp_score', and optionally 'proof_image'
    const { my_score, opp_score, proof_image } = req.body;
    
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) return res.status(404).json({ error: "Match not found" });
            
            const match = matchRes.rows[0];
            const isP1 = match.player1_id === req.user.id;
            const isP2 = match.player2_id === req.user.id;

            if (!isP1 && !isP2) {
                return res.status(403).json({ error: "Not a participant in this match" });
            }
            if (match.status !== 'scheduled') {
                return res.status(400).json({ error: `Match cannot be submitted. Current status: ${match.status}` });
            }

            if (!match.game_room_code) {
                return res.status(400).json({ error: "Room code must be shared before submitting results or disputes." });
            }

            await expirePlayerDisputes(client, id);
            if (await hasOpenPlayerDispute(client, id)) {
                return res.status(400).json({ error: "A dispute is open on this match. Result submission is disabled until it is resolved." });
            }
            if (await hasScoreConflictDisputePending(client, id)) {
                return res.status(400).json({ error: "This match is under admin review. Result submission is disabled." });
            }

            const carry1 = parseInt(match.carried_score_p1, 10) || 0;
            const carry2 = parseInt(match.carried_score_p2, 10) || 0;

            // Save the claim for the specific player
            if (isP1) {
                await client.query(
                    `UPDATE matches SET p1_score = $1, p1_opp_score = $2, p1_proof = $3 WHERE id = $4`,
                    [my_score, opp_score, proof_image, id]
                );
                match.p1_score = my_score;
                match.p1_opp_score = opp_score;
            } else {
                await client.query(
                    `UPDATE matches SET p2_score = $1, p2_opp_score = $2, p2_proof = $3 WHERE id = $4`,
                    [my_score, opp_score, proof_image, id]
                );
                match.p2_score = my_score;
                match.p2_opp_score = opp_score;
            }

            // Check if BOTH have submitted
            const hasP1Submitted = match.p1_score !== null && match.p1_score !== undefined;
            const hasP2Submitted = match.p2_score !== null && match.p2_score !== undefined;

            let responseMsg = "Result submitted. Waiting for opponent.";

            if (hasP1Submitted && hasP2Submitted) {
                // Compare claims (leg scores); carry-over from disconnect is added to stored totals
                const p1ClaimsP1Score = parseInt(match.p1_score, 10);
                const p1ClaimsP2Score = parseInt(match.p1_opp_score, 10);
                const p2ClaimsP2Score = parseInt(match.p2_score, 10);
                const p2ClaimsP1Score = parseInt(match.p2_opp_score, 10);

                if (p1ClaimsP1Score === p2ClaimsP1Score && p1ClaimsP2Score === p2ClaimsP2Score) {
                    const totalP1 = carry1 + p1ClaimsP1Score;
                    const totalP2 = carry2 + p1ClaimsP2Score;
                    if (totalP1 === totalP2) {
                        await client.query(`UPDATE matches SET status = 'pending_review' WHERE id = $1`, [id]);
                        await ensureScoreConflictDispute(client, id, req.user.id);
                        responseMsg = "Equal total scores (including carry-over). Admin must decide.";
                    } else {
                        const winnerId = totalP1 > totalP2 ? match.player1_id : match.player2_id;
                        await client.query(
                            `UPDATE matches 
                             SET status = 'completed', score_player1 = $1, score_player2 = $2, winner_id = $3
                             WHERE id = $4`,
                            [totalP1, totalP2, winnerId, id]
                        );
                        await checkIfTournamentFinished(id, client);
                        responseMsg = "Both scores match! Match completed.";
                    }
                } else {
                    await client.query(`UPDATE matches SET status = 'pending_review' WHERE id = $1`, [id]);
                    await ensureScoreConflictDispute(client, id, req.user.id);
                    responseMsg =
                        "Scores do not match. Both proofs go to admin review. Result submission is closed until resolved.";
                }
            }

            await client.query('COMMIT');
            res.json({ message: responseMsg });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Post Game Room Code
router.post("/:id/room-code", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { game_room_code } = req.body;
    
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) throw new Error("Match not found");
            
            const match = matchRes.rows[0];
            if (match.player1_id !== req.user.id) {
                return res.status(403).json({ error: "Only the Home player (Player 1) can submit the room code." });
            }
            if (match.status !== 'scheduled') {
                return res.status(400).json({ error: "Match is not scheduled." });
            }

            await client.query(
                `UPDATE matches SET game_room_code = $1 WHERE id = $2`,
                [game_room_code, id]
            );

            await client.query('COMMIT');
            res.json({ message: "Room code submitted successfully", game_room_code });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/testxyz", (req, res) => res.json({ message: "Server updated" }));

// Get Player's Matches
router.get("/my-matches", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*, 
             p1.username as player1_name, 
             p2.username as player2_name,
             t.title as tournament_title,
             t.status as tournament_status
             FROM matches m
             LEFT JOIN users p1 ON m.player1_id = p1.id
             LEFT JOIN users p2 ON m.player2_id = p2.id
             JOIN tournaments t ON m.tournament_id = t.id
             WHERE (m.player1_id = $1 OR m.player2_id = $1)
             ORDER BY m.id DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching my-matches:", err);
        res.status(500).json({ error: "MY_MATCHES_ERROR", details: err.message, stack: err.stack });
    }
});

router.get("/:id/disputes", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const mRes = await pool.query(
            "SELECT player1_id, player2_id FROM matches WHERE id = $1",
            [id]
        );
        if (mRes.rows.length === 0) return res.status(404).json({ error: "Match not found" });
        const m = mRes.rows[0];
        if (m.player1_id !== req.user.id && m.player2_id !== req.user.id) {
            return res.status(403).json({ error: "Not a participant in this match" });
        }

        const dRes = await pool.query(
            `SELECT d.*, u.username AS submitted_by_name
             FROM disputes d
             JOIN users u ON d.submitted_by = u.id
             WHERE d.match_id = $1
             ORDER BY d.created_at DESC`,
            [id]
        );
        res.json(dRes.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/:id/disputes", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        reason,
        reason_category,
        description,
        evidence_url,
        screenshots,
        score_for,
        score_against,
        carry_score_p1,
        carry_score_p2,
    } = req.body;

    if (!reason || String(reason).trim().length < 3) {
        return res.status(400).json({ error: "Please provide a reason (at least 3 characters)." });
    }
    if (!["connection_issues", "rule_violation", "others"].includes(reason_category)) {
        return res.status(400).json({ error: "Invalid reason category." });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await expirePlayerDisputes(client, id);

            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ error: "Match not found" });
            }
            const match = matchRes.rows[0];

            if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
                await client.query("ROLLBACK");
                return res.status(403).json({ error: "Not a participant in this match" });
            }
            if (match.status !== "scheduled") {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Match is not open for disputes." });
            }
            if (!match.game_room_code) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Share the room code before opening a dispute." });
            }

            const openP = await client.query(
                `SELECT id FROM disputes WHERE match_id = $1
                 AND COALESCE(dispute_kind, 'player_claim') = 'player_claim'
                 AND status = 'pending'`,
                [id]
            );
            if (openP.rows.length > 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "A player dispute is already open on this match." });
            }

            const c1 = Math.max(0, parseInt(carry_score_p1, 10) || 0);
            const c2 = Math.max(0, parseInt(carry_score_p2, 10) || 0);

            const submitShots = Array.isArray(screenshots)
                ? screenshots.filter((u) => typeof u === "string" && u.trim())
                : [];
            const sf = Number.isFinite(parseInt(score_for, 10)) ? parseInt(score_for, 10) : null;
            const sa = Number.isFinite(parseInt(score_against, 10)) ? parseInt(score_against, 10) : null;

            const ins = await client.query(
                `INSERT INTO disputes (
                    match_id, submitted_by, reason, evidence_url, status,
                    dispute_kind, respond_by, carry_score_p1, carry_score_p2,
                    reason_category, description, submitter_score_for, submitter_score_against, submitter_screenshots
                ) VALUES ($1, $2, $3, $4, 'pending', 'player_claim', NOW() + INTERVAL '1 hour', $5, $6, $7, $8, $9, $10, $11::jsonb)
                RETURNING *`,
                [
                    id,
                    req.user.id,
                    String(reason).trim(),
                    evidence_url || null,
                    c1,
                    c2,
                    reason_category,
                    description || null,
                    sf,
                    sa,
                    JSON.stringify(submitShots),
                ]
            );

            await client.query("COMMIT");
            res.json({ dispute: ins.rows[0], message: "Dispute submitted. Your opponent has 1 hour to respond." });
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Server error" });
    }
});

router.post("/:id/disputes/:disputeId/respond", authenticateToken, async (req, res) => {
    const { id, disputeId } = req.params;
    const { action, description, score_for, score_against, screenshots } = req.body;

    if (!["accept", "reject"].includes(action)) {
        return res.status(400).json({ error: "action must be 'accept' or 'reject'" });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await expirePlayerDisputes(client, id);

            const dRes = await client.query(
                `SELECT * FROM disputes WHERE id = $1 AND match_id = $2 FOR UPDATE`,
                [disputeId, id]
            );
            if (dRes.rows.length === 0) {
                await client.query("ROLLBACK");
                return res.status(404).json({ error: "Dispute not found" });
            }
            const d = dRes.rows[0];

            const kind = d.dispute_kind || "player_claim";
            if (kind !== "player_claim" || d.status !== "pending") {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "This dispute cannot be responded to." });
            }

            const mRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            const match = mRes.rows[0];
            if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
                await client.query("ROLLBACK");
                return res.status(403).json({ error: "Not a participant" });
            }
            if (d.submitted_by === req.user.id) {
                await client.query("ROLLBACK");
                return res.status(403).json({ error: "You cannot respond to your own dispute." });
            }

            if (d.respond_by && new Date(d.respond_by) < new Date()) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "The response window has expired." });
            }

            const oppShots = Array.isArray(screenshots)
                ? screenshots.filter((u) => typeof u === "string" && u.trim())
                : [];
            const sf = Number.isFinite(parseInt(score_for, 10)) ? parseInt(score_for, 10) : null;
            const sa = Number.isFinite(parseInt(score_against, 10)) ? parseInt(score_against, 10) : null;
            if (sf === null || sa === null) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Please provide score_for and score_against." });
            }
            if (oppShots.length === 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Please upload at least one screenshot." });
            }
            if (action === "reject" && (!description || String(description).trim().length < 3)) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "Description is required when rejecting a dispute." });
            }

            if (action === "accept") {
                await client.query(
                    `UPDATE disputes
                     SET status = 'resolved',
                         opponent_action = 'accepted',
                         resolved_outcome = 'rematch',
                         opponent_score_for = $2,
                         opponent_score_against = $3,
                         opponent_screenshots = $4::jsonb
                     WHERE id = $1`,
                    [disputeId, sf, sa, JSON.stringify(oppShots)]
                );
                await client.query(
                    `UPDATE matches SET
                        status = 'scheduled',
                        p1_score = NULL, p2_score = NULL, p1_opp_score = NULL, p2_opp_score = NULL,
                        p1_proof = NULL, p2_proof = NULL,
                        game_room_code = NULL,
                        player1_ready = false, player2_ready = false,
                        checked_in_at = NULL,
                        winner_id = NULL,
                        score_player1 = NULL, score_player2 = NULL,
                        carried_score_p1 = $1,
                        carried_score_p2 = $2
                     WHERE id = $3`,
                    [d.carry_score_p1 || 0, d.carry_score_p2 || 0, id]
                );
                await client.query("COMMIT");
                return res.json({
                    message:
                        "You agreed to a rematch. Carry-over scores from the dispute are saved. Re-check in and share a new room code.",
                });
            }

            await client.query(
                `UPDATE disputes
                 SET status = 'resolved',
                     opponent_action = 'rejected',
                     resolved_outcome = 'double_dq',
                     opponent_description = $2,
                     opponent_score_for = $3,
                     opponent_score_against = $4,
                     opponent_screenshots = $5::jsonb
                 WHERE id = $1`,
                [disputeId, String(description || "").trim(), sf, sa, JSON.stringify(oppShots)]
            );
            await client.query(
                `UPDATE matches SET status = 'cancelled', winner_id = NULL, match_code = 'DISPUTE_DOUBLE_DQ' WHERE id = $1`,
                [id]
            );
            await checkIfTournamentFinished(id, client);
            await client.query("COMMIT");
            return res.json({ message: "Both players are disqualified from this match." });
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Server error" });
    }
});

// Get Check-in / Match Details
router.get("/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const ex = await pool.connect();
        try {
            await ex.query("BEGIN");
            await expirePlayerDisputes(ex, id);
            await ex.query("COMMIT");
        } catch (e) {
            await ex.query("ROLLBACK");
            console.error(e);
        } finally {
            ex.release();
        }

        const result = await pool.query(
            `SELECT m.*, 
             p1.username as player1_name, 
             p2.username as player2_name,
             t.title as tournament_title,
             t.status as tournament_status,
             r.date as match_date
             FROM matches m
             LEFT JOIN users p1 ON m.player1_id = p1.id
             LEFT JOIN users p2 ON m.player2_id = p2.id
             JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN rounds r ON m.tournament_id = r.tournament_id AND m.round = r.round_number
             WHERE m.id = $1`,
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Match not found" });
        
        const match = result.rows[0];
        if (match.player1_id !== req.user.id && match.player2_id !== req.user.id) {
            return res.status(403).json({ error: "Not a participant in this match" });
        }
        
        const isP1 = match.player1_id === req.user.id;
        match.hasSubmited = isP1 ? (match.p1_score !== null) : (match.p2_score !== null);
        match.opponentHasSubmitted = isP1 ? (match.p2_score !== null) : (match.p1_score !== null);
        match.isHome = isP1;

        const disputesRes = await pool.query(
            `SELECT d.*, u.username AS submitted_by_name
             FROM disputes d
             JOIN users u ON d.submitted_by = u.id
             WHERE d.match_id = $1
             ORDER BY d.created_at DESC`,
            [id]
        );
        match.disputes = disputesRes.rows;

        const pendingPlayer = disputesRes.rows.find(
            (d) =>
                (d.dispute_kind === "player_claim" || !d.dispute_kind) &&
                d.status === "pending" &&
                d.respond_by
        );
        const pendingAdmin = disputesRes.rows.some(
            (d) => d.dispute_kind === "score_conflict" && d.status === "pending"
        );

        match.disputeBlocksSubmission =
            (!!pendingPlayer && pendingPlayer.status === "pending") || pendingAdmin;

        match.opponentDisputePending =
            pendingPlayer &&
            pendingPlayer.submitted_by !== req.user.id &&
            (match.player1_id === req.user.id || match.player2_id === req.user.id)
                ? pendingPlayer
                : null;

        match.disputeRespondExpiresAt =
            pendingPlayer && pendingPlayer.respond_by ? pendingPlayer.respond_by : null;
        
        res.json(match);
    } catch (err) {
        console.error("Error fetching match:", err);
        res.status(500).json({ error: "MATCH_ID_ERROR" });
    }
});

// Mark Player as Ready (Check-in)
router.post("/:id/ready", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) throw new Error("Match not found");
            
            const match = matchRes.rows[0];
            const isPlayer1 = match.player1_id === req.user.id;
            const isPlayer2 = match.player2_id === req.user.id;
            
            if (!isPlayer1 && !isPlayer2) throw new Error("Not a participant");
            if (match.status !== 'scheduled') throw new Error("Match is not in scheduled state");

            // Update readiness
            if (isPlayer1) match.player1_ready = true;
            if (isPlayer2) match.player2_ready = true;

            let checkedInAt = match.checked_in_at;
            if (match.player1_ready && match.player2_ready && !checkedInAt) {
                checkedInAt = new Date(); // Both ready, start match timer
            }

            await client.query(
                `UPDATE matches SET player1_ready = $1, player2_ready = $2, checked_in_at = $3 WHERE id = $4`,
                [match.player1_ready, match.player2_ready, checkedInAt, id]
            );

            await client.query('COMMIT');
            res.json({ message: "Check-in successful", match: { ...match, checked_in_at: checkedInAt } });
        } catch (e) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Trigger Walkover Calculation
router.post("/:id/check-walkover", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) throw new Error("Match not found");
            
            const match = matchRes.rows[0];
            if (match.status !== 'scheduled') throw new Error("Match already resolved");

            // For simplicity, checking if 30+ mins passed since match_time
            // Ideally match_time is parsed correctly based on the day. Since it's 'HH:mm', we need a robust approach.
            // Client will handle most time blocking, but here we can just enact the walkover.
            
            let winnerId = null;
            let note = "Walkover";
            
            if (match.player1_ready && !match.player2_ready) {
                winnerId = match.player1_id;
            } else if (!match.player1_ready && match.player2_ready) {
                winnerId = match.player2_id;
            } else if (!match.player1_ready && !match.player2_ready) {
                // both lose/cancel - we set status to cancelled
                await client.query("UPDATE matches SET status = 'cancelled' WHERE id = $1", [id]);
                await client.query('COMMIT');
                return res.json({ message: "Match cancelled. Neither player checked in." });
            } else {
                throw new Error("Both players are ready. Play the match.");
            }

            // Award walkover
            await client.query(
                `UPDATE matches SET status = 'completed', winner_id = $1, match_code = 'WALKOVER' WHERE id = $2`,
                [winnerId, id]
            );
            await checkIfTournamentFinished(id, client);
            await client.query('COMMIT');
            res.json({ message: "Walkover applied successfully.", winner_id: winnerId });

        } catch (e) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Check Match Timeout (called when 60-min timer expires)
router.post("/:id/check-timeout", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const MATCH_DURATION_MS = 60 * 60 * 1000; // 60 minutes

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await expirePlayerDisputes(client, id);
            const matchRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [id]);
            if (matchRes.rows.length === 0) throw new Error("Match not found");

            const match = matchRes.rows[0];
            if (match.status !== 'scheduled') {
                await client.query('COMMIT');
                return res.json({ message: "Match already resolved", status: match.status });
            }

            // Verify that 60 minutes have actually passed since check-in
            if (!match.checked_in_at) throw new Error("Match check-in has not occurred");
            const elapsed = Date.now() - new Date(match.checked_in_at).getTime();
            if (elapsed < MATCH_DURATION_MS - 5000) { // 5s buffer
                throw new Error("Match timer has not expired yet");
            }

            // RULE 1: Home player never shared room code → Away auto-advances
            if (!match.game_room_code) {
                await client.query(
                    `UPDATE matches SET status = 'completed', winner_id = $1, match_code = 'HOME_NO_CODE' WHERE id = $2`,
                    [match.player2_id, id]
                );
                await checkIfTournamentFinished(id, client);
                await client.query('COMMIT');
                return res.json({ 
                    message: "Home player failed to share room code. Away player advances.", 
                    winner_id: match.player2_id,
                    reason: "home_no_code"
                });
            }

            // RULE 2: Check submissions
            const p1Submitted = match.p1_score !== null;
            const p2Submitted = match.p2_score !== null;

            if (!p1Submitted && !p2Submitted) {
                const dpend = await client.query(
                    `SELECT id FROM disputes WHERE match_id = $1
                     AND COALESCE(dispute_kind, 'player_claim') = 'player_claim'
                     AND status = 'pending'`,
                    [id]
                );
                if (dpend.rows.length > 0) {
                    await client.query("COMMIT");
                    return res.json({
                        message:
                            "A dispute is pending. Results are frozen until the opponent responds or the dispute deadline passes.",
                        reason: "dispute_pending_hold",
                    });
                }
                await client.query(
                    `UPDATE matches SET status = 'cancelled', match_code = 'DOUBLE_DQ' WHERE id = $1`,
                    [id]
                );
                await checkIfTournamentFinished(id, client);
                await client.query("COMMIT");
                return res.json({
                    message: "Neither player submitted results. Both are disqualified.",
                    reason: "double_dq",
                });
            }

            if (p1Submitted && !p2Submitted) {
                // Only P1 submitted → P1 wins by default
                await client.query(
                    `UPDATE matches SET status = 'completed', winner_id = $1, score_player1 = $2, score_player2 = $3, match_code = 'TIMEOUT_WIN' WHERE id = $4`,
                    [match.player1_id, match.p1_score, match.p1_opp_score, id]
                );
                await checkIfTournamentFinished(id, client);
                await client.query('COMMIT');
                return res.json({ 
                    message: "Opponent did not submit. You win by default.", 
                    winner_id: match.player1_id,
                    reason: "timeout_win"
                });
            }

            if (!p1Submitted && p2Submitted) {
                // Only P2 submitted → P2 wins by default
                await client.query(
                    `UPDATE matches SET status = 'completed', winner_id = $1, score_player1 = $2, score_player2 = $3, match_code = 'TIMEOUT_WIN' WHERE id = $4`,
                    [match.player2_id, match.p2_opp_score, match.p2_score, id]
                );
                await checkIfTournamentFinished(id, client);
                await client.query('COMMIT');
                return res.json({ 
                    message: "Opponent did not submit. You win by default.", 
                    winner_id: match.player2_id,
                    reason: "timeout_win"
                });
            }

            // Both submitted — this shouldn't happen (auto-resolve already ran), but handle it
            await client.query('COMMIT');
            res.json({ message: "Both players already submitted. Match should be resolved." });

        } catch (e) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
