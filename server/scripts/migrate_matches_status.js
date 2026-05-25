import "dotenv/config";
import { pool } from "../db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        console.log("Dropping old matches_status_check constraint...");
        await client.query(`
            ALTER TABLE matches
            DROP CONSTRAINT IF EXISTS matches_status_check;
        `);

        console.log("Adding new matches_status_check constraint including pending_review and cancelled...");
        await client.query(`
            ALTER TABLE matches
            ADD CONSTRAINT matches_status_check 
            CHECK (status IN ('scheduled', 'in_progress', 'completed', 'pending_review', 'cancelled'));
        `);

        await client.query("COMMIT");
        console.log("migrate_matches_status: OK");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("migrate_matches_status failed:", e);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
