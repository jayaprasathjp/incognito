import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function checkConstraints() {
    try {
        // Check for any check constraints on the status column
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'tournaments'::regclass
            AND contype = 'c';
        `);
        console.log("Check Constraints:", res.rows);

        // Check if it's using an enum type
        const colRes = await pool.query(`
            SELECT udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'tournaments' AND column_name = 'status';
        `);
        console.log("Column Type:", colRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkConstraints();
