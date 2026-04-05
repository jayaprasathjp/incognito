import 'dotenv/config';
import { pool } from '../db.js';

async function migrate() {
    console.log("Starting matches check-in fields migration...");
    try {
        await pool.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS player1_ready BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS player2_ready BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
        `);
        console.log("Migration successful! `player1_ready`, `player2_ready`, and `checked_in_at` added to matches.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        pool.end();
    }
}

migrate();
