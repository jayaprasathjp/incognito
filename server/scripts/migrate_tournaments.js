import { pool } from "../db.js";

const runMigration = async () => {
    try {
        console.log("Starting migration...");
        
        // Add columns if they don't exist
        await pool.query(`
            ALTER TABLE tournaments 
            ADD COLUMN IF NOT EXISTS registration_start TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS registration_end TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS capacity INTEGER,
            ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS prize_pool DECIMAL(10, 2) DEFAULT 0;
        `);

        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await pool.end();
    }
};

runMigration();
