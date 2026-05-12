import { pool } from "./db.js";

async function migrate() {
    try {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const res = await client.query(`
                UPDATE participants p
                SET alias = u.username
                FROM users u
                WHERE p.user_id = u.id AND p.alias IS NULL
            `);
            console.log(`Successfully updated ${res.rowCount} participants.`);
            await client.query("COMMIT");
        } catch (e) {
            await client.query("ROLLBACK");
            console.error("Migration failed:", e);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Connection error:", err);
    } finally {
        process.exit(0);
    }
}

migrate();
