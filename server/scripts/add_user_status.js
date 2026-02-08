import dotenv from "dotenv";
dotenv.config();
import { pool } from "../db.js";

async function runMigration() {
    try {
        console.log("Checking users table for status column...");
        
        // check if column exists
        const check = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='status'
        `);

        if (check.rows.length === 0) {
            console.log("Adding status column to users table...");
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned'));
            `);
            console.log("Column added successfully.");
        } else {
            console.log("Status column already exists.");
        }

        // Verify
        const test = await pool.query("SELECT id, username, status FROM users LIMIT 5");
        console.table(test.rows);

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

runMigration();
