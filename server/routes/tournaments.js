import express from "express";
import { pool } from "../db.js";
import { authenticateToken, optionalAuthenticateToken, authorizeAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get Current/Latest Tournament & User Status
router.get("/current", optionalAuthenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (result.rows.length === 0) return res.json({ tournament: null });
        
        const tournament = result.rows[0];
        
        // Current Round
        let currentRound = 0;
        if (['active', 'paused', 'completed'].includes(tournament.status)) {
             const roundRes = await pool.query("SELECT MAX(round) FROM matches WHERE tournament_id = $1", [tournament.id]);
             currentRound = roundRes.rows[0].max || 1;
        }

        // Fetch rounds schedule from DB to reconstruct rounds_config for players
        const roundsQueryRes = await pool.query(
            "SELECT * FROM rounds WHERE tournament_id = $1 ORDER BY round_number ASC", 
            [tournament.id]
        );
        
        let rounds_config = null;
        if (roundsQueryRes.rows.length > 0) {
            rounds_config = {
                type: "Schedule",
                description: "Official Tournament Schedule",
                rounds: roundsQueryRes.rows.map(r => ({
                    ...r,
                    date: r.date ? (() => {
                        const d = new Date(r.date);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    })() : ''
                }))
            };
        }

        // Winner Info
        if (tournament.status === 'completed' && tournament.winner_id) {
            const winnerRes = await pool.query(
                `SELECT COALESCE(p.alias, u.email) as display_name 
                 FROM users u 
                 LEFT JOIN participants p ON u.id = p.user_id AND p.tournament_id = $2
                 WHERE u.id = $1`, 
                 [tournament.winner_id, tournament.id]
            );
            if (winnerRes.rows.length > 0) {
                tournament.winner_display_name = winnerRes.rows[0].display_name;
            }
        }

        // Check participation (Only if logged in)
        let partResult = { rows: [] };
        let currentMatch = null;
        let projectedBye = false;

        if (req.user) {
            partResult = await pool.query(
                "SELECT * FROM participants WHERE tournament_id = $1 AND user_id = $2",
                [tournament.id, req.user.id]
            );
            
            if (partResult.rows.length > 0) {
                 // We look for the user's match in the current round so they can see BYEs or completed matches.
                 const matchRes = await pool.query(
                    `SELECT m.*, 
                            COALESCE(op_part.alias, op.email) as opponent_name, 
                            op.id as opponent_id
                     FROM matches m
                     LEFT JOIN users op ON (CASE WHEN m.player1_id = $2 THEN m.player2_id ELSE m.player1_id END) = op.id
                     LEFT JOIN participants op_part ON op.id = op_part.user_id AND op_part.tournament_id = m.tournament_id
                     WHERE m.tournament_id = $1 
                     AND (m.player1_id = $2 OR m.player2_id = $2)
                     AND m.round = $3
                     ORDER BY m.id DESC LIMIT 1`,
                    [tournament.id, req.user.id, currentRound]
                 );
                 if (matchRes.rows.length > 0) {
                     currentMatch = matchRes.rows[0];
                 }
                 
                 // If we're in scheduled mode or active round 1 (and no match generated yet), project BYE status
                 if (tournament.status === 'scheduled' || (tournament.status === 'active' && currentRound === 1)) {
                     const allParts = await pool.query(
                         `SELECT user_id FROM participants 
                          WHERE tournament_id = $1 AND status = 'in' 
                          ORDER BY joined_at ASC`,
                         [tournament.id]
                     );
                     
                     const totalPlayers = allParts.rows.length;
                     if (totalPlayers > 1) {
                         let nextPow2 = 1;
                         while (nextPow2 < totalPlayers) nextPow2 *= 2;
                         const byeCount = nextPow2 - totalPlayers;
                         
                         const userRank = allParts.rows.findIndex(p => p.user_id === req.user.id);
                         if (userRank !== -1 && userRank < byeCount) {
                             projectedBye = true;
                         }
                     }
                 }
            }
        }

        res.json({
            tournament: { ...tournament, rounds_config, currentRound },
            participation: (req.user && partResult.rows.length > 0) ? { ...partResult.rows[0], projectedBye } : null,
            currentMatch
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get all tournaments (Public)
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Create Tournament (Admin)
router.post("/", authenticateToken, authorizeAdmin, async (req, res) => {
    console.log('API: Creating new tournament...');
    const { title, description, registration_start, registration_end, capacity, entry_fee } = req.body;
    
    // Validate
    if (!title) return res.status(400).json({ error: "Title is required" });
    if (!registration_start || !registration_end) return res.status(400).json({ error: "Start and End dates are required" });

    try {
        const fee = parseFloat(entry_fee) || 0;
        const cap = parseInt(capacity) || 0;

        const result = await pool.query(
            `INSERT INTO tournaments 
            (title, status, registration_start, registration_end, capacity, entry_fee, created_at) 
            VALUES ($1, 'open', $2, $3, $4, $5, NOW()) 
            RETURNING *`,
            [title, registration_start, registration_end, cap, fee]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({ error: "Server error: " + error.message });
    }
});

// Join Tournament (Player)
router.post("/:id/join", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { session_preference, alias } = req.body;
    console.log(`[DEBUG] Join request received for tournament ID: ${id} from user ${req.user.id}, session: ${session_preference}, alias: ${alias}`);
    try {
        // Validate alias
        if (!alias || !alias.trim()) {
            return res.status(400).json({ error: "Alias is required to join a tournament" });
        }
        if (!/^[a-zA-Z0-9]+$/.test(alias.trim())) {
            return res.status(400).json({ error: "Alias must be alphanumeric. No spaces or special characters allowed." });
        }
        if (alias.trim().length < 3 || alias.trim().length > 20) {
            return res.status(400).json({ error: "Alias must be between 3 and 20 characters." });
        }

        // Check if tournament is open
        const tournamentCheck = await pool.query("SELECT * FROM tournaments WHERE id = $1", [id]);
        if (tournamentCheck.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
        
        const tournament = tournamentCheck.rows[0];
        if (tournament.status !== 'open') return res.status(400).json({ error: "Tournament is not open for registration" });

        const now = new Date();
        if (tournament.registration_start && now < new Date(tournament.registration_start)) {
            return res.status(400).json({ error: "Registration has not started yet" });
        }
        if (tournament.registration_end && now > new Date(tournament.registration_end)) {
            return res.status(400).json({ error: "Registration has closed" });
        }

        // Check capacity
        if (tournament.capacity) {
            const countRes = await pool.query("SELECT COUNT(*) FROM participants WHERE tournament_id = $1", [id]);
            const currentCount = parseInt(countRes.rows[0].count);
            if (currentCount >= tournament.capacity) {
                return res.status(400).json({ error: "Tournament is full" });
            }
        }

        // Check global alias uniqueness: Ensure no other user is using this alias
        const aliasCheck = await pool.query(
            "SELECT id FROM participants WHERE LOWER(alias) = LOWER($1) AND user_id != $2",
            [alias.trim(), req.user.id]
        );
        if (aliasCheck.rows.length > 0) {
            return res.status(400).json({ error: "This alias is already used by another player. Please choose a different one." });
        }

        // Add to participants with alias
        await pool.query(
            "INSERT INTO participants (tournament_id, user_id, status, session_preference, alias) VALUES ($1, $2, 'in', $3, $4)",
            [id, req.user.id, session_preference || null, alias.trim()]
        );

        // Increment permanent tournament count in users table and set status to active
        await pool.query(
            "UPDATE users SET tournament_joined = tournament_joined + 1, status = 'active' WHERE id = $1 AND status != 'banned'",
            [req.user.id]
        );

        res.status(201).json({ message: "Join request sent" });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Already joined this tournament" });
        }
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get participants (Admin or Public?) -> Let's make it public for now so players see who's in
router.get("/:id/participants", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT p.*, COALESCE(p.alias, u.email) AS username 
             FROM participants p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.tournament_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Approve/Reject Participant (Admin)
router.put("/:id/participants/:userId", authenticateToken, authorizeAdmin, async (req, res) => {
    const { id, userId } = req.params;
    const { status } = req.body; // 'in' or 'out'

    if (!['in', 'out'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Use 'in' or 'out'." });
    }

    try {
        const result = await pool.query(
            "UPDATE participants SET status = $1 WHERE tournament_id = $2 AND user_id = $3 RETURNING *",
            [status, id, userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Participant not found" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


// The tournament start logic has been moved to the admin control endpoint. 
// Do not use this legacy endpoint.

// Update Tournament Schedule (Admin)
router.put("/:id/schedule", authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { rounds_config } = req.body;

    try {
        // Ensure column exists (Lazy migration)
        await pool.query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rounds_config JSONB;");

        const result = await pool.query(
            "UPDATE tournaments SET rounds_config = $1, status = 'scheduled' WHERE id = $2 RETURNING *",
            [rounds_config, id]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Tournament not found" });
        
        res.json({ message: "Schedule updated", tournament: result.rows[0] });
    } catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
