import { pool } from "../db.js";
import { tryAutoMatch } from "../utils/matchmaking.js";
import dotenv from "dotenv";
dotenv.config();

async function verify() {
    try {
        console.log("--- VERIFYING AUTO-MATCHMAKING ---");
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. Create Test Tournament
            const tRes = await client.query("INSERT INTO tournaments (title, status) VALUES ('Test Cup', 'open') RETURNING id");
            const tId = tRes.rows[0].id;
            console.log(`Created Tournament ID: ${tId}`);

            // 2. Add User 1 (Simulated)
            // We need real user IDs, let's just pick 4 random existing users or create dummy ones.
            // For safety, let's just use existing users 101, 102, 103, 104 if they exist, or create temp ones.
            // Create users one by one to see where it fails
            console.log("Creating User 1...");
            const r1 = await client.query("INSERT INTO users (username, email, password_hash, role, institution, whatsapp_number) VALUES ('p1_' || floor(random()*10000), 'p1_' || floor(random()*10000) || '@test.com', 'dummyhash', 'player', 'Test Inst', '1234567890') RETURNING id");
            const u1 = r1.rows[0].id;
            
            console.log("Creating User 2...");
            const r2 = await client.query("INSERT INTO users (username, email, password_hash, role, institution, whatsapp_number) VALUES ('p2_' || floor(random()*10000), 'p2_' || floor(random()*10000) || '@test.com', 'dummyhash', 'player', 'Test Inst', '1234567890') RETURNING id");
            const u2 = r2.rows[0].id;

            console.log("Creating User 3...");
            const r3 = await client.query("INSERT INTO users (username, email, password_hash, role, institution, whatsapp_number) VALUES ('p3_' || floor(random()*10000), 'p3_' || floor(random()*10000) || '@test.com', 'dummyhash', 'player', 'Test Inst', '1234567890') RETURNING id");
            const u3 = r3.rows[0].id;

            console.log("Creating User 4...");
            const r4 = await client.query("INSERT INTO users (username, email, password_hash, role, institution, whatsapp_number) VALUES ('p4_' || floor(random()*10000), 'p4_' || floor(random()*10000) || '@test.com', 'dummyhash', 'player', 'Test Inst', '1234567890') RETURNING id");
            const u4 = r4.rows[0].id;

            console.log(`Users: ${u1}, ${u2}, ${u3}, ${u4}`);

            // 3. User 1 Joins
            await client.query("INSERT INTO participants (tournament_id, user_id) VALUES ($1, $2)", [tId, u1]);
            await tryAutoMatch(client, tId, u1);
            let matches = await client.query("SELECT * FROM matches WHERE tournament_id = $1", [tId]);
            console.log(`After U1: ${matches.rows.length} matches`); // Expect 0

            // 4. User 2 Joins
            await client.query("INSERT INTO participants (tournament_id, user_id) VALUES ($1, $2)", [tId, u2]);
            await tryAutoMatch(client, tId, u2);
            matches = await client.query("SELECT * FROM matches WHERE tournament_id = $1", [tId]);
            console.log(`After U2: ${matches.rows.length} matches`); // Expect 1

            // 5. User 3 Joins
            await client.query("INSERT INTO participants (tournament_id, user_id) VALUES ($1, $2)", [tId, u3]);
            await tryAutoMatch(client, tId, u3);
            matches = await client.query("SELECT * FROM matches WHERE tournament_id = $1", [tId]);
            console.log(`After U3: ${matches.rows.length} matches`); // Expect 1 (U3 waiting)

            // 6. User 4 Joins
            await client.query("INSERT INTO participants (tournament_id, user_id) VALUES ($1, $2)", [tId, u4]);
            await tryAutoMatch(client, tId, u4);
            matches = await client.query("SELECT * FROM matches WHERE tournament_id = $1", [tId]);
            console.log(`After U4: ${matches.rows.length} matches`); // Expect 2

            console.log("SUCCESS if counts are 0 -> 1 -> 1 -> 2");

            await client.query('ROLLBACK'); // Rollback so we don't mess up DB
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(e);
        } finally {
            client.release();
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
verify();
