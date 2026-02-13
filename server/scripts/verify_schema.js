import 'dotenv/config';
import { pool } from '../db.js';

async function verifySchema() {
  console.log('Verifying schema...');
  try {
    const res = await pool.query("SELECT * FROM tournaments LIMIT 1");
    // Even if no rows, we can check fields from the result object fields
    if (res.fields) {
        const columns = res.fields.map(f => f.name);
        console.log('Columns in tournaments table:', columns);
        
        const expected = ['registration_start', 'registration_end', 'capacity', 'entry_fee', 'prize_pool'];
        const missing = expected.filter(c => !columns.includes(c));
        
        if (missing.length === 0) {
            console.log('All expected columns are present.');
        } else {
            console.error('Missing columns:', missing);
        }
    } else {
        console.log('Could not retrieve fields.');
    }

  } catch (err) {
    console.error('Error verifying schema:', err);
  } finally {
    pool.end();
  }
}

verifySchema();
