import "dotenv/config";
import { pool } from "./db.js";
(async () => {
    try {
        const res = await pool.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'disputes' AND c.conname = 'disputes_status_check';");
        console.table(res.rows);
    } finally {
        pool.end();
    }
})();
