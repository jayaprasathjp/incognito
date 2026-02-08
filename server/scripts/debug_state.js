import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function debugState() {
    try {
        console.log("--- DEBUG STATE ---");
        const tRes = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (tRes.rows.length === 0) return console.log("No tournaments");
        
        const t = tRes.rows[0];
        console.log(`Tournament: ${t.title} (ID: ${t.id}) | Status: ${t.status}`);

        const mRes = await pool.query("SELECT * FROM matches WHERE tournament_id = $1", [t.id]);
        console.log(`Matches: ${mRes.rows.length}`);
        mRes.rows.forEach(m => console.log(` - Match ${m.id}: ${m.status} (P1: ${m.player1_id}, P2: ${m.player2_id})`));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
debugState();
