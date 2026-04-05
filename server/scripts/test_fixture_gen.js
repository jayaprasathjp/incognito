import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : { user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT }
);

const SESSION_TIME_SLOTS = {
    morning:   ['10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'],
    afternoon: ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'],
    evening:   ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']
};

function nextPowerOf2(n) { let p = 1; while (p < n) p *= 2; return p; }
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

const BATCH_SIZE = 100;

async function run() {
    const client = await pool.connect();
    try {
        await client.query('SET statement_timeout = 120000');
        await client.query('BEGIN');

        // Check round
        const roundRes = await client.query("SELECT * FROM rounds WHERE tournament_id = 34 AND round_number = 1");
        if (roundRes.rows[0].fixtures_generated) throw new Error("Already generated");

        // Fetch players sorted by join time
        const pRes = await client.query(
            `SELECT p.user_id as id, p.session_preference, p.joined_at FROM participants p WHERE p.tournament_id = 34 AND p.status = 'approved' ORDER BY p.joined_at ASC`
        );
        const allPlayers = pRes.rows;
        const totalPlayers = allPlayers.length;
        const nextPow2 = nextPowerOf2(totalPlayers);
        const byeCount = nextPow2 - totalPlayers;

        console.log(`Total: ${totalPlayers}, Next POW2: ${nextPow2}, BYEs: ${byeCount}, Playing: ${totalPlayers - byeCount}`);

        const byePlayers = allPlayers.slice(0, byeCount);
        const playingPlayers = allPlayers.slice(byeCount);

        // Build BYE array
        const byeMatches = byePlayers.map(p => ({ playerId: p.id }));

        // Group playing players by session
        const sessionGroups = { morning: [], afternoon: [], evening: [] };
        for (const p of playingPlayers) {
            const s = p.session_preference || 'morning';
            (sessionGroups[s] || sessionGroups.morning).push(p);
        }
        console.log(`Sessions — morning: ${sessionGroups.morning.length}, afternoon: ${sessionGroups.afternoon.length}, evening: ${sessionGroups.evening.length}`);

        const leftoverPlayers = [];
        const schedMatches = [];

        for (const session of ['morning', 'afternoon', 'evening']) {
            const group = shuffle(sessionGroups[session]);
            for (let i = 0; i < group.length - 1; i += 2) {
                schedMatches.push({ p1: group[i], p2: group[i + 1], session });
            }
            if (group.length % 2 !== 0) leftoverPlayers.push(group[group.length - 1]);
        }
        shuffle(leftoverPlayers);
        for (let i = 0; i < leftoverPlayers.length - 1; i += 2) {
            schedMatches.push({ p1: leftoverPlayers[i], p2: leftoverPlayers[i + 1], session: leftoverPlayers[i].session_preference || 'morning' });
        }
        if (leftoverPlayers.length % 2 !== 0) {
            byeMatches.push({ playerId: leftoverPlayers[leftoverPlayers.length - 1].id });
        }

        // BULK INSERT BYEs
        let matchesCreated = 0;
        for (let b = 0; b < byeMatches.length; b += BATCH_SIZE) {
            const batch = byeMatches.slice(b, b + BATCH_SIZE);
            const values = []; const params = []; let idx = 1;
            for (const m of batch) {
                values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+2}, 'completed', 'BYE', NULL)`);
                params.push(34, 1, m.playerId);
                idx += 3;
            }
            await client.query(`INSERT INTO matches (tournament_id, round, player1_id, winner_id, status, match_code, match_time) VALUES ${values.join(', ')}`, params);
            matchesCreated += batch.length;
            process.stdout.write(`\rBYEs: ${matchesCreated}/${byeMatches.length}`);
        }
        console.log(`\n✅ Inserted ${byeMatches.length} BYE matches in ${Math.ceil(byeMatches.length / BATCH_SIZE)} batches`);

        // BULK INSERT scheduled matches
        const sessionSlotCounters = { morning: 0, afternoon: 0, evening: 0 };
        const schedData = schedMatches.map(match => {
            const slots = SESSION_TIME_SLOTS[match.session] || SESSION_TIME_SLOTS.morning;
            const matchTime = slots[sessionSlotCounters[match.session] % slots.length];
            sessionSlotCounters[match.session]++;
            return { p1Id: match.p1.id, p2Id: match.p2.id, matchCode: Math.random().toString(36).substring(2, 8).toUpperCase(), matchTime };
        });

        let schedCreated = 0;
        for (let b = 0; b < schedData.length; b += BATCH_SIZE) {
            const batch = schedData.slice(b, b + BATCH_SIZE);
            const values = []; const params = []; let idx = 1;
            for (const m of batch) {
                values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, 'scheduled', $${idx+4}, $${idx+5})`);
                params.push(34, 1, m.p1Id, m.p2Id, m.matchCode, m.matchTime);
                idx += 6;
            }
            await client.query(`INSERT INTO matches (tournament_id, round, player1_id, player2_id, status, match_code, match_time) VALUES ${values.join(', ')}`, params);
            schedCreated += batch.length;
            matchesCreated += batch.length;
            process.stdout.write(`\rScheduled: ${schedCreated}/${schedData.length}`);
        }
        console.log(`\n✅ Inserted ${schedData.length} scheduled matches in ${Math.ceil(schedData.length / BATCH_SIZE)} batches`);

        // Mark done
        await client.query("UPDATE rounds SET fixtures_generated = true WHERE tournament_id = 34 AND round_number = 1");
        await client.query('COMMIT');
        console.log(`\n🎉 Total: ${matchesCreated} matches created!`);

        // VERIFICATION
        console.log('\n📊 VERIFICATION:');
        const r1 = await pool.query("SELECT status, COUNT(*) as c FROM matches WHERE tournament_id = 34 AND round = 1 GROUP BY status");
        for (const row of r1.rows) console.log(`  ${row.status}: ${row.c}`);

        const r2 = await pool.query(`
            SELECT p1.session_preference as p1s, p2.session_preference as p2s, COUNT(*) as c
            FROM matches m
            JOIN participants p1 ON m.player1_id = p1.user_id AND p1.tournament_id = 34
            JOIN participants p2 ON m.player2_id = p2.user_id AND p2.tournament_id = 34
            WHERE m.tournament_id = 34 AND m.round = 1 AND m.status = 'scheduled'
            GROUP BY p1s, p2s ORDER BY p1s, p2s
        `);
        console.log('\n  Session pairing:');
        for (const row of r2.rows) console.log(`    ${row.p1s} vs ${row.p2s}: ${row.c}`);

        const r3 = await pool.query("SELECT match_time, COUNT(*) as c FROM matches WHERE tournament_id = 34 AND round = 1 AND status = 'scheduled' GROUP BY match_time ORDER BY match_time");
        console.log('\n  Match time distribution:');
        for (const row of r3.rows) console.log(`    ${row.match_time}: ${row.c}`);

        // Verify BYE priority
        const r4 = await pool.query(`
            SELECT MIN(p.joined_at) as earliest_bye, MAX(p.joined_at) as latest_bye
            FROM matches m JOIN participants p ON m.player1_id = p.user_id AND p.tournament_id = 34
            WHERE m.tournament_id = 34 AND m.round = 1 AND m.match_code = 'BYE'
        `);
        const r5 = await pool.query(`
            SELECT MIN(p.joined_at) as earliest_play, MAX(p.joined_at) as latest_play
            FROM matches m 
            JOIN participants p ON (m.player1_id = p.user_id OR m.player2_id = p.user_id) AND p.tournament_id = 34
            WHERE m.tournament_id = 34 AND m.round = 1 AND m.status = 'scheduled'
        `);
        console.log('\n  BYE priority check:');
        console.log(`    BYE players joined: ${r4.rows[0].earliest_bye} → ${r4.rows[0].latest_bye}`);
        console.log(`    Playing players joined: ${r5.rows[0].earliest_play} → ${r5.rows[0].latest_play}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('ERROR:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
