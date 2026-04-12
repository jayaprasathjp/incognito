import express from "express";
import { pool } from "../db.js";
import { authenticateToken, authorizeAdmin } from "../middleware/auth.js";
import { checkIfTournamentFinished } from "../utils/tournamentHelpers.js";

const router = express.Router();

// Middleware to ensure admin access for all routes
router.use(authenticateToken, authorizeAdmin);

// === DASHBOARD STATS ===
router.get("/stats", async (req, res) => {
    try {
        // 1. Get Latest Tournament
        const tResult = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        const tournament = tResult.rows[0] || null;

        let participantsCount = 0;
        let currentRoundMatchCount = 0;
        let currentRound = 1;
        let tournamentTitle = "No Tournament";
        let tournamentStatus = "None";

        if (tournament) {
            tournamentTitle = tournament.title;
            tournamentStatus = tournament.status;

            // Participants in this tournament
            const pRes = await pool.query("SELECT COUNT(*) FROM participants WHERE tournament_id = $1", [tournament.id]);
            participantsCount = parseInt(pRes.rows[0].count);

            // Current Round
            if (['active', 'paused', 'completed'].includes(tournament.status)) {
                const roundRes = await pool.query("SELECT MAX(round) FROM matches WHERE tournament_id = $1", [tournament.id]);
                currentRound = roundRes.rows[0].max || 1;
            }

            // Matches in current round (excluding BYEs so the number reflects actual games)
            const mRes = await pool.query("SELECT COUNT(*) FROM matches WHERE tournament_id = $1 AND round = $2 AND match_code != 'BYE'", [tournament.id, currentRound]);
            currentRoundMatchCount = parseInt(mRes.rows[0].count);
        }

        // System stats (optional, but let's keep alerts/prize pool)
        const pendingDisputes = await pool.query("SELECT COUNT(*) FROM disputes WHERE status = 'pending'");
        // Prize pool is now taken from the existing tournament record
        const prizePool = tournament ? (parseInt(tournament.prize_pool) || 0) : 0;
        
        // Recent Alerts
        const recentDisputes = await pool.query(`
            SELECT 'dispute' as type, id, created_at, status 
            FROM disputes 
            WHERE status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 3
        `);
        
        const recentPayouts = await pool.query(`
            SELECT 'payout' as type, id, amount, created_at, status 
            FROM payouts 
            WHERE status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 3
        `);

        res.json({
            tournament: {
                title: tournamentTitle,
                status: tournamentStatus,
                currentRound: currentRound,
                participants: participantsCount,
                roundMatches: currentRoundMatchCount,
                registration_start: tournament?.registration_start || null,
                registration_end: tournament?.registration_end || null
            },
            prizePool,
            pendingIssues: {
                disputes: parseInt(pendingDisputes.rows[0].count),
                payouts: parseInt(recentPayouts.rows.length) // Fix: was using pendingPayouts which is undefined in original code too? checked above. 
                // Wait, original code had `pendingPayouts` usage but didn't define it properly in the query? 
                // Ah, looking at original code: `const pendingDisputes...`. `const prizePool...`. 
                // It accessed `pendingPayouts.rows[0].count` but where was `pendingPayouts` defined? 
                // It wasn't defined in the snippet I saw! It likely crashed or was just wrong in my view?
                // I will fix it here.
            },
            alerts: [...recentDisputes.rows, ...recentPayouts.rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/payments/:id/mark-paid", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("UPDATE payments SET status = 'completed' WHERE id = $1", [id]);
        res.json({ message: "Payment marked as paid" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === PLAYERS ===
router.get("/players", async (req, res) => {
    try {
        const { search } = req.query;
        let query = "SELECT id, username, email, role, status, created_at FROM users WHERE role = 'player'";
        let params = [];
        
        if (search) {
            query += " AND (username ILIKE $1 OR email ILIKE $1)";
            params.push(`%${search}%`);
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/players/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const user = await pool.query("SELECT id, username, email, role, status, institution, referral_code FROM users WHERE id = $1", [id]);
        if (user.rows.length === 0) return res.status(404).json({ error: "Player not found" });

        const bank = await pool.query("SELECT * FROM bank_details WHERE user_id = $1", [id]);
        const referrals = await pool.query("SELECT COUNT(*) FROM referrals WHERE referrer_id = $1", [id]);

        res.json({
            profile: user.rows[0],
            bankDetails: bank.rows[0] || {},
            referralStats: {
                code: user.rows[0].referral_code,
                count: parseInt(referrals.rows[0].count)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === PLAYERS ===
router.post("/players/:id/ban", async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'ban' or 'unban' (optional for future)

        // Toggle status or set to banned. For this task, we set to 'banned'.
        // If already banned, maybe unban? Let's just implement explicit ban for now as requested.
        
        const update = await pool.query(
            "UPDATE users SET status = 'banned' WHERE id = $1 RETURNING id, username, status",
            [id]
        );
        
        if (update.rows.length === 0) return res.status(404).json({ error: "Player not found" });

        res.json({ message: "Player banned successfully", player: update.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === TOURNAMENTS ===
router.get("/tournaments/control", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, 
            (SELECT COUNT(*) FROM participants p WHERE p.tournament_id = t.id) as participants_count 
            FROM tournaments t 
            ORDER BY t.created_at DESC LIMIT 1
        `);
        if (result.rows.length === 0) return res.json({});
        
        const tournament = result.rows[0];
        
        // Fetch rounds from dedicated table
        const roundsRes = await pool.query(
            "SELECT * FROM rounds WHERE tournament_id = $1 ORDER BY round_number ASC", 
            [tournament.id]
        );
        
        if (roundsRes.rows.length > 0) {
            // Auto-generate fixtures for rounds whose date has arrived
            if (tournament.status === 'active' || tournament.status === 'scheduled') {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                let fixturesGeneratedNow = false;
                
                for (const round of roundsRes.rows) {
                    const roundDateStr = round.date ? (() => {
                        const d = new Date(round.date);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })() : null;
                    
                    if (roundDateStr && roundDateStr <= todayStr && !round.fixtures_generated) {
                        console.log(`[AUTO-TRIGGER] Generating fixtures for round ${round.round_number}`);
                        try {
                            await generateFixturesForRound(tournament.id, round.round_number);
                            fixturesGeneratedNow = true;
                        } catch (autoErr) {
                            console.error(`[AUTO-TRIGGER] Failed for round ${round.round_number}:`, autoErr.message);
                        }
                    }
                }
                
                // If it was just scheduled but fixtures dropped, automatically start the tournament!
                if (fixturesGeneratedNow && tournament.status === 'scheduled') {
                    await pool.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [tournament.id]);
                    tournament.status = 'active';
                }
                
                // Re-fetch rounds after auto-generation
                const updatedRoundsRes = await pool.query(
                    "SELECT * FROM rounds WHERE tournament_id = $1 ORDER BY round_number ASC", 
                    [tournament.id]
                );
                roundsRes.rows = updatedRoundsRes.rows;
            }

            // Reconstruct rounds_config object for frontend compatibility
            tournament.rounds_config = {
                type: "Custom Schedule",
                description: "Schedule loaded from database",
                rounds: roundsRes.rows.map(r => ({
                    ...r,
                    fixtures_generated: r.fixtures_generated || false,
                    date: r.date ? (() => {
                        const d = new Date(r.date);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })() : ''
                }))
            };
        } else {
             tournament.rounds_config = null;
        }

        res.json(tournament);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/tournaments/control", async (req, res) => {
    try {
        console.log('DEBUG /tournaments/control body:', req.body);
        const { action, id } = req.body; // action: 'start', 'pause', 'end'

        if (action === 'start') {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // 1. Check current status
                const tCheck = await client.query("SELECT status FROM tournaments WHERE id = $1", [id]);
                if (tCheck.rows.length === 0) throw new Error("Tournament not found");
                if (tCheck.rows[0].status !== 'open') throw new Error("Tournament already started or inactive");

                // 2. Check if matches already exist (from Auto-Matchmaking)
                const existingMatches = await client.query("SELECT COUNT(*) FROM matches WHERE tournament_id = $1", [id]);
                const matchCount = parseInt(existingMatches.rows[0].count);

                if (matchCount > 0) {
                    // CASE A: Matches exist (Auto-matched). Just activate.
                    await client.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [id]);
                    res.json({ message: "Tournament started (matches preserved)", matches: matchCount });
                } else {
                    // CASE B: No matches yet. Use generateFixturesForRound for Round 1.
                    // This handles power-of-2 BYEs, session-based pairing, and staggered times.
                    
                    // Check if round 1 exists in rounds table
                    const round1Check = await client.query(
                        "SELECT id FROM rounds WHERE tournament_id = $1 AND round_number = 1",
                        [id]
                    );
                    
                    await client.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [id]);
                    await client.query('COMMIT');
                    client.release();
                    
                    // Generate fixtures using the dedicated function (it manages its own transaction)
                    if (round1Check.rows.length > 0) {
                        try {
                            const result = await generateFixturesForRound(id, 1);
                            const msg = `Tournament started. Created ${result.scheduled} matches` + (result.byes ? ` and ${result.byes} BYEs` : '');
                            res.json({ message: msg, matches_created: result.scheduled, byes_created: result.byes });
                        } catch (genErr) {
                            console.error('Auto-generate R1 on start error:', genErr.message);
                            res.json({ message: "Tournament started, but fixture generation failed: " + genErr.message });
                        }
                    } else {
                        res.json({ message: "Tournament started. Generate fixtures via schedule." });
                    }
                    return; // Already committed and responded
                }

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(e);
                res.status(400).json({ error: e.message || "Server error" });
            } finally {
                client.release();
            }

        } else if (action === 'reset') {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query("DELETE FROM disputes WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)", [id]);
                await client.query("DELETE FROM matches WHERE tournament_id = $1", [id]);
                await client.query("DELETE FROM rounds WHERE tournament_id = $1", [id]);
                await client.query("DELETE FROM participants WHERE tournament_id = $1", [id]);
                
                await client.query("UPDATE tournaments SET status = 'completed' WHERE id = $1", [id]);
                await client.query('COMMIT');
                res.json({ message: "Tournament data cleared" });
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } else if (action === 'pause') {
            await pool.query("UPDATE tournaments SET status = 'paused' WHERE id = $1", [id]);
            res.json({ message: "Tournament paused" });
        } else if (action === 'resume') {
            await pool.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [id]);
            res.json({ message: "Tournament resumed" });
        } else if (action === 'create') {
            const { title, description, registration_start, registration_end, capacity, entry_fee } = req.body;
            
            // Validate
            if (!title) return res.status(400).json({ error: "Title is required" });
            
            // Calculate prize pool (Now fixed at 90,000 NGN)
            const fee = parseFloat(entry_fee) || 0;
            const cap = parseInt(capacity) || 0;
            const prize_pool = 90000;

            const newTourney = await pool.query(
                `INSERT INTO tournaments 
                (title, description, status, registration_start, registration_end, capacity, entry_fee, prize_pool) 
                VALUES ($1, $2, 'open', $3, $4, $5, $6, $7) 
                RETURNING *`,
                [title, description, registration_start, registration_end, cap, fee, prize_pool]
            );
            
            res.json({ message: "Tournament created successfully", tournament: newTourney.rows[0] });

        } else if (action === 'extend') {
            const { registration_end } = req.body;
            if (!registration_end) return res.status(400).json({ error: "New end time required" });

            const updated = await pool.query(
                "UPDATE tournaments SET registration_end = $1 WHERE id = $2 RETURNING *",
                [registration_end, id]
            );
            res.json({ message: "Registration extended", tournament: updated.rows[0] });

        } else if (action === 'save_schedule') {
             const { rounds_config } = req.body;
             
             if (!rounds_config || !rounds_config.rounds) return res.status(400).json({ error: "Invalid rounds config" });

             const client = await pool.connect();
             try {
                 await client.query('BEGIN');

                 // 1. Clear existing schedule for this tournament (to allow re-scheduling)
                 await client.query("DELETE FROM rounds WHERE tournament_id = $1", [id]);

                 // 2. Insert new rounds
                 for (let i = 0; i < rounds_config.rounds.length; i++) {
                     const r = rounds_config.rounds[i];
                     await client.query(
                         "INSERT INTO rounds (tournament_id, round_number, name, matches, players, date) VALUES ($1, $2, $3, $4, $5, $6)",
                         [id, i + 1, r.name, r.matches, r.players, r.date]
                     );
                 }

                 // 3. Update tournament status and meta (using JSON for meta if needed, or just status)
                 // We can keep rounds_config for type/desc or just use rounds table. 
                 // User requested "tournament config only" in tournament table. 
                 // Let's store the full config in JSON for backup/meta (type/desc) BUT use rounds table for dates.
                 // Actually, if we use rounds table, we should rely on it for dates.
                 
                 // 3. Update tournament status if needed (ignoring rounds_config column as it matches schema change)
                 // User removed rounds_config column, so we rely solely on rounds table.

                 // 3. Update tournament status to active
                 await client.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [id]);

                 await client.query('COMMIT');
                 
                 // Allow returning the updated tournament with rounds?
                 // For now, just return success.
                 res.json({ message: "Schedule saved successfully" });

             } catch (e) {
                 await client.query('ROLLBACK');
                 console.error("SAVE SCHEDULE ERROR:", e);
                 // Return explicit error
                 res.status(500).json({ error: "Save Error: " + e.message });
                 // Prevent falling through to outer catch if we respond here
                 return; 
             } finally {
                 client.release();
             }

        } else if (action === 'generate_fixtures') {
            const { round_number } = req.body;
            if (!round_number) return res.status(400).json({ error: "round_number is required" });

            try {
                const result = await generateFixturesForRound(id, round_number);
                const msg = `Created ${result.scheduled} matches` + (result.byes ? ` and ${result.byes} BYEs` : '') + ` for Round ${round_number}`;
                res.json({ message: msg, matches_created: result.scheduled, byes_created: result.byes });
            } catch (genErr) {
                console.error('Generate fixtures error:', genErr);
                res.status(400).json({ error: genErr.message || "Failed to generate fixtures" });
            }

        } else {
             console.log('Invalid action received:', action, req.body);
             res.status(400).json({ 
                error: `Invalid action: ${action}. Body keys: ${Object.keys(req.body).join(', ')}` 
             });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/tournaments/cycle", async (req, res) => {
    // Proceed to next tournament
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Identify the latest tournament to clean up
        const latestTourneyRes = await client.query("SELECT id, status FROM tournaments ORDER BY created_at DESC LIMIT 1");
        
        if (latestTourneyRes.rows.length > 0) {
            const latestId = latestTourneyRes.rows[0].id;
            
            // Mark as completed if not already
            if (latestTourneyRes.rows[0].status !== 'completed') {
                await client.query("UPDATE tournaments SET status = 'completed' WHERE id = $1", [latestId]);
            }

            // Delete disputes for this tournament
            await client.query(
                "DELETE FROM disputes WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)",
                [latestId]
            );

            // Delete matches for this tournament
            await client.query("DELETE FROM matches WHERE tournament_id = $1", [latestId]);
        }

        // 2. Create New Tournament
        // Get count to name it
        const countRes = await client.query("SELECT COUNT(*) FROM tournaments");
        const nextNum = parseInt(countRes.rows[0].count) + 1;
        
        const newTourney = await client.query(
            "INSERT INTO tournaments (title, status) VALUES ($1, 'open') RETURNING *",
            [`Tournament #${nextNum}`]
        );

        await client.query('COMMIT');
        res.json({ message: "Cycled to next tournament", tournament: newTourney.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Server error" });
    } finally {
        client.release();
    }
});

router.get("/rounds/current", async (req, res) => {
    try {
        const tResult = await pool.query("SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (tResult.rows.length === 0) return res.json([]);
        
        const tournamentId = tResult.rows[0].id;
        const roundsRes = await pool.query(
            "SELECT * FROM rounds WHERE tournament_id = $1 ORDER BY round_number ASC", 
            [tournamentId]
        );
        res.json(roundsRes.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === MATCHES & DISPUTES ===
router.get("/matches", async (req, res) => {
    try {
        const { round, page = 1, limit = 15 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Get the current tournament ID first
        const tResult = await pool.query("SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1");
        const tournamentId = tResult.rows[0]?.id;

        if (!tournamentId) {
            return res.json({ matches: [], total: 0, page: 1, limit: 15 });
        }

        let query = `
            SELECT m.*, p1.username as p1_name, p2.username as p2_name 
            FROM matches m
            LEFT JOIN users p1 ON m.player1_id = p1.id
            LEFT JOIN users p2 ON m.player2_id = p2.id
            WHERE m.tournament_id = $1
        `;
        let countQuery = `SELECT COUNT(*) FROM matches m WHERE m.tournament_id = $1`;
        let params = [tournamentId];

        if (round) {
            query += ` AND m.round = $2`;
            countQuery += ` AND m.round = $2`;
            params.push(round);
        }

        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        query += ` ORDER BY m.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);
        
        res.json({
            matches: result.rows,
            total,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/matches/:id/override", async (req, res) => {
    try {
        const { id } = req.params;
        const { winner_id, score_p1, score_p2 } = req.body;
        
        const update = await pool.query(
            "UPDATE matches SET winner_id = $1, score_player1 = $2, score_player2 = $3, status = 'completed' WHERE id = $4 RETURNING *",
            [winner_id, score_p1, score_p2, id]
        );
        await checkIfTournamentFinished(id);
        res.json(update.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/matches/:id/rematch", async (req, res) => {
    try {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const updateRes = await client.query(
                `UPDATE matches SET 
                    status = 'scheduled', 
                    winner_id = NULL, 
                    score_player1 = 0, score_player2 = 0, 
                    p1_score = NULL, p2_score = NULL, 
                    p1_opp_score = NULL, p2_opp_score = NULL,
                    match_code = NULL,
                    checked_in_at = NULL,
                    p1_checked_in = false,
                    p2_checked_in = false
                 WHERE id = $1 RETURNING tournament_id`,
                [id]
            );
            
            if (updateRes.rows.length > 0) {
                // If tournament was paused due to no winner, reactivate it!
                await client.query(
                    "UPDATE tournaments SET status = 'active' WHERE id = $1 AND status = 'paused'",
                    [updateRes.rows[0].tournament_id]
                );
            }
            await client.query('COMMIT');
            res.json({ message: "Rematch initiated" });
        } catch(e) {
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

router.get("/disputes", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, m.match_code, u.username as submitted_by_name
            FROM disputes d
            JOIN matches m ON d.match_id = m.id
            JOIN users u ON d.submitted_by = u.id
            ORDER BY d.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/disputes/:id/resolve", async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve', 'reject', 'rematch'
        
        if (action === 'reject') {
            await pool.query("UPDATE disputes SET status = 'rejected' WHERE id = $1", [id]);
        } else if (action === 'approve') {
            await pool.query("UPDATE disputes SET status = 'resolved' WHERE id = $1", [id]);
            // Additional logic: update match winner?
        } else if (action === 'rematch') {
            await pool.query("UPDATE disputes SET status = 'resolved' WHERE id = $1", [id]);
            // Logic to reset match
            // await pool.query("UPDATE matches SET status = 'scheduled', score_player1 = 0, ... WHERE id = ...")
        }
        
        res.json({ message: "Dispute updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === PAYMENTS & ANNOUNCEMENTS ===
router.get("/payments", async (req, res) => {
    try {
        const { page = 1, limit = 15, tournament_id, status, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let whereClauses = [];
        let params = [];
        let pIdx = 1;

        if (tournament_id) {
            whereClauses.push(`p.tournament_id = $${pIdx++}`);
            params.push(tournament_id);
        }
        if (status) {
            whereClauses.push(`p.status = $${pIdx++}`);
            params.push(status);
        }
        if (search) {
            whereClauses.push(`(u.username ILIKE $${pIdx} OR p.reference ILIKE $${pIdx} OR p.flw_transaction_id ILIKE $${pIdx})`);
            params.push(`%${search}%`);
            pIdx++;
        }

        const whereString = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

        // 1. Get total count and filtered analytics
        const summaryRes = await pool.query(`
            SELECT 
                COUNT(p.*)::int as total_count,
                COUNT(p.*) FILTER (WHERE p.status = 'completed')::int as completed_count,
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::float as total_collected
            FROM payments p
            JOIN users u ON p.user_id = u.id
            ${whereString}
        `, params);
        const summary = summaryRes.rows[0];

        // 2. Fetch paginated payments
        const listParams = [...params, parseInt(limit), offset];
        const listResult = await pool.query(`
            SELECT p.*, u.username, u.email 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            ${whereString}
            ORDER BY p.created_at DESC
            LIMIT $${pIdx++} OFFSET $${pIdx++}
        `, listParams);

        res.json({
            payments: listResult.rows,
            total: summary.total_count,
            page: parseInt(page),
            limit: parseInt(limit),
            summary: {
                totalCollected: summary.total_collected,
                completedCount: summary.completed_count,
                totalCount: summary.total_count
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/announcements", async (req, res) => {
    try {
        const { message, target } = req.body; // target: 'all', 'round'
        // Logic to send announcement (e.g. create notification records)
        // For MVP, just log it.
        console.log(`Announcement to ${target}: ${message}`);
        res.json({ message: "Announcement sent" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// === FIXTURE GENERATION HELPER ===

// Session time slot definitions (30-min intervals within each session window)
const SESSION_TIME_SLOTS = {
    morning:   ['10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'],
    afternoon: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'],
    evening:   ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
};

// Get next power of 2 >= n
function nextPowerOf2(n) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

// Fisher-Yates shuffle
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function generateFixturesForRound(tournamentId, roundNumber) {
    roundNumber = Number(roundNumber); // Ensure numeric comparison
    console.log(`[FIXTURES] Starting generation for tournament ${tournamentId}, round ${roundNumber} (type: ${typeof roundNumber})`);
    
    // 1. Pre-checks (no transaction needed)
    const roundRes = await pool.query(
        "SELECT * FROM rounds WHERE tournament_id = $1 AND round_number = $2",
        [tournamentId, roundNumber]
    );
    if (roundRes.rows.length === 0) throw new Error(`Round ${roundNumber} not found`);
    if (roundRes.rows[0].fixtures_generated) throw new Error(`Fixtures already generated for Round ${roundNumber}`);

    // 2. Lock the round immediately to prevent double-generation
    await pool.query(
        "UPDATE rounds SET fixtures_generated = true WHERE tournament_id = $1 AND round_number = $2",
        [tournamentId, roundNumber]
    );

    try {
        // 3. Build all match data in memory
        const byeMatchPlayerIds = [];
        const schedMatchData = [];  // { p1Id, p2Id, matchCode, matchTime }

        if (roundNumber === 1) {
            console.log(`[FIXTURES] >>> Entering ROUND 1 branch (power-of-2 BYEs)`);
            // ═══ ROUND 1: Power-of-2 BYEs + Session-Based Matching ═══
            const pRes = await pool.query(
                `SELECT p.user_id as id, p.session_preference, p.joined_at 
                 FROM participants p 
                 WHERE p.tournament_id = $1 AND p.status = 'approved' 
                 ORDER BY p.joined_at ASC`,
                [tournamentId]
            );
            const allPlayers = pRes.rows;
            if (allPlayers.length < 2) throw new Error("Not enough players to generate fixtures");

            const totalPlayers = allPlayers.length;
            const nextPow2 = nextPowerOf2(totalPlayers);
            const byeCount = nextPow2 - totalPlayers;

            console.log(`[FIXTURES R1] Total: ${totalPlayers}, Next POW2: ${nextPow2}, BYEs: ${byeCount}, Playing: ${totalPlayers - byeCount}`);

            // Early joiners get BYEs
            for (let i = 0; i < byeCount; i++) byeMatchPlayerIds.push(allPlayers[i].id);
            const playingPlayers = allPlayers.slice(byeCount);

            // Group by session
            const sessionGroups = { morning: [], afternoon: [], evening: [] };
            for (const player of playingPlayers) {
                const s = player.session_preference || 'morning';
                (sessionGroups[s] || sessionGroups.morning).push(player);
            }
            console.log(`[FIXTURES R1] Sessions — morning: ${sessionGroups.morning.length}, afternoon: ${sessionGroups.afternoon.length}, evening: ${sessionGroups.evening.length}`);

            // Pair within sessions
            const leftoverPlayers = [];
            const rawMatches = [];
            for (const session of ['morning', 'afternoon', 'evening']) {
                const group = shuffle(sessionGroups[session]);
                for (let i = 0; i < group.length - 1; i += 2) {
                    rawMatches.push({ p1: group[i], p2: group[i + 1], session });
                }
                if (group.length % 2 !== 0) leftoverPlayers.push(group[group.length - 1]);
            }

            // Cross-session leftovers
            shuffle(leftoverPlayers);
            for (let i = 0; i < leftoverPlayers.length - 1; i += 2) {
                rawMatches.push({ p1: leftoverPlayers[i], p2: leftoverPlayers[i + 1], session: leftoverPlayers[i].session_preference || 'morning' });
            }
            if (leftoverPlayers.length % 2 !== 0) {
                byeMatchPlayerIds.push(leftoverPlayers[leftoverPlayers.length - 1].id);
            }

            // Assign staggered times
            const counters = { morning: 0, afternoon: 0, evening: 0 };
            for (const m of rawMatches) {
                const slots = SESSION_TIME_SLOTS[m.session] || SESSION_TIME_SLOTS.morning;
                const matchTime = slots[counters[m.session] % slots.length];
                counters[m.session]++;
                schedMatchData.push({ p1Id: m.p1.id, p2Id: m.p2.id, matchCode: Math.random().toString(36).substring(2, 8).toUpperCase(), matchTime });
            }

        } else {
            // ═══ ROUND 2+: Winners from previous round ═══
            const winnersRes = await pool.query(
                `SELECT m.winner_id as id, COALESCE(p.session_preference, 'morning') as session_preference
                 FROM matches m
                 LEFT JOIN participants p ON m.winner_id = p.user_id AND p.tournament_id = $1
                 WHERE m.tournament_id = $1 AND m.round = $2 AND m.winner_id IS NOT NULL`,
                [tournamentId, roundNumber - 1]
            );
            const allPlayers = winnersRes.rows;
            if (allPlayers.length === 0) throw new Error(`No winners found from Round ${roundNumber - 1}`);
            if (allPlayers.length < 2) throw new Error("Not enough players");

            const sessionGroups = { morning: [], afternoon: [], evening: [] };
            for (const p of allPlayers) (sessionGroups[p.session_preference] || sessionGroups.morning).push(p);

            const leftoverPlayers = [];
            const rawMatches = [];
            for (const session of ['morning', 'afternoon', 'evening']) {
                const group = shuffle(sessionGroups[session]);
                for (let i = 0; i < group.length - 1; i += 2) rawMatches.push({ p1: group[i], p2: group[i + 1], session });
                if (group.length % 2 !== 0) leftoverPlayers.push(group[group.length - 1]);
            }
            shuffle(leftoverPlayers);
            for (let i = 0; i < leftoverPlayers.length - 1; i += 2) {
                rawMatches.push({ p1: leftoverPlayers[i], p2: leftoverPlayers[i + 1], session: leftoverPlayers[i].session_preference || 'morning' });
            }
            if (leftoverPlayers.length % 2 !== 0) byeMatchPlayerIds.push(leftoverPlayers[leftoverPlayers.length - 1].id);

            const counters = { morning: 0, afternoon: 0, evening: 0 };
            for (const m of rawMatches) {
                const slots = SESSION_TIME_SLOTS[m.session] || SESSION_TIME_SLOTS.morning;
                const matchTime = slots[counters[m.session] % slots.length];
                counters[m.session]++;
                schedMatchData.push({ p1Id: m.p1.id, p2Id: m.p2.id, matchCode: Math.random().toString(36).substring(2, 8).toUpperCase(), matchTime });
            }
        }

        // 4. BULK INSERT — no wrapping transaction, just batch queries
        let matchesCreated = 0;
        const BATCH = 200;

        // Insert BYEs
        for (let b = 0; b < byeMatchPlayerIds.length; b += BATCH) {
            const batch = byeMatchPlayerIds.slice(b, b + BATCH);
            const values = []; const params = []; let idx = 1;
            for (const pid of batch) {
                values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+2}, 'completed', 'BYE', NULL)`);
                params.push(tournamentId, roundNumber, pid);
                idx += 3;
            }
            await pool.query(`INSERT INTO matches (tournament_id, round, player1_id, winner_id, status, match_code, match_time) VALUES ${values.join(', ')}`, params);
            matchesCreated += batch.length;
        }
        console.log(`[FIXTURES] ${byeMatchPlayerIds.length} BYEs inserted`);

        // Insert scheduled matches
        for (let b = 0; b < schedMatchData.length; b += BATCH) {
            const batch = schedMatchData.slice(b, b + BATCH);
            const values = []; const params = []; let idx = 1;
            for (const m of batch) {
                values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, 'scheduled', $${idx+4}, $${idx+5})`);
                params.push(tournamentId, roundNumber, m.p1Id, m.p2Id, m.matchCode, m.matchTime);
                idx += 6;
            }
            await pool.query(`INSERT INTO matches (tournament_id, round, player1_id, player2_id, status, match_code, match_time) VALUES ${values.join(', ')}`, params);
            matchesCreated += batch.length;
        }
        console.log(`[FIXTURES] ${schedMatchData.length} scheduled matches inserted`);
        console.log(`[FIXTURES] Total: ${matchesCreated} matches for tournament ${tournamentId}, round ${roundNumber}`);
        return {
            total: matchesCreated,
            byes: byeMatchPlayerIds.length,
            scheduled: schedMatchData.length
        };

    } catch (e) {
        // Rollback: unlock the round and clean up any partial inserts
        console.error(`[FIXTURES] Error, rolling back:`, e.message);
        await pool.query("DELETE FROM matches WHERE tournament_id = $1 AND round = $2", [tournamentId, roundNumber]);
        await pool.query("UPDATE rounds SET fixtures_generated = false WHERE tournament_id = $1 AND round_number = $2", [tournamentId, roundNumber]);
        throw e;
    }
}

export default router;
