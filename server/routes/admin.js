import express from "express";
import { pool } from "../db.js";
import { authenticateToken, authorizeAdmin } from "../middleware/auth.js";

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

            // Matches in current round
            const mRes = await pool.query("SELECT COUNT(*) FROM matches WHERE tournament_id = $1 AND round = $2", [tournament.id, currentRound]);
            currentRoundMatchCount = parseInt(mRes.rows[0].count);
        }

        // System stats (optional, but let's keep alerts/prize pool)
        const pendingDisputes = await pool.query("SELECT COUNT(*) FROM disputes WHERE status = 'pending'");
        const prizePoolQuery = await pool.query("SELECT SUM(amount) FROM payments WHERE status = 'completed'");
        const prizePool = parseInt(prizePoolQuery.rows[0].sum) || 0;
        
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
            if (tournament.status === 'active') {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                for (const round of roundsRes.rows) {
                    const roundDateStr = round.date ? (() => {
                        const d = new Date(round.date);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })() : null;
                    
                    if (roundDateStr && roundDateStr <= todayStr && !round.fixtures_generated) {
                        console.log(`[AUTO-TRIGGER] Generating fixtures for round ${round.round_number}`);
                        try {
                            await generateFixturesForRound(tournament.id, round.round_number);
                        } catch (autoErr) {
                            console.error(`[AUTO-TRIGGER] Failed for round ${round.round_number}:`, autoErr.message);
                        }
                    }
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
                    // CASE B: No matches (Manual start?). Generate from Participants.
                    
                    // Fetch registered participants
                    const pRes = await client.query("SELECT user_id as id FROM participants WHERE tournament_id = $1 AND status = 'approved'", [id]);
                    const players = pRes.rows;
                    
                    if (players.length < 2) throw new Error("Not enough participants to start");

                    // Shuffle
                    for (let i = players.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [players[i], players[j]] = [players[j], players[i]];
                    }

                    // Create Matches
                    for (let i = 0; i < players.length; i += 2) {
                        const p1 = players[i];
                        const p2 = players[i+1];
                        
                        if (p2) {
                             const matchCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                             await client.query(
                                "INSERT INTO matches (tournament_id, round, player1_id, player2_id, status, match_code) VALUES ($1, 1, $2, $3, 'scheduled', $4)",
                                [id, p1.id, p2.id, matchCode]
                            );
                        } else {
                            // Bye for odd player
                            await client.query(
                                "INSERT INTO matches (tournament_id, round, player1_id, winner_id, status, match_code) VALUES ($1, 1, $2, $2, 'completed', 'BYE')",
                                [id, p1.id]
                            );
                        }
                    }

                    await client.query("UPDATE tournaments SET status = 'active' WHERE id = $1", [id]);
                    res.json({ message: "Tournament started and matches generated", participants: players.length });
                }

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(e);
                res.status(400).json({ error: e.message || "Server error" });
            } finally {
                client.release();
            }

        } else if (action === 'end') {
            // Find the winner of the last round (highest round)
            // Assuming single elimination, the winner of the only match in the highest round is the tournament winner
            // Or just check for the match with the highest round and get its winner
            const lastMatchRes = await pool.query(
                "SELECT winner_id FROM matches WHERE tournament_id = $1 AND status = 'completed' ORDER BY round DESC LIMIT 1",
                [id]
            );
            
            let winnerId = null;
            if (lastMatchRes.rows.length > 0) {
                winnerId = lastMatchRes.rows[0].winner_id;
            }

            await pool.query(
                "UPDATE tournaments SET status = 'completed', winner_id = $2 WHERE id = $1", 
                [id, winnerId]
            );
            res.json({ message: "Tournament ended", winnerId });
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
            
            // Calculate prize pool
            const fee = parseFloat(entry_fee) || 0;
            const cap = parseInt(capacity) || 0;
            const prize_pool = fee * cap;

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
                const count = await generateFixturesForRound(id, round_number);
                res.json({ message: `Fixtures generated for Round ${round_number}`, matches_created: count });
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

// === MATCHES & DISPUTES ===
router.get("/matches", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, p1.username as p1_name, p2.username as p2_name 
            FROM matches m
            LEFT JOIN users p1 ON m.player1_id = p1.id
            LEFT JOIN users p2 ON m.player2_id = p2.id
            ORDER BY m.id DESC
        `);
        res.json(result.rows);
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
        res.json(update.rows[0]);
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
        // Mocking payments from bank_details users if no payments table
        const result = await pool.query(`
            SELECT p.*, u.username, u.email 
            FROM payments p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows); 
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
async function generateFixturesForRound(tournamentId, roundNumber) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check round exists and hasn't been generated yet
        const roundRes = await client.query(
            "SELECT * FROM rounds WHERE tournament_id = $1 AND round_number = $2",
            [tournamentId, roundNumber]
        );
        if (roundRes.rows.length === 0) throw new Error(`Round ${roundNumber} not found`);
        if (roundRes.rows[0].fixtures_generated) throw new Error(`Fixtures already generated for Round ${roundNumber}`);

        let players = [];

        if (roundNumber === 1) {
            // Round 1: All approved participants
            const pRes = await client.query(
                "SELECT user_id as id FROM participants WHERE tournament_id = $1 AND status = 'approved'",
                [tournamentId]
            );
            players = pRes.rows;
        } else {
            // Round 2+: Winners from previous round
            const prevRound = roundNumber - 1;
            const winnersRes = await client.query(
                "SELECT winner_id as id FROM matches WHERE tournament_id = $1 AND round = $2 AND winner_id IS NOT NULL",
                [tournamentId, prevRound]
            );
            players = winnersRes.rows;

            if (players.length === 0) {
                throw new Error(`No winners found from Round ${prevRound}. Ensure all matches are completed first.`);
            }
        }

        if (players.length < 2) throw new Error("Not enough players to generate fixtures");

        // Shuffle players
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        // Create matches
        let matchesCreated = 0;
        for (let i = 0; i < players.length; i += 2) {
            const p1 = players[i];
            const p2 = players[i + 1];

            if (p2) {
                const matchCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                await client.query(
                    "INSERT INTO matches (tournament_id, round, player1_id, player2_id, status, match_code) VALUES ($1, $2, $3, $4, 'scheduled', $5)",
                    [tournamentId, roundNumber, p1.id, p2.id, matchCode]
                );
                matchesCreated++;
            } else {
                // BYE for odd player
                await client.query(
                    "INSERT INTO matches (tournament_id, round, player1_id, winner_id, status, match_code) VALUES ($1, $2, $3, $3, 'completed', 'BYE')",
                    [tournamentId, roundNumber, p1.id]
                );
                matchesCreated++;
            }
        }

        // Mark round as fixtures generated
        await client.query(
            "UPDATE rounds SET fixtures_generated = true WHERE tournament_id = $1 AND round_number = $2",
            [tournamentId, roundNumber]
        );

        await client.query('COMMIT');
        console.log(`[FIXTURES] Generated ${matchesCreated} matches for tournament ${tournamentId}, round ${roundNumber}`);
        return matchesCreated;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export default router;
