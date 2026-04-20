import { pool } from "../db.js";

export async function ensureAnnouncementTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS announcements (
            id SERIAL PRIMARY KEY,
            message TEXT NOT NULL,
            audience_type TEXT NOT NULL,
            tournament_id INTEGER REFERENCES tournaments(id) ON DELETE SET NULL,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS announcement_recipients (
            id SERIAL PRIMARY KEY,
            announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            read_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (announcement_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user_id
            ON announcement_recipients(user_id);

        CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user_read_at
            ON announcement_recipients(user_id, read_at);
    `);
}

export async function getLatestTournament() {
    const result = await pool.query("SELECT id, title, status FROM tournaments ORDER BY created_at DESC LIMIT 1");
    return result.rows[0] || null;
}

export async function getAnnouncementAudience() {
    await ensureAnnouncementTables();

    const [allPlayersResult, currentTournament] = await Promise.all([
        pool.query(
            `SELECT id, username, email, status
             FROM users
             WHERE role = 'player'
             ORDER BY username ASC`
        ),
        getLatestTournament(),
    ]);

    let currentTournamentPlayers = [];

    if (currentTournament) {
        const tournamentPlayersResult = await pool.query(
            `SELECT u.id, u.username, u.email, u.status, p.joined_at
             FROM participants p
             JOIN users u ON u.id = p.user_id
             WHERE p.tournament_id = $1
               AND p.status = 'approved'
               AND u.role = 'player'
             ORDER BY u.username ASC`,
            [currentTournament.id]
        );

        currentTournamentPlayers = tournamentPlayersResult.rows;
    }

    return {
        allPlayers: allPlayersResult.rows,
        currentTournament,
        currentTournamentPlayers,
    };
}

export async function resolveAnnouncementRecipients(target, recipientIds = []) {
    await ensureAnnouncementTables();

    const normalizedTarget = target === "round" ? "current_tournament" : target;

    if (normalizedTarget === "all") {
        const result = await pool.query(
            `SELECT id, username, email
             FROM users
             WHERE role = 'player'
               AND COALESCE(status, 'active') != 'banned'
             ORDER BY username ASC`
        );

        return {
            audienceType: "all",
            recipients: result.rows,
            tournament: null,
        };
    }

    if (normalizedTarget === "current_tournament") {
        const currentTournament = await getLatestTournament();

        if (!currentTournament) {
            throw new Error("No tournament found for current tournament announcements");
        }

        const result = await pool.query(
            `SELECT DISTINCT u.id, u.username, u.email
             FROM participants p
             JOIN users u ON u.id = p.user_id
             WHERE p.tournament_id = $1
               AND p.status = 'approved'
               AND u.role = 'player'
               AND COALESCE(u.status, 'active') != 'banned'
             ORDER BY u.username ASC`,
            [currentTournament.id]
        );

        return {
            audienceType: "current_tournament",
            recipients: result.rows,
            tournament: currentTournament,
        };
    }

    if (normalizedTarget === "individuals") {
        const sanitizedIds = [...new Set((recipientIds || [])
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0))];

        if (sanitizedIds.length === 0) {
            throw new Error("Select at least one player");
        }

        const result = await pool.query(
            `SELECT id, username, email
             FROM users
             WHERE role = 'player'
               AND id = ANY($1::int[])
               AND COALESCE(status, 'active') != 'banned'
             ORDER BY username ASC`,
            [sanitizedIds]
        );

        if (result.rows.length === 0) {
            throw new Error("Selected players were not found");
        }

        return {
            audienceType: "individuals",
            recipients: result.rows,
            tournament: null,
        };
    }

    throw new Error("Invalid announcement target");
}