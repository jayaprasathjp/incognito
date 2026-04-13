import "dotenv/config";
import { pool } from "../db.js";

/**
 * Extends disputes + matches for player disputes, rematch carry-over, and opponent response window.
 */
async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
            ALTER TABLE disputes
            ADD COLUMN IF NOT EXISTS respond_by TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS dispute_kind VARCHAR(40) DEFAULT 'player_claim',
            ADD COLUMN IF NOT EXISTS opponent_action VARCHAR(20),
            ADD COLUMN IF NOT EXISTS resolved_outcome VARCHAR(40),
            ADD COLUMN IF NOT EXISTS carry_score_p1 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS carry_score_p2 INTEGER DEFAULT 0;
        `);

        await client.query(`
            ALTER TABLE matches
            ADD COLUMN IF NOT EXISTS carried_score_p1 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS carried_score_p2 INTEGER DEFAULT 0;
        `);

        await client.query("COMMIT");
        console.log("migrate_disputes_v2: OK");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("migrate_disputes_v2 failed:", e);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
