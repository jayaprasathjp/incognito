
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
const TOURNAMENT_ID = 34;        // <-- Change to your target tournament ID
const TOTAL_USERS   = 1300;
const BATCH_SIZE    = 25;
const BATCH_DELAY   = 500;       // ms between batches
// ─────────────────────────────────────────────────────

// Generate a random joined_at timestamp spread over the last 7 days
// Earlier joiners = lower index, later joiners = higher index
// This gives a realistic spread for testing early-pass access
function getJoinedAt(index, total) {
    const now = new Date();
    // Spread joins over 7 days: first user joined 7 days ago, last user joined just now
    const SPREAD_DAYS = 7;
    const totalMs = SPREAD_DAYS * 24 * 60 * 60 * 1000;
    
    // Linear spread + small random jitter (±30 min)
    const baseOffset = totalMs - (index / total) * totalMs;
    const jitter = (Math.random() - 0.5) * 60 * 60 * 1000; // ±30 min
    const joinedAt = new Date(now.getTime() - baseOffset + jitter);
    
    return joinedAt.toISOString();
}

async function seed() {
    console.log("═══════════════════════════════════════════════════");
    console.log(`🌱  Seeding ${TOTAL_USERS} participants with varied joined_at`);
    console.log(`    Tournament ID : ${TOURNAMENT_ID}`);
    console.log(`    Batch size    : ${BATCH_SIZE}`);
    console.log(`    Time spread   : 7 days (earliest → most recent)`);
    console.log("═══════════════════════════════════════════════════\n");

    if (connectionConfig.connectionString) {
        console.log("Connecting via:", connectionConfig.connectionString.replace(/:[^:@]+@/, ':***@')); 
    } else {
        console.log("Connecting to host:", connectionConfig.host);
    }

    const client = await pool.connect();
    console.log("✅ Connected to database.\n");

    await client.query('SET statement_timeout = 120000');

    // ── Step 0: Ensure joined_at column exists ─────────────
    console.log("📐 Ensuring joined_at column exists on participants...");
    await client.query(`
        ALTER TABLE participants 
        ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);
    console.log("   ✅ joined_at column ready.\n");

    // Pre-hash one password for all dummy users
    const passwordHash = await bcrypt.hash('password123', 10);

    const institutions = ['CyberUnilag', 'TechU', 'VarsityFC', 'PolyTech', 'StateUni', 'FederalCollege', 'MetroAcademy'];
    const sessions     = ['morning', 'afternoon', 'evening'];

    let usersCreated = 0;
    let participantsCreated = 0;

    const startTime = Date.now();

    for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
        const currentBatch = Math.min(BATCH_SIZE, TOTAL_USERS - i);
        
        try {
            // ── 1. Bulk Insert Users ──────────────────────────
            const userValues = [];
            const userParams = [];
            let paramIdx = 1;

            for (let j = 0; j < currentBatch; j++) {
                const num = i + j;
                const username = `player_${num}`;
                const email = `player_${num}@testincognito.com`;
                const referral = `REF_PLAYER_${num}`;
                const inst = institutions[num % institutions.length];

                userValues.push(
                    `($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, '0000000000', 'player', $${paramIdx+4})`
                );
                userParams.push(username, email, passwordHash, inst, referral);
                paramIdx += 5;
            }

            const userQuery = `
                INSERT INTO users (username, email, password_hash, institution, whatsapp_number, role, referral_code) 
                VALUES ${userValues.join(", ")}
                ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
                RETURNING id
            `;

            const userRes = await client.query(userQuery, userParams);
            const userIds = userRes.rows.map(r => r.id);
            usersCreated += userIds.length;

            // ── 2. Bulk Insert Participants with varied joined_at ──
            if (userIds.length > 0) {
                const partValues = [];
                const partParams = [];
                paramIdx = 1;

                for (let k = 0; k < userIds.length; k++) {
                    const globalIndex = i + k;
                    const session = sessions[globalIndex % sessions.length];
                    const joinedAt = getJoinedAt(globalIndex, TOTAL_USERS);

                    partValues.push(
                        `($${paramIdx}, $${paramIdx+1}, 'approved', $${paramIdx+2}, $${paramIdx+3})`
                    );
                    partParams.push(TOURNAMENT_ID, userIds[k], session, joinedAt);
                    paramIdx += 4;
                }

                const partQuery = `
                    INSERT INTO participants (tournament_id, user_id, status, session_preference, joined_at) 
                    VALUES ${partValues.join(", ")}
                    ON CONFLICT DO NOTHING
                `;

                const partRes = await client.query(partQuery, partParams);
                participantsCreated += partRes.rowCount;
            }

            const progress = Math.min(i + currentBatch, TOTAL_USERS);
            const pct = ((progress / TOTAL_USERS) * 100).toFixed(1);
            process.stdout.write(`\r  Progress: ${progress}/${TOTAL_USERS} (${pct}%) | Users: ${usersCreated} | Participants: ${participantsCreated}`);

            if (i + currentBatch < TOTAL_USERS) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }

        } catch (batchError) {
            console.error(`\n❌ Batch ${i}-${i + currentBatch} failed:`, batchError.message);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n\n═══════════════════════════════════════════════════");
    console.log("🎉  Seeding Complete!");
    console.log(`    Users created/updated  : ${usersCreated}`);
    console.log(`    Participants added     : ${participantsCreated}`);
    console.log(`    Time elapsed           : ${elapsed}s`);
    console.log("═══════════════════════════════════════════════════");

    // Verify: show joined_at distribution
    const distRes = await client.query(`
        SELECT 
            DATE(joined_at) as join_date, 
            COUNT(*) as count 
        FROM participants 
        WHERE tournament_id = $1 AND status = 'approved'
        GROUP BY DATE(joined_at) 
        ORDER BY join_date
    `, [TOURNAMENT_ID]);

    console.log(`\n📊  joined_at distribution for tournament ${TOURNAMENT_ID}:`);
    for (const row of distRes.rows) {
        const bar = '█'.repeat(Math.ceil(parseInt(row.count) / 10));
        console.log(`    ${row.join_date.toISOString().split('T')[0]} : ${row.count.toString().padStart(4)} ${bar}`);
    }

    const totalRes = await client.query(
        "SELECT COUNT(*) FROM participants WHERE tournament_id = $1 AND status = 'approved'",
        [TOURNAMENT_ID]
    );
    console.log(`\n    Total approved: ${totalRes.rows[0].count}`);

    client.release();
    pool.end();
}

seed().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
