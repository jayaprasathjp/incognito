
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
    try {
        const res = await pool.query("SELECT COUNT(*) FROM participants WHERE tournament_id = 28");
        console.log(`Tournament 28 Participants Count: ${res.rows[0].count}`);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
