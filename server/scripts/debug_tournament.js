import 'dotenv/config';
import { pool } from '../db.js';

async function debugTournament() {
  console.log('Debugging Tournament Table...');
  
  try {
    // 1. Inspect Column Types
    console.log('\n--- Column Types ---');
    const typeRes = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tournaments';
    `);
    console.table(typeRes.rows);

    // 2. Test Insert
    console.log('\n--- Testing Insert ---');
    const title = "Debug Tournament " + Date.now();
    const start = new Date();
    const end = new Date(Date.now() + 86400000); // +1 day
    const capacity = 64;
    const fee = 10.50;
    const prize = 640.00;

    const query = `
      INSERT INTO tournaments 
      (title, status, registration_start, registration_end, capacity, entry_fee, prize_pool, created_at) 
      VALUES ($1, 'open', $2, $3, $4, $5, $6, NOW()) 
      RETURNING *
    `;
    
    // Check if status is enum or text
    // We'll see if this throws
    const res = await pool.query(query, [title, start, end, capacity, fee, prize]);
    console.log('Insert Successful! Created ID:', res.rows[0].id);

    // Clean up
    await pool.query('DELETE FROM tournaments WHERE id = $1', [res.rows[0].id]);
    console.log('Cleaned up test record.');

  } catch (err) {
    console.error('Debug verify failed:', err);
    if (err.code) console.error('Error Code:', err.code);
    if (err.detail) console.error('Error Detail:', err.detail);
    if (err.hint) console.error('Error Hint:', err.hint);
  } finally {
    pool.end();
  }
}

debugTournament();
