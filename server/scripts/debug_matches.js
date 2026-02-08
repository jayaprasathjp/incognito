import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function debugMatches() {
    try {
        console.log("--- DEBUGGING PARTICIPANTS AND MATCHES ---");
        
        // 1. Get latest tournament
        const tourneyRes = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        if (tourneyRes.rows.length === 0) return console.log("No tournament found");
        
        const tourney = tourneyRes.rows[0];
        console.log("Tournament:", tourney.title, "| ID:", tourney.id, "| Status:", tourney.status);

        // 2. Check Participants Table DIRECTLY
        const allParts = await pool.query("SELECT COUNT(*) FROM participants WHERE tournament_id = $1", [tourney.id]);
        console.log(`Direct Count from Participants table for ID ${tourney.id}:`, allParts.rows[0].count);

        if (parseInt(allParts.rows[0].count) === 0) {
            console.log("CRITICAL: No participants found for this tournament ID!");
            // Let's check if there are ANY participants in the table
            const anyParts = await pool.query("SELECT * FROM participants LIMIT 5");
            console.log("Sample of ANY participants in DB:", anyParts.rows);
        }

        // 3. Check Matches and their players
        const matchesRes = await pool.query("SELECT id, player1_id, player2_id FROM matches WHERE tournament_id = $1", [tourney.id]);
        console.log(`Found ${matchesRes.rows.length} matches.`);
        
        const playerIds = new Set();
        matchesRes.rows.forEach(m => {
            if(m.player1_id) playerIds.add(m.player1_id);
            if(m.player2_id) playerIds.add(m.player2_id);
        });
        console.log("Unique Player IDs in Matches:", Array.from(playerIds));
        
        // Check if these match players are in the participants table
        if (playerIds.size > 0) {
            const checkPlayers = await pool.query("SELECT user_id FROM participants WHERE tournament_id = $1 AND user_id = ANY($2)", [tourney.id, Array.from(playerIds)]);
            console.log(`Players from matches found in participants table: ${checkPlayers.rows.length} / ${playerIds.size}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
debugMatches();
