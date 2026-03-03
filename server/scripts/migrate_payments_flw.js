import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        const { pool } = await import('../db.js');
        
        console.log("Adding Flutterwave columns to payments table...");
        
        // Add tournament_id column if not exists
        await pool.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id);
        `);
        console.log("Added tournament_id column.");

        // Add flw_transaction_id column if not exists
        await pool.query(`
            ALTER TABLE payments 
            ADD COLUMN IF NOT EXISTS flw_transaction_id VARCHAR(100);
        `);
        console.log("Added flw_transaction_id column.");

        // Update reference column to tx_ref for clarity (rename if needed, or just use as-is)
        // We'll keep 'reference' as our tx_ref field

        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error running migration:", err);
        process.exit(1);
    }
};

migrate();
