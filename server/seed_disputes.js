import "dotenv/config";
import { pool } from "./db.js";

async function seedDisputes() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN;");
    
    // 1. Find an active tournament or the most recent one
    const trnRes = await client.query(`SELECT * FROM tournaments ORDER BY id DESC LIMIT 1`);
    if(trnRes.rows.length === 0) {
        console.log("No tournament found. Creating one...");
        await client.query(`
            INSERT INTO tournaments (title, capacity, entry_fee, registration_start, registration_end, status) 
            VALUES ('Test Tournament', 256, 1000, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'in_progress')
            RETURNING id;
        `);
    }
    const tournamentId = trnRes.rows.length > 0 ? trnRes.rows[0].id : 1;

    // 2. Fetch some existing users to use as players
    const usrRes = await client.query(`SELECT id, username FROM users LIMIT 4`);
    if(usrRes.rows.length < 4) {
        console.log("Not enough users to create disputes. Please register 4 users.");
        return;
    }
    const users = usrRes.rows;
    // ensure users are participants in tournament
    for(let user of users) {
        await client.query(`
            INSERT INTO participants (tournament_id, user_id, status, session_preference)
            VALUES ($1, $2, 'approved', 'morning')
            ON CONFLICT (tournament_id, user_id) DO NOTHING
        `, [tournamentId, user.id]);
    }

    // 3. Create Matches
    console.log("Creating Matches for testing disputes...");
    
    const insertMatch = async (p1, p2, matchCode) => {
        const res = await client.query(`
            INSERT INTO matches (
                tournament_id, round, player1_id, player2_id, 
                match_code, status, match_time, game_room_code,
                player1_ready, player2_ready, checked_in_at
            ) VALUES (
                $1, 1, $2, $3, 
                $4, 'in_progress', '13:00', 'CODE88',
                true, true, NOW() - INTERVAL '2 hours'
            ) RETURNING id
        `, [tournamentId, p1.id, p2.id, matchCode]);
        return res.rows[0].id;
    };

    // --- CASE 1: SCORE CONFLICT (Both submit but disagree) ---
    const matchId1 = await insertMatch(users[0], users[1], 'M-1');
    // Player 1 claims 3-0
    await client.query(`
        INSERT INTO disputes (match_id, submitted_by, dispute_kind, reason, status, submitter_screenshots, submitter_score_for, submitter_score_against)
        VALUES ($1, $2, 'score_conflict', 'I won', 'pending', '["https://example.com/proof1.png"]', 3, 0)
    `, [matchId1, users[0].id]);
    // Player 2 claims 0-3
    await client.query(`
        INSERT INTO disputes (match_id, submitted_by, dispute_kind, reason, status, submitter_screenshots, submitter_score_for, submitter_score_against)
        VALUES ($1, $2, 'score_conflict', 'No I won', 'pending', '["https://example.com/proof2.png"]', 0, 3)
    `, [matchId1, users[1].id]);

    // --- CASE 2: PLAYER CLAIM (One person submitted, the other hasn't responded yet, it's pending response) ---
    // Change match status to active so it looks like waiting for P2 to submit. Wait, actually if P1 submitted, the match should still be active or awaiting_claim, but in our system it is 'in_progress'.
    const res2 = await client.query(`
        INSERT INTO matches (
            tournament_id, round, player1_id, player2_id, 
            match_code, status, match_time, game_room_code,
            player1_ready, player2_ready, checked_in_at
        ) VALUES (
            $1, 1, $2, $3, 
            'M-2', 'in_progress', '13:00', 'CODE88',
            true, true, NOW() - INTERVAL '2 hours'
        ) RETURNING id
    `, [tournamentId, users[2].id, users[3].id]);
    const matchId2 = res2.rows[0].id;

    // Player 1 raises a player_claim dispute (they submitted, opponent didn't)
    await client.query(`
        INSERT INTO disputes (match_id, submitted_by, dispute_kind, reason, status, submitter_screenshots, submitter_score_for, submitter_score_against, respond_by)
        VALUES ($1, $2, 'player_claim', 'Opponent hasn''t submitted', 'pending', '["https://example.com/proof3.png"]', 3, 0, NOW() + INTERVAL '30 minutes')
    `, [matchId2, users[2].id]);
    // Mark P1 as submitted
    await client.query(`UPDATE matches SET submitted_by = $2 WHERE id = $1`, [matchId2, users[2].id]);

    // --- CASE 3: EXPIRED PLAYER CLAIM (Auto-resolved soon or needs admin attention if there's a bug) ---
    const res3 = await client.query(`
        INSERT INTO matches (
            tournament_id, round, player1_id, player2_id, 
            match_code, status, match_time, game_room_code,
            player1_ready, player2_ready, checked_in_at
        ) VALUES (
            $1, 1, $2, $3, 
            'M-3', 'in_progress', '12:00', 'CODE88',
            true, true, NOW() - INTERVAL '4 hours'
        ) RETURNING id
    `, [tournamentId, users[0].id, users[2].id]);
    const matchId3 = res3.rows[0].id;
    await client.query(`
        INSERT INTO disputes (match_id, submitted_by, dispute_kind, reason, status, submitter_screenshots, submitter_score_for, submitter_score_against, respond_by)
        VALUES ($1, $2, 'player_claim', 'Expired claim', 'pending', '["https://example.com/proof4.png"]', 2, 1, NOW() - INTERVAL '30 minutes')
    `, [matchId3, users[0].id]);


    // --- CASE 4: CONNECTION ISSUES (Non-score dispute) ---
    const res4 = await client.query(`
        INSERT INTO matches (
            tournament_id, round, player1_id, player2_id, 
            match_code, status, match_time, game_room_code,
            player1_ready, player2_ready, checked_in_at
        ) VALUES (
            $1, 1, $2, $3, 
            'M-4', 'in_progress', '13:00', 'CODE88',
            true, true, NOW() - INTERVAL '2 hours'
        ) RETURNING id
    `, [tournamentId, users[1].id, users[3].id]);
    const matchId4 = res4.rows[0].id;
    await client.query(`
        INSERT INTO disputes (match_id, submitted_by, dispute_kind, reason, status, submitter_screenshots)
        VALUES ($1, $2, 'connection_issues', 'The lag was terrible, opponent disconnected', 'pending', '["https://example.com/proof5.png"]')
    `, [matchId4, users[3].id]);


    // --- CASE 5: OPPONENT RESPONSE/AGREE (Both sides submitted, looking for admin closure) ---
    const res5 = await client.query(`
        INSERT INTO matches (
            tournament_id, round, player1_id, player2_id, 
            match_code, status, match_time, game_room_code,
            player1_ready, player2_ready, checked_in_at
        ) VALUES (
            $1, 1, $2, $3, 
            'M-5', 'in_progress', '14:00', 'CODE99',
            true, true, NOW() - INTERVAL '1 hour'
        ) RETURNING id
    `, [tournamentId, users[0].id, users[1].id]);
    const matchId5 = res5.rows[0].id;

    await client.query(`
        INSERT INTO disputes (
            match_id, submitted_by, dispute_kind, reason, status, 
            submitter_screenshots, submitter_score_for, submitter_score_against,
            opponent_description, opponent_score_for, opponent_score_against, opponent_screenshots,
            opponent_action
        )
        VALUES (
            $1, $2, 'score_conflict', 'I won 2-1 clearly', 'pending', 
            '["https://example.com/p1_win.png"]', 2, 1,
            'I agree it was 2-1, I just hit dispute by mistake or misclicked', 2, 1, '["https://example.com/p2_confirm.png"]',
            'accepted'
        )
    `, [matchId5, users[0].id]);

    await client.query("COMMIT;");
    console.log("Successfully seeded disputes!");

  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("Error seeding disputes:", err);
  } finally {
    client.release();
    pool.end();
  }
}

seedDisputes();
