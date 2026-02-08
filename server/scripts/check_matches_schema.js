import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'matches';
        `);
        console.log("Matches Table Columns:");
        res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkSchema();
