import "dotenv/config";
import { pool } from "../db.js";

async function getConstraints() {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'tournaments'::regclass");
        console.log("Constraints for tournaments table:");
        res.rows.forEach(row => {
            console.log(`${row.conname}: ${row.pg_get_constraintdef}`);
        });
        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        // close pool to exit
        // but pool is exported from db.js and might not have end() exposed or might hang. 
        // We'll just exit process.
        process.exit();
    }
}

getConstraints();
