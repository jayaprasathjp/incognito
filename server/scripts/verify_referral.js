import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const API_URL = 'http://localhost:5000/api/auth';

const cleanupQuery = `
  DELETE FROM referrals 
  WHERE referrer_id IN (SELECT id FROM users WHERE email IN ('userA@test.com', 'userB@test.com'))
  OR referred_user_id IN (SELECT id FROM users WHERE email IN ('userA@test.com', 'userB@test.com'));
  DELETE FROM users 
  WHERE email IN ('userA@test.com', 'userB@test.com');
`;

async function runTest() {
  try {
    // 1. Cleanup
    console.log('Cleaning up old test data...');
    await pool.query(cleanupQuery);

    // 2. Register User A
    console.log('Registering User A...');
    const resA = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'UserA_Test',
        email: 'userA@test.com',
        password: 'password123',
        institution: 'Test Uni',
        whatsapp_number: '+1234567890'
      })
    });
    const userA = await resA.json();
    if (!resA.ok) throw new Error(`User A registration failed: ${JSON.stringify(userA)}`);
    console.log('User A created w/ referral code:', userA.referral_code);

    // 3. Register User B with User A's code
    console.log('Registering User B with referral code...');
    const resB = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'UserB_Test',
        email: 'userB@test.com',
        password: 'password123',
        institution: 'Test Uni',
        whatsapp_number: '+0987654321',
        referralCode: userA.referral_code
      })
    });
    const userB = await resB.json();
    if (!resB.ok) throw new Error(`User B registration failed: ${JSON.stringify(userB)}`);
    console.log('User B created.');

    // 4. Verify Database Link
    console.log('Verifying referral link in database...');
    const referralRes = await pool.query(
      'SELECT * FROM referrals WHERE referred_user_id = $1',
      [userB.id]
    );

    if (referralRes.rows.length === 0) {
      throw new Error('Referral record NOT found!');
    }

    const referral = referralRes.rows[0];
    if (referral.referrer_id === userA.id) {
      console.log('SUCCESS: Referral link verified correctly!');
    } else {
      throw new Error(`Referral mismatch! Expected referrer ${userA.id}, got ${referral.referrer_id}`);
    }

  } catch (err) {
    console.error('TEST FAILED:', err);
  } finally {
    // Cleanup again
    await pool.query(cleanupQuery);
    await pool.end();
  }
}

runTest();
