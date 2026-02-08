import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    try {
        await pool.query('BEGIN');
        
        console.log("Adding columns to matches table...");
        await pool.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS proof_image TEXT,
            ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id)
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
