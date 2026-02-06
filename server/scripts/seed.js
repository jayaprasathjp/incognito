import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seed = async () => {
    const client = await pool.connect();
    try {
        console.log("🌱 Seeding database with mock data...");

        // Ensure Schema
        // const schemaPath = path.join(__dirname, "../schema.sql");
        // const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        // await client.query(schemaSql);
        // console.log("✅ Schema applied.");

        await client.query('BEGIN');

        // 1. Create Users
        console.log("Creating users...");
        const passwordHash = await bcrypt.hash("password123", 10);
        
        // Define users
        const users = [
            { username: "admin", email: "admin@incognito.com", role: "admin", inst: "HQ" },
            { username: "PlayerOne", email: "p1@test.com", role: "player", inst: "CyberUnilag" },
            { username: "Striker99", email: "p2@test.com", role: "player", inst: "TechU" },
            { username: "GoalMachine", email: "p3@test.com", role: "player", inst: "VarsityFC" },
            { username: "NetBuster", email: "p4@test.com", role: "player", inst: "PolyTech" },
            { username: "MidfieldMaestro", email: "p5@test.com", role: "player", inst: "CyberUnilag" },
            { username: "DefenderX", email: "p6@test.com", role: "player", inst: "TechU" },
            { username: "KeeperZ", email: "p7@test.com", role: "player", inst: "VarsityFC" },
            { username: "WingerFast", email: "p8@test.com", role: "player", inst: "PolyTech" },
        ];

        for (const u of users) {
             // Check existence
            const check = await client.query("SELECT id FROM users WHERE email = $1", [u.email]);
            if (check.rows.length === 0) {
                 await client.query(
                    `INSERT INTO users (username, email, password_hash, role, institution, referral_code) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [u.username, u.email, passwordHash, u.role, u.inst, `REF-${u.username.toUpperCase()}`]
                );
            }
        }

        // 2. Create Tournament
        console.log("Creating tournament...");
        let tournamentId;
        const tournamentCheck = await client.query("SELECT id FROM tournaments WHERE title = 'Incognito Cup 2026'");
        
        if (tournamentCheck.rows.length === 0) {
            const adminIdRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            const adminId = adminIdRes.rows[0].id;
            
            const tRes = await client.query(
                `INSERT INTO tournaments (title, description, format, status, created_by) 
                 VALUES ($1, $2, 'single-elimination', 'active', $3) RETURNING id`,
                ['Incognito Cup 2026', 'The biggest inter-university FIFA tournament.', adminId]
            );
            tournamentId = tRes.rows[0].id;
        } else {
            tournamentId = tournamentCheck.rows[0].id;
        }

        // 3. Add Participants
        console.log("Adding participants...");
        const allPlayers = await client.query("SELECT id, username FROM users WHERE role = 'player'");
        
        for (const p of allPlayers.rows) {
             const pCheck = await client.query("SELECT * FROM participants WHERE tournament_id = $1 AND user_id = $2", [tournamentId, p.id]);
             if (pCheck.rows.length === 0) {
                 await client.query(
                     "INSERT INTO participants (tournament_id, user_id, status) VALUES ($1, $2, 'approved')",
                     [tournamentId, p.id]
                 );
             }
        }

        // 4. Create Matches & Scores (Round 1)
        console.log("Creating matches...");
        // This is a naive seeding for 8 players -> 4 matches.
        // Match 1: P1 vs P2 (Completed, P1 wins 3-1)
        // Match 2: P3 vs P4 (Completed, P4 wins 0-2)
        // Match 3: P5 vs P6 (In Progress/Scheduled)
        // Match 4: P7 vs P8 (Scheduled)

        // Clear existing matches to avoid duplicates or complexity for this mock run
        // await client.query("DELETE FROM matches WHERE tournament_id = $1", [tournamentId]);

        const players = allPlayers.rows;
        if (players.length >= 8) {
             // We'll just insert if empty to be safe
             const mCheck = await client.query("SELECT count(*) FROM matches WHERE tournament_id = $1", [tournamentId]);
             if (parseInt(mCheck.rows[0].count) === 0) {
                 // Match 1
                 await client.query(
                     `INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, score_player1, score_player2, winner_id, status)
                      VALUES ($1, 1, 1, $2, $3, 3, 1, $2, 'completed')`,
                     [tournamentId, players[0].id, players[1].id]
                 );

                 // Match 2
                 await client.query(
                     `INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, score_player1, score_player2, winner_id, status)
                      VALUES ($1, 1, 2, $2, $3, 0, 2, $3, 'completed')`,
                     [tournamentId, players[2].id, players[3].id]
                 );

                 // Match 3
                 await client.query(
                    `INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, status)
                     VALUES ($1, 1, 3, $2, $3, 'in_progress')`,
                    [tournamentId, players[4].id, players[5].id]
                );

                // Match 4
                await client.query(
                    `INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, status)
                     VALUES ($1, 1, 4, $2, $3, 'scheduled')`,
                    [tournamentId, players[6].id, players[7].id]
                );
             }
        }

        // 5. Create Referrals
        console.log("Creating referrals...");
        // PlayerOne referred Striker99
        await client.query(
            `INSERT INTO referrals (referrer_id, referred_user_id, status) 
             VALUES ($1, $2, 'completed') ON CONFLICT DO NOTHING`,
            [players[0].id, players[1].id]
        );

        await client.query('COMMIT');
        console.log("🎉 Seeding with mock data complete!");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Seeding failed:", error);
    } finally {
        client.release();
        pool.end();
    }
};

seed();
