import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function fixTournament() {
    const client = await pool.connect();
    try {
        console.log("--- FIXING BROKEN TOURNAMENT ---");
        
        // 1. Get latest tournament
        const tRes = await client.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (tRes.rows.length === 0) return console.log("No tournaments found");
        
        const t = tRes.rows[0];
        console.log(`Target Tournament: ${t.title} (ID: ${t.id}) | Status: ${t.status}`);

        // 2. Check participants
        const pRes = await client.query("SELECT count(*) FROM participants WHERE tournament_id = $1", [t.id]);
        const pCount = parseInt(pRes.rows[0].count);
        console.log(`Current Participants: ${pCount}`);

        // 3. Check matches
        const mRes = await client.query("SELECT count(*) FROM matches WHERE tournament_id = $1", [t.id]);
        const mCount = parseInt(mRes.rows[0].count);
        console.log(`Current Matches: ${mCount}`);

        if (pCount === 0 && mCount === 0) {
            console.log("DETECTED BROKEN STATE: Active tournament with no players/matches.");
            console.log("Restoring participants from 'users' table...");

            // Reset status to open
            await client.query("UPDATE tournaments SET status = 'open' WHERE id = $1", [t.id]);
            console.log("Set status back to 'open'.");

            // Re-add ALL players to participants (Simplest fix for now), avoiding duplicates
            // We assume anyone who is a 'player' might want to play, or at least the ones who tried.
            // Better: Add only 'active' players.
            await client.query(`
                INSERT INTO participants (tournament_id, user_id, status)
                SELECT $1, id, 'approved' FROM users WHERE role = 'player'
                ON CONFLICT (tournament_id, user_id) DO NOTHING
            `, [t.id]);
            
            console.log("Re-populated participants.");
            console.log("NOW: Please go to Admin Panel and click 'START TOURNAMENT' again.");
        } else {
            console.log("Tournament seems fine or partially populated. No huge fix applied automatically.");
            if (t.status === 'active' && mCount === 0) {
                 console.log("Active but no matches? Resetting to open.");
                 await client.query("UPDATE tournaments SET status = 'open' WHERE id = $1", [t.id]);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

fixTournament();
