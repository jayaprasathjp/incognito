import "dotenv/config";
import { pool } from "../db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        console.log("Dropping old disputes_status_check constraint...");
        await client.query(`
            ALTER TABLE disputes
            DROP CONSTRAINT IF EXISTS disputes_status_check;
        `);

        console.log("Adding new disputes_status_check constraint including awaiting_admin...");
        await client.query(`
            ALTER TABLE disputes
            ADD CONSTRAINT disputes_status_check 
            CHECK (status IN ('pending', 'resolved', 'rejected', 'awaiting_admin'));
        `);

        await client.query("COMMIT");
        console.log("migrate_disputes_v4: OK");
    } catch (e) {
        await client.query("ROLLBACK");
        console.error("migrate_disputes_v4 failed:", e);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
