export async function tryAutoMatch(client, tournamentId, userId) {
    try {
        // 1. Find a participant in this tournament who is NOT in any match (as p1 or p2)
        //    and is NOT the current user.
        const query = `
            SELECT user_id 
            FROM participants 
            WHERE tournament_id = $1 
              AND user_id != $2
              AND user_id NOT IN (
                  SELECT player1_id FROM matches WHERE tournament_id = $1
                  UNION 
                  SELECT player2_id FROM matches WHERE tournament_id = $1
              )
            LIMIT 1
        `;
        const res = await client.query(query, [tournamentId, userId]);

        if (res.rows.length > 0) {
            const opponentId = res.rows[0].user_id;
            console.log(`Auto-matching User ${userId} with User ${opponentId}`);

            // 2. Create Match
            // Determine match_order? Just use count + 1
            const countRes = await client.query("SELECT COUNT(*) FROM matches WHERE tournament_id = $1", [tournamentId]);
            const nextOrder = parseInt(countRes.rows[0].count) + 1;
            const matchCode = Math.random().toString(36).substring(2, 8).toUpperCase();

            await client.query(
                "INSERT INTO matches (tournament_id, round, match_order, player1_id, player2_id, status, match_code) VALUES ($1, 1, $2, $3, $4, 'scheduled', $5)",
                [tournamentId, nextOrder, userId, opponentId, matchCode]
            );
            return true; // Match created
        }
        return false; // No match created (waiting for next)
    } catch (e) {
        console.error("Auto-match error:", e);
        return false;
    }
}
