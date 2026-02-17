import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Adding fixtures_generated column to rounds table...");
        
        await pool.query(`
            ALTER TABLE rounds 
            ADD COLUMN IF NOT EXISTS fixtures_generated BOOLEAN DEFAULT false
        `);
        
        console.log("✅ Column added successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error.message);
    } finally {
        await pool.end();
    }
}

migrate();
