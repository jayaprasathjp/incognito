import { pool } from "../db.js";
import { toWATDateStr } from "./roundDateHelpers.js";

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
            "SELECT tournament_id, round, winner_id, status FROM matches WHERE id = $1",
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

/**
 * Sweeps all scheduled matches for the active tournament and auto-resolves walkovers/double DQs
 * if the check-in grace period (30 minutes after scheduled time) has passed.
 * @param {string} tournamentId - The ID of the tournament to sweep.
 * @param {object} client - (Optional) a pg client object.
 */
export const autoResolveExpiredMatches = async (tournamentId, client = pool) => {
    try {
        // Fetch all active/scheduled matches for this tournament that are unresolved
        const unresolvedRes = await client.query(
            `SELECT m.id, m.player1_id, m.player2_id, m.player1_ready, m.player2_ready, m.match_time, r.date as round_date
             FROM matches m
             JOIN tournaments t ON m.tournament_id = t.id
             LEFT JOIN rounds r ON m.tournament_id = r.tournament_id AND m.round = r.round_number
             WHERE m.tournament_id = $1 AND m.status = 'scheduled'`,
            [tournamentId]
        );

        const now = new Date();

        for (const match of unresolvedRes.rows) {
            let matchDate = match.round_date ? new Date(match.round_date) : new Date();
            if (isNaN(matchDate.getTime())) matchDate = new Date();
            const dateStr = toWATDateStr(matchDate);

            if (match.match_time && typeof match.match_time === 'string') {
                const timeStr = match.match_time.length === 5 ? match.match_time + ':00' : match.match_time;
                matchDate = new Date(`${dateStr}T${timeStr}+01:00`);
            } else {
                // If no match_time is set, skip
                continue;
            }

            // Check-in grace period ends 30 minutes after scheduled match time
            const checkInDeadline = new Date(matchDate.getTime() + 30 * 60000);

            if (now > checkInDeadline) {
                console.log(`[AUTO-SWEEPER] Match ${match.id} has expired check-in. Resolving...`);
                
                const dbClient = await pool.connect();
                try {
                    await dbClient.query('BEGIN');

                    // Re-fetch match inside transaction with FOR UPDATE to prevent race conditions
                    const lockRes = await dbClient.query(
                        "SELECT status, player1_ready, player2_ready, player1_id, player2_id, tournament_id FROM matches WHERE id = $1 FOR UPDATE",
                        [match.id]
                    );
                    
                    if (lockRes.rows.length > 0 && lockRes.rows[0].status === 'scheduled') {
                        const m = lockRes.rows[0];
                        
                        if (!m.player1_ready && !m.player2_ready) {
                            // BOTH ABSENT: Double DQ
                            await dbClient.query(
                                `UPDATE matches SET status = 'cancelled', match_code = 'DOUBLE_DQ', winner_id = NULL WHERE id = $1`,
                                [match.id]
                            );
                            await dbClient.query(
                                "UPDATE participants SET status = 'out' WHERE user_id IN ($1, $2) AND tournament_id = $3",
                                [m.player1_id, m.player2_id, tournamentId]
                            );
                            await checkIfTournamentFinished(match.id, dbClient);
                            console.log(`[AUTO-SWEEPER] Match ${match.id} resolved as DOUBLE_DQ`);
                        } else if (m.player1_ready && !m.player2_ready) {
                            // Player 1 wins by walkover
                            await dbClient.query(
                                `UPDATE matches SET status = 'completed', winner_id = $1, match_code = 'WALKOVER' WHERE id = $2`,
                                [m.player1_id, match.id]
                            );
                            await dbClient.query(
                                "UPDATE participants SET status = 'out' WHERE user_id = $1 AND tournament_id = $2",
                                [m.player2_id, tournamentId]
                            );
                            await checkIfTournamentFinished(match.id, dbClient);
                            console.log(`[AUTO-SWEEPER] Match ${match.id} resolved as WALKOVER for Player 1`);
                        } else if (!m.player1_ready && m.player2_ready) {
                            // Player 2 wins by walkover
                            await dbClient.query(
                                `UPDATE matches SET status = 'completed', winner_id = $1, match_code = 'WALKOVER' WHERE id = $2`,
                                [m.player2_id, match.id]
                            );
                            await dbClient.query(
                                "UPDATE participants SET status = 'out' WHERE user_id = $1 AND tournament_id = $2",
                                [m.player1_id, tournamentId]
                            );
                            await checkIfTournamentFinished(match.id, dbClient);
                            console.log(`[AUTO-SWEEPER] Match ${match.id} resolved as WALKOVER for Player 2`);
                        }
                    }
                    await dbClient.query('COMMIT');
                } catch (e) {
                    await dbClient.query('ROLLBACK');
                    console.error(`[AUTO-SWEEPER] Error resolving match ${match.id}:`, e);
                } finally {
                    dbClient.release();
                }
            }
        }
    } catch (err) {
        console.error("[AUTO-SWEEPER] Error in autoResolveExpiredMatches:", err);
    }
};

