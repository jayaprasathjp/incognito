import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Adding new columns to users table...");
        
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS institution VARCHAR(100),
            ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
        `);
        
        console.log("Migration successful.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
