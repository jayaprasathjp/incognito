import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyUpdates() {
  console.log('Applying schema updates...');
  
  try {
    const updatesPath = path.resolve(__dirname, '../updates.sql');
    const updatesSql = fs.readFileSync(updatesPath, 'utf8');
    
    await pool.query(updatesSql);
    console.log('Schema updates applied successfully.');
  } catch (err) {
    console.error('Error applying updates:', err);
  } finally {
    pool.end();
  }
}

applyUpdates();
