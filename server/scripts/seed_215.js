
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory (one level up from scripts)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const connectionConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const pool = new Pool(connectionConfig);

// ─── CONFIG ──────────────────────────────────────────
const TOURNAMENT_ID = 36;     // Target tournament
const TOTAL_USERS   = 215;
const BATCH_SIZE    = 25;
const BATCH_DELAY   = 300;    // ms between batches

// Email format  : p1@playincognito.ng, p2@playincognito.ng, ...
// Password      : player1, player2, ...  (e.g. player1 → password is "player1")
// Alias         : PLAYER1, PLAYER2, ...  (uppercase alphanumeric, stored on participants)
// ─────────────────────────────────────────────────────

/**
 * Spread join timestamps across the past 7 days.
 * Lower index = joined earlier.
 */
function getJoinedAt(index, total) {
    const now = new Date();
    const SPREAD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const baseOffset = SPREAD_MS - (index / total) * SPREAD_MS;
    const jitter = (Math.random() - 0.5) * 60 * 60 * 1000; // ±30 min
    return new Date(now.getTime() - baseOffset + jitter).toISOString();
}

async function seed() {
    console.log('═══════════════════════════════════════════════════');
    console.log(`🌱  Seeding ${TOTAL_USERS} test participants`);
    console.log(`    Tournament ID : ${TOURNAMENT_ID}`);
    console.log(`    Email format  : p{n}@playincognito.ng`);
    console.log(`    Password      : player{n}  (e.g. player1, player2 ...)`);
    console.log(`    Alias         : PLAYER{n}  (stored on participants)`);
    console.log(`    Batch size    : ${BATCH_SIZE}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (connectionConfig.connectionString) {
        console.log('Connecting via:', connectionConfig.connectionString.replace(/:[^:@]+@/, ':***@'));
    } else {
        console.log('Connecting to host:', connectionConfig.host);
    }

    const client = await pool.connect();
    console.log('✅ Connected to database.\n');

    await client.query('SET statement_timeout = 120000');

    // ── Step 0: Ensure joined_at column exists ──────────────────
    console.log('📐 Ensuring joined_at column exists on participants...');
    await client.query(`
        ALTER TABLE participants
        ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);
    console.log('   ✅ joined_at column ready.\n');

    const institutions = ['CyberUnilag', 'TechU', 'VarsityFC', 'PolyTech', 'StateUni', 'FederalCollege', 'MetroAcademy'];
    const sessions     = ['morning', 'afternoon', 'evening'];

    let usersCreated        = 0;
    let participantsCreated = 0;

    const startTime = Date.now();

    for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
        const currentBatch = Math.min(BATCH_SIZE, TOTAL_USERS - i);

        try {
            // ── 1. Build user rows (hash each password individually) ──
            const userRows = [];

            for (let j = 0; j < currentBatch; j++) {
                const n         = i + j + 1;              // 1-based: player 1 … 215
                const email     = `p${n}@playincognito.ng`;
                const password  = `player${n}`;           // e.g. "player1"
                const inst      = institutions[n % institutions.length];
                const refCode   = `SEED_P${n}`;

                // Hash password per-user so each is unique
                const hash = await bcrypt.hash(password, 10);

                userRows.push({ n, email, hash, inst, refCode });
            }

            // ── 2. Bulk Insert Users ──────────────────────────────────
            const userValues = [];
            const userParams = [];
            let paramIdx = 1;

            for (const row of userRows) {
                // Schema (no username): email, password_hash, institution, whatsapp_number, role, referral_code, status
                userValues.push(
                    `($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, '0000000000', 'player', $${paramIdx+3}, 'active')`
                );
                userParams.push(row.email, row.hash, row.inst, row.refCode);
                paramIdx += 4;
            }

            const userQuery = `
                INSERT INTO users (email, password_hash, institution, whatsapp_number, role, referral_code, status)
                VALUES ${userValues.join(', ')}
                ON CONFLICT (email) DO UPDATE
                    SET password_hash  = EXCLUDED.password_hash,
                        status         = 'active'
                RETURNING id, email
            `;

            const userRes = await client.query(userQuery, userParams);
            const userRows2 = userRes.rows; // [{id, email}, ...]
            usersCreated += userRows2.length;

            // ── 3. Map email → participant number for alias/session ───
            // userRows and userRows2 are in insertion order (same order)
            if (userRows2.length > 0) {
                const partValues = [];
                const partParams = [];
                paramIdx = 1;

                for (let k = 0; k < userRows2.length; k++) {
                    const globalIndex = i + k;
                    const n           = globalIndex + 1;  // 1-based
                    const alias       = `PLAYER${n}`;     // e.g. PLAYER1, PLAYER215
                    const session     = sessions[globalIndex % sessions.length];
                    const joinedAt    = getJoinedAt(globalIndex, TOTAL_USERS);
                    const userId      = userRows2[k].id;

                    // Schema: tournament_id, user_id, status ('in'), session_preference, alias, joined_at
                    partValues.push(
                        `($${paramIdx}, $${paramIdx+1}, 'in', $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4})`
                    );
                    partParams.push(TOURNAMENT_ID, userId, session, alias, joinedAt);
                    paramIdx += 5;
                }

                const partQuery = `
                    INSERT INTO participants (tournament_id, user_id, status, session_preference, alias, joined_at)
                    VALUES ${partValues.join(', ')}
                    ON CONFLICT DO NOTHING
                `;

                const partRes = await client.query(partQuery, partParams);
                participantsCreated += partRes.rowCount;
            }

            const progress = Math.min(i + currentBatch, TOTAL_USERS);
            const pct = ((progress / TOTAL_USERS) * 100).toFixed(1);
            process.stdout.write(
                `\r  Progress: ${progress}/${TOTAL_USERS} (${pct}%) | Users: ${usersCreated} | Participants: ${participantsCreated}`
            );

            if (i + currentBatch < TOTAL_USERS) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }

        } catch (batchError) {
            console.error(`\n❌ Batch ${i}–${i + currentBatch} failed:`, batchError.message);
        }
    }

    // ── Also update tournament_joined count for seeded users ─────
    console.log('\n\n🔄 Updating tournament_joined count for seeded users...');
    await client.query(`
        UPDATE users u
        SET tournament_joined = COALESCE(tournament_joined, 0) + 1
        FROM participants p
        WHERE p.user_id = u.id
          AND p.tournament_id = $1
          AND u.email LIKE 'p%@playincognito.ng'
          AND COALESCE(u.tournament_joined, 0) = 0
    `, [TOURNAMENT_ID]);
    console.log('   ✅ tournament_joined updated.');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉  Seeding Complete!');
    console.log(`    Users created/updated  : ${usersCreated}`);
    console.log(`    Participants added     : ${participantsCreated}`);
    console.log(`    Time elapsed           : ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════');

    // ── Verify: joined_at distribution ───────────────────────────
    const distRes = await client.query(`
        SELECT
            DATE(p.joined_at) AS join_date,
            COUNT(*)          AS count
        FROM participants p
        WHERE p.tournament_id = $1
          AND p.status = 'in'
        GROUP BY DATE(p.joined_at)
        ORDER BY join_date
    `, [TOURNAMENT_ID]);

    console.log(`\n📊  joined_at distribution for tournament ${TOURNAMENT_ID}:`);
    for (const row of distRes.rows) {
        const bar = '█'.repeat(Math.ceil(parseInt(row.count) / 5));
        console.log(`    ${row.join_date.toISOString().split('T')[0]} : ${row.count.toString().padStart(4)}  ${bar}`);
    }

    // ── Verify: total participants ────────────────────────────────
    const totalRes = await client.query(
        "SELECT COUNT(*) FROM participants WHERE tournament_id = $1 AND status = 'in'",
        [TOURNAMENT_ID]
    );
    console.log(`\n    Total 'in' participants: ${totalRes.rows[0].count}`);

    // ── Sample: show first 10 seeded users ───────────────────────
    const sampleRes = await client.query(`
        SELECT u.email, p.alias, p.session_preference, p.status, p.joined_at
        FROM participants p
        JOIN users u ON p.user_id = u.id
        WHERE p.tournament_id = $1
          AND u.email LIKE 'p%@playincognito.ng'
        ORDER BY p.joined_at ASC
        LIMIT 10
    `, [TOURNAMENT_ID]);

    console.log('\n📋  Sample of first 10 seeded participants:');
    console.log('    Email                    | Alias      | Session   | Status');
    console.log('    ─────────────────────────┼────────────┼───────────┼───────');
    for (const r of sampleRes.rows) {
        console.log(
            `    ${r.email.padEnd(24)} | ${r.alias.padEnd(10)} | ${(r.session_preference || 'N/A').padEnd(9)} | ${r.status}`
        );
    }

    client.release();
    await pool.end();
}

seed().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
