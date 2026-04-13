import "dotenv/config";
import { pool } from "../db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
            ALTER TABLE disputes
            ADD COLUMN IF NOT EXISTS reason_category VARCHAR(40),
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS submitter_score_for INTEGER,
            ADD COLUMN IF NOT EXISTS submitter_score_against INTEGER,
            ADD COLUMN IF NOT EXISTS submitter_screenshots JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS opponent_description TEXT,
            ADD COLUMN IF NOT EXISTS opponent_score_for INTEGER,
            ADD COLUMN IF NOT EXISTS opponent_score_against INTEGER,
            ADD COLUMN IF NOT EXISTS opponent_screenshots JSONB DEFAULT '[]'::jsonb;
        `);

        await client.query("COMMIT");
        console.log("migrate_disputes_v3: OK");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("migrate_disputes_v3 failed:", e);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
