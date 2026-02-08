
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
    try {
        const { pool } = await import('../db.js');

        console.log("Testing player count...");
        await pool.query("SELECT COUNT(*) FROM users WHERE role = 'player'");
        
        console.log("Testing match count...");
        await pool.query("SELECT COUNT(*) FROM matches WHERE status = 'in_progress'");
        
        console.log("Testing disputes count...");
        await pool.query("SELECT COUNT(*) FROM disputes WHERE status = 'pending'");
        
        console.log("Testing prize pool...");
        await pool.query("SELECT SUM(amount) FROM payments WHERE status = 'completed'");
        
        console.log("Testing pending payouts...");
        await pool.query("SELECT COUNT(*) FROM payouts WHERE status = 'pending'");

        console.log("Testing recent disputes...");
        await pool.query(`
            SELECT 'dispute' as type, id, created_at, status 
            FROM disputes 
            WHERE status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 3
        `);

        console.log("Testing recent payouts...");
        await pool.query(`
            SELECT 'payout' as type, id, amount, created_at, status 
            FROM payouts 
            WHERE status = 'pending' 
            ORDER BY created_at ASC 
            LIMIT 3
        `);

        console.log("All users count:");
        const users = await pool.query("SELECT COUNT(*) FROM users");
        console.log("Users:", users.rows[0].count);

        console.log("All queries successful.");
        process.exit(0);
    } catch (err) {
        console.error("Query failed:", err.message);
        process.exit(1);
    }
};

run();
