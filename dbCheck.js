import { pool } from './server/db.js';

async function run() {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'matches'");
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
