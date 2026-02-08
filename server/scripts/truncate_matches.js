import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function truncateMatches() {
    try {
        console.log("Truncating matches table (and disputes via CASCADE)...");
        // Due to FK constraint from disputes -> matches, we use CASCADE
        await pool.query("TRUNCATE TABLE matches CASCADE");
        console.log("Matches table truncated.");
    } catch (e) {
        console.error("Error truncating matches:", e);
    } finally {
        await pool.end();
    }
}
truncateMatches();
