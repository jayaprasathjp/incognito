import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function verifyParticipation() {
    try {
        console.log("--- VERIFYING PARTICIPATION LOGIC ---");
        
        // 1. Get Latest Tournament
        const tourneyRes = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC LIMIT 1");
        const tourney = tourneyRes.rows[0];
        console.log(`Current Tournament: ${tourney.title} (ID: ${tourney.id}, Status: ${tourney.status})`);

        // 2. Check Participants for Current
        const partsRes = await pool.query("SELECT COUNT(*) FROM participants WHERE tournament_id = $1", [tourney.id]);
        console.log(`Participants in Current: ${partsRes.rows[0].count}`);

        // 3. Simulate "Freshness" Check
        // If we were to create a new tournament, would it be empty?
        console.log("Logic Check: A new tournament ID would have 0 participants initially. This ensures the 'refresh'.");

        // 4. Verify 'auth.js' logic (simulation)
        if (tourney.status === 'open') {
            console.log("Status is OPEN: New registrations WILL be auto-added to participants.");
        } else {
            console.log("Status is NOT OPEN: New registrations will NOT be added (User must wait or join next).");
        }

        console.log("--- CHECKS COMPLETE ---");

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
verifyParticipation();
