import { checkIfTournamentFinished } from "./tournamentHelpers.js";

const PLAYER_PENDING = `
    SELECT * FROM disputes
    WHERE match_id = $1
      AND COALESCE(dispute_kind, 'player_claim') = 'player_claim'
      AND status = 'pending'
      AND respond_by IS NOT NULL
`;

/**
 * Auto-resolve player disputes past respond_by: submitter wins (3 pts via leaderboard).
 */
export async function expirePlayerDisputes(client, matchId) {
    const res = await client.query(
        `${PLAYER_PENDING} AND respond_by < NOW() FOR UPDATE`,
        [matchId]
    );
    for (const d of res.rows) {
        await client.query(
            `UPDATE disputes SET status = 'resolved', resolved_outcome = 'submitter_win', opponent_action = 'expired' WHERE id = $1`,
            [d.id]
        );
        const mRes = await client.query("SELECT * FROM matches WHERE id = $1 FOR UPDATE", [matchId]);
        if (mRes.rows.length === 0) continue;
        const match = mRes.rows[0];
        if (match.status !== "scheduled") continue;

        const winnerId = d.submitted_by;
        const isP1 = winnerId === match.player1_id;
        await client.query(
            `UPDATE matches SET
                status = 'completed',
                winner_id = $1,
                score_player1 = CASE WHEN $2::boolean THEN 3 ELSE 0 END,
                score_player2 = CASE WHEN $2::boolean THEN 0 ELSE 3 END,
                match_code = 'DISPUTE_SUBMITTER_WIN'
             WHERE id = $3`,
            [winnerId, isP1, matchId]
        );
        await checkIfTournamentFinished(matchId, client);
    }
}

export async function hasOpenPlayerDispute(client, matchId) {
    await expirePlayerDisputes(client, matchId);
    const r = await client.query(
        `SELECT 1 FROM disputes WHERE match_id = $1
         AND COALESCE(dispute_kind, 'player_claim') = 'player_claim'
         AND status = 'pending'`,
        [matchId]
    );
    return r.rows.length > 0;
}

export async function hasScoreConflictDisputePending(client, matchId) {
    const r = await client.query(
        `SELECT 1 FROM disputes WHERE match_id = $1 AND dispute_kind = 'score_conflict' AND status = 'pending'`,
        [matchId]
    );
    return r.rows.length > 0;
}

export async function ensureScoreConflictDispute(client, matchId, submittedByUserId) {
    const existing = await client.query(
        `SELECT id FROM disputes WHERE match_id = $1 AND dispute_kind = 'score_conflict'`,
        [matchId]
    );
    if (existing.rows.length > 0) return;

    // Fetch match details to retrieve both players' score claims and proofs
    const matchRes = await client.query(
        `SELECT player1_id, player2_id, p1_score, p1_opp_score, p1_proof, p2_score, p2_opp_score, p2_proof FROM matches WHERE id = $1`,
        [matchId]
    );
    
    if (matchRes.rows.length === 0) return;
    const match = matchRes.rows[0];

    const isP1Submitter = submittedByUserId === match.player1_id;

    const subScoreFor = isP1Submitter ? match.p1_score : match.p2_score;
    const subScoreAgainst = isP1Submitter ? match.p1_opp_score : match.p2_opp_score;
    const subProof = isP1Submitter ? match.p1_proof : match.p2_proof;
    const subScreenshots = subProof ? [subProof] : [];

    const oppScoreFor = isP1Submitter ? match.p2_score : match.p1_score;
    const oppScoreAgainst = isP1Submitter ? match.p2_opp_score : match.p1_opp_score;
    const oppProof = isP1Submitter ? match.p2_proof : match.p1_proof;
    const oppScreenshots = oppProof ? [oppProof] : [];

    await client.query(
        `INSERT INTO disputes (
            match_id, submitted_by, reason, status, dispute_kind, evidence_url,
            submitter_score_for, submitter_score_against, submitter_screenshots,
            opponent_score_for, opponent_score_against, opponent_screenshots
         )
         VALUES ($1, $2, $3, 'pending', 'score_conflict', NULL, $4, $5, $6::jsonb, $7, $8, $9::jsonb)`,
        [
            matchId,
            submittedByUserId,
            "Both players claimed a win with conflicting scores. Admin must review proofs and decide.",
            subScoreFor,
            subScoreAgainst,
            JSON.stringify(subScreenshots),
            oppScoreFor,
            oppScoreAgainst,
            JSON.stringify(oppScreenshots),
        ]
    );
}
