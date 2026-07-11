import { pool } from "../db.js";

/**
 * Given a matchId, resolve the absolute JS Date of the match start time
 * by combining rounds.date (YYYY-MM-DD) + matches.match_time (HH:mm).
 *
 * Returns null if either piece of data is missing.
 */
export async function getMatchDateTime(matchId) {
  const result = await pool.query(
    `SELECT m.match_time, r.date AS round_date
       FROM matches m
       LEFT JOIN rounds r
         ON r.tournament_id = m.tournament_id
        AND r.round_number  = m.round
      WHERE m.id = $1`,
    [matchId]
  );

  if (result.rows.length === 0) return null;

  const { match_time, round_date } = result.rows[0];
  if (!match_time || !round_date) return null;

  // round_date is a Postgres DATE — comes as a JS Date object (midnight UTC)
  const base = new Date(round_date);

  const dateStr = base.toISOString().split('T')[0];
  const timeStr = match_time.length === 5 ? match_time + ':00' : match_time;
  const matchDt = new Date(`${dateStr}T${timeStr}+01:00`);

  return isNaN(matchDt.getTime()) ? null : matchDt;
}

/**
 * Fetch all scheduled matches that still need a 1-hour or 15-minute reminder
 * and whose datetime falls within the next [windowStart, windowEnd] minutes.
 */
export async function getMatchesNeedingReminder(windowStartMs, windowEndMs) {
  const now = new Date();
  const from = new Date(now.getTime() + windowStartMs);
  const to   = new Date(now.getTime() + windowEndMs);

  // Pull all scheduled matches with round date info
  const result = await pool.query(
    `SELECT m.id,
            m.player1_id,
            m.player2_id,
            m.match_time,
            m.push_1h_sent,
            m.push_15m_sent,
            r.date AS round_date
       FROM matches m
       LEFT JOIN rounds r
         ON r.tournament_id = m.tournament_id
        AND r.round_number  = m.round
      WHERE m.status = 'scheduled'
        AND m.match_time IS NOT NULL
        AND r.date IS NOT NULL`
  );

  const matches = [];

  for (const row of result.rows) {
    const base = new Date(row.round_date);
    const dateStr = base.toISOString().split('T')[0];
    const timeStr = row.match_time.length === 5 ? row.match_time + ':00' : row.match_time;
    const matchDt = new Date(`${dateStr}T${timeStr}+01:00`);

    if (isNaN(matchDt.getTime())) continue;

    const msUntil = matchDt.getTime() - now.getTime();
    if (msUntil >= windowStartMs && msUntil < windowEndMs) {
      matches.push({ ...row, matchDt, msUntil });
    }
  }

  return matches;
}
