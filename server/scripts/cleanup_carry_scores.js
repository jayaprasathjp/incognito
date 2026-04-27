import "dotenv/config";
import { pool } from "../db.js";

async function cleanup() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        // Remove columns from disputes table
        await client.query(`ALTER TABLE disputes DROP COLUMN IF EXISTS carry_score_p1;`);
        await client.query(`ALTER TABLE disputes DROP COLUMN IF EXISTS carry_score_p2;`);
        
        // Remove columns from matches table
        await client.query(`ALTER TABLE matches DROP COLUMN IF EXISTS carried_score_p1;`);
        await client.query(`ALTER TABLE matches DROP COLUMN IF EXISTS carried_score_p2;`);
        
        await client.query("COMMIT");
        console.log("Cleanup OK: carry_score and carried_score columns dropped successfully.");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Cleanup failed:", e);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
