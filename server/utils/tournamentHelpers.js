import { pool } from "../db.js";

/**
 * Checks if the completed match is the final match of the tournament.
 * If yes, it sets the tournament status to 'completed' and sets the winner.
 * @param {string} matchId - The ID of the match that was just completed.
 * @param {object} client - (Optional) a pg client object if part of a transaction, else uses pool.
 */
export const checkIfTournamentFinished = async (matchId, client = pool) => {
    try {
        // Find the match details
        const matchRes = await client.query(
            "SELECT tournament_id, round, winner_id FROM matches WHERE id = $1",
            [matchId]
        );
        if (matchRes.rows.length === 0) return;
        const match = matchRes.rows[0];

        // Find the max round for this tournament
        const roundsRes = await client.query(
            "SELECT MAX(round_number) as max_round FROM rounds WHERE tournament_id = $1",
            [match.tournament_id]
        );
        
        let maxRound = 1;
        if (roundsRes.rows.length > 0 && roundsRes.rows[0].max_round) {
            maxRound = parseInt(roundsRes.rows[0].max_round);
        }

        // If the completed match is in the final round
        if (match.round === maxRound && (match.status === 'completed' || match.status === 'cancelled')) {
            // Verify if there are other matches in this same final round that are not completed or cancelled
            const pendingFinals = await client.query(
                "SELECT id FROM matches WHERE tournament_id = $1 AND round = $2 AND status NOT IN ('completed', 'cancelled')",
                [match.tournament_id, match.round]
            );

            if (pendingFinals.rows.length === 0) {
                // All final matches are resolved. Did we get a winner?
                const winnerRes = await client.query(
                    "SELECT winner_id FROM matches WHERE tournament_id = $1 AND round = $2 AND winner_id IS NOT NULL LIMIT 1",
                    [match.tournament_id, match.round]
                );

                if (winnerRes.rows.length > 0 && winnerRes.rows[0].winner_id) {
                    await client.query(
                        "UPDATE tournaments SET status = 'completed', winner_id = $1 WHERE id = $2",
                        [winnerRes.rows[0].winner_id, match.tournament_id]
                    );
                } else {
                    // No winner was produced (e.g., Double Disqualification). Fallback to Paused.
                    await client.query(
                        "UPDATE tournaments SET status = 'paused' WHERE id = $1",
                        [match.tournament_id]
                    );
                    console.log(`Tournament ${match.tournament_id} paused due to empty winner_id in final match.`);
                }
            }
        }
    } catch (err) {
        console.error("Error in checkIfTournamentFinished:", err);
    }
};
