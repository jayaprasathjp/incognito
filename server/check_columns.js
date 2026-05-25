import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT p.id, p.user_id, p.reference, p.amount, u.email
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE u.email IS NULL OR p.user_id IS NULL
        `);
        console.log("Orphaned or null user payments:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
