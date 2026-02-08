import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    try {
        await pool.query('BEGIN');
        
        console.log("Adding winner_id to tournaments table...");
        await pool.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS winner_id INTEGER REFERENCES users(id)
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
