import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const TOTAL_PLAYERS = 13; // Example: 13 players -> Next Power 16. Bye: 3 (16-13). Matches: 5 (10 players).
// Byes = 16 - 13 = 3.
// Players = 3 (Bye) + 10 (Play). Matches = 5.
// Result: 3 byes, 5 matches. Total next round = 3 + 5 = 8. (Correct).

async function seed() {
    try {
        console.log("Seeding players...");
        const passwordHash = await bcrypt.hash("password", 10);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            
            await client.query("DELETE FROM disputes");
            await client.query("DELETE FROM matches");
            await client.query("DELETE FROM participants");
            await client.query("DELETE FROM referrals");
            await client.query("DELETE FROM bank_details");
            await client.query("DELETE FROM payments");
            await client.query("DELETE FROM payouts");
            await client.query("DELETE FROM users WHERE role = 'player' OR role = 'admin'");
            // Also need to clear referrals etc if constraints exist, but cascading might handle it if set.
            // Schema says ON DELETE CASCADE for most.
             
            for (let i = 1; i <= TOTAL_PLAYERS; i++) {
                const username = `player${i}`;
                const email = `player${i}@test.com`;
                const created_at = new Date(Date.now() + i * 1000); // Simulate registration order with 1s delay
                
                await client.query(
                    "INSERT INTO users (username, email, password_hash, role, created_at) VALUES ($1, $2, $3, 'player', $4)",
                    [username, email, passwordHash, created_at]
                );
            }
            
            // Add Admin
            await client.query(
                "INSERT INTO users (username, email, password_hash, role, created_at) VALUES ('admin', 'admin@test.com', $1, 'admin', NOW())",
                [passwordHash]
            );

            // Ensure a tournament exists
            await client.query("DELETE FROM tournaments");
            await client.query("INSERT INTO tournaments (title, status) VALUES ('Test Tournament', 'open')");

            await client.query('COMMIT');
            
            const checkAdmin = await client.query("SELECT * FROM users WHERE email = 'admin@test.com'");
            console.log("Admin exists:", checkAdmin.rows.length > 0 ? "YES" : "NO");
            
            console.log(`Seeded ${TOTAL_PLAYERS} players.`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

seed();
