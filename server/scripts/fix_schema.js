import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false
  }
});

const fixSchema = async () => {
    const client = await pool.connect();
    try {
        console.log("Checking 'users' table schema...");
        
        // Check if columns exist
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('reset_password_token', 'reset_password_expires');
        `;
        
        const res = await client.query(checkQuery);
        const existingColumns = res.rows.map(r => r.column_name);
        console.log("Existing columns found:", existingColumns);

        if (!existingColumns.includes('reset_password_token')) {
            console.log("Adding reset_password_token...");
            await client.query('ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255);');
        }

        if (!existingColumns.includes('reset_password_expires')) {
            console.log("Adding reset_password_expires...");
            await client.query('ALTER TABLE users ADD COLUMN reset_password_expires BIGINT;');
        }

        console.log("Schema fix completed.");
        
    } catch (err) {
        console.error("Error fixing schema:", err);
    } finally {
        client.release();
        await pool.end();
    }
};

fixSchema();
