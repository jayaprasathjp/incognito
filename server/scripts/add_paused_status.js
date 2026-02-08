import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    try {
        await pool.query('BEGIN');
        
        // 1. Find the constraint name
        const res = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'tournaments'::regclass
            AND contype = 'c';
        `);
        
        if (res.rows.length > 0) {
            const constraintName = res.rows[0].conname;
            console.log(`Dropping constraint: ${constraintName}`);
            await pool.query(`ALTER TABLE tournaments DROP CONSTRAINT ${constraintName}`);
        }

        // 2. Add new constraint
        console.log("Adding new constraint including 'paused'...");
        await pool.query(`
            ALTER TABLE tournaments 
            ADD CONSTRAINT tournaments_status_check 
            CHECK (status IN ('open', 'active', 'paused', 'completed'))
        `);

        await pool.query('COMMIT');
        console.log("Migration successful");
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error(e);
    } finally {
        await pool.end();
    }
}
migrate();
