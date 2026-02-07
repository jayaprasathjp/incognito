import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Starting Schema Migration V2...");

        await client.query('BEGIN');

        // 1. Add referral_code to users
        console.log("Adding referral_code to users...");
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
        `);

        // 2. Add score columns to matches
        console.log("Adding scores to matches...");
        await client.query(`
            ALTER TABLE matches 
            ADD COLUMN IF NOT EXISTS score_player1 INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS score_player2 INTEGER DEFAULT 0;
        `);

        // 3. Create Bank Details Table
        console.log("Creating bank_details table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS bank_details (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                account_name VARCHAR(100),
                account_number VARCHAR(20),
                bank_name VARCHAR(50),
                account_type VARCHAR(20),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            );
        `);

        // 4. Create Referrals Table
        console.log("Creating referrals table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_id INTEGER REFERENCES users(id),
                referred_user_id INTEGER REFERENCES users(id),
                status VARCHAR(20) DEFAULT 'completed', -- pending/completed
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(referred_user_id)
            );
        `);

        await client.query('COMMIT');
        console.log("Migration V2 successful.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", error);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
