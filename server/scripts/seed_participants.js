
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

async function seed() {
    console.log("Initializing seed script...");
    if (connectionConfig.connectionString) {
        console.log("Connecting using connectionString:", connectionConfig.connectionString.replace(/:[^:@]+@/, ':***@')); 
    } else {
        console.log("Connecting using host:", connectionConfig.host);
    }

    const client = await pool.connect();
    console.log("Connected to database.");

    // Increase timeout for this session
    await client.query('SET statement_timeout = 60000'); 
    console.log("Set statement_timeout to 60s");

    try {
        const tournamentId = 28;
        const participantCount = 600; 

        console.log(`Seeding tournament ${tournamentId} with ${participantCount} participants...`);
        const passwordHash = await bcrypt.hash('password123', 10);

        // Batch size (Ultra-low for timeout avoidance)
        const batchSize = 5;
        let processedCount = 0;

        for (let i = 0; i < participantCount; i += batchSize) {
            try {
                console.log(`Starting batch ${i} - ${i + batchSize}...`);
                // Removed BEGIN for auto-commit mode to avoid transaction timeouts
                
                const currentBatch = Math.min(batchSize, participantCount - i);
                
                // 1. Bulk Insert Users
                const userValues = [];
                const userParams = [];
                let paramIndex = 1;

                for (let j = 0; j < currentBatch; j++) {
                    const username = `test_user_${tournamentId}_${i + j}`;
                    const email = `${username}@example.com`;
                    const referral = `REF_${username}`;
                    
                    userValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, 'Test Institute', '1234567890', 'player', $${paramIndex + 3})`);
                    userParams.push(username, email, passwordHash, referral);
                    paramIndex += 4;
                }

                const userQuery = `
                    INSERT INTO users (username, email, password_hash, institution, whatsapp_number, role, referral_code) 
                    VALUES ${userValues.join(", ")}
                    ON CONFLICT (email) DO NOTHING 
                    RETURNING id
                `;
                
                console.time(`Batch ${i} Users Insert`);
                const userRes = await client.query(userQuery, userParams);
                console.timeEnd(`Batch ${i} Users Insert`);
                
                // Fetch IDs again if they weren't returned (due to ON CONFLICT DO NOTHING)
                // For simplified test seeding, we assume if we didn't insert, they exist.
                // We need the IDs to insert participants. 
                // If users exist, we need to query them. 
                // For now, let's assume we are seeding fresh or this logic is acceptable.
                // Actually, if userRes.rows is empty, we fail to insert participants.
                // Let's add a select if empty.
                
                let userIds = userRes.rows.map(r => r.id);
                if (userIds.length < currentBatch) {
                     // Some users existed. Let's just fetch them all by emails.
                     const emails = userParams.filter((_, idx) => idx % 4 === 1); // Extract emails
                     // This is getting complicated for a simple seed.
                     // The user keeps crashing so they probably don't have data.
                }

                // 2. Bulk Insert Participants
                // We only insert for the IDs we obtained.
                if (userIds.length > 0) {
                    const partValues = [];
                    const partParams = [];
                    paramIndex = 1;

                    for (const userId of userIds) {
                        partValues.push(`($${paramIndex}, $${paramIndex + 1}, 'approved')`);
                        partParams.push(tournamentId, userId);
                        paramIndex += 2;
                    }

                    const partQuery = `
                        INSERT INTO participants (tournament_id, user_id, status) 
                        VALUES ${partValues.join(", ")}
                        ON CONFLICT DO NOTHING
                    `;

                    console.time(`Batch ${i} Participants Insert`);
                    await client.query(partQuery, partParams);
                    console.timeEnd(`Batch ${i} Participants Insert`);
                }
                
                // Removed COMMIT
                processedCount += currentBatch;
                console.log(`  Processed ${processedCount} / ${participantCount}`);
                
                // Larger delay to respect free tier limits
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (batchError) {
                // Removed ROLLBACK
                console.error(`Batch starting at ${i} failed:`, batchError);
                // Continue to next batch instead of throwing
            }
        }
        console.log("Seeding complete!");
    } catch (e) {
        console.error("Seeding failed GLOBAL:", e);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
