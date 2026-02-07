import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const oldDbUrl = process.env.OLD_DATABASE_URL;
const newDbUrl = process.env.DATABASE_URL;

if (!oldDbUrl || !newDbUrl) {
  console.error("Error: Both OLD_DATABASE_URL and DATABASE_URL must be set in .env");
  process.exit(1);
}

const oldPool = new Pool({
  connectionString: oldDbUrl,
});

const newPool = new Pool({
  connectionString: newDbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

const tables = [
  "users",
  "tournaments",
  "participants",
  "matches",
  "bank_details",
  "referrals",
];

async function migrateTable(tableName) {
  console.log(`Migrating table: ${tableName}...`);
  try {
    const { rows } = await oldPool.query(`SELECT * FROM ${tableName}`);
    console.log(`Fetched ${rows.length} rows from ${tableName}`);

    if (rows.length === 0) return;

    const columns = Object.keys(rows[0]);
    const columnsList = columns.map((col) => `"${col}"`).join(", "); // Quote identifiers
    
    // Construct parameterized query
    // ($1, $2, ...), ($x, $y, ...)
    const valuesList = [];
    const flattenedValues = [];
    
    // We'll insert one by one or in small batches to avoid query parameter limits if many rows
    // For simplicity, let's insert one by one to handle potential errors gracefully and debugging
    // Or simpler: generate INSERT statement for each row.
    
    for (const row of rows) {
         const rowValues = columns.map(col => row[col]);
         const placeholders = rowValues.map((_, i) => `$${i + 1}`).join(", ");
         
         const query = `INSERT INTO ${tableName} (${columnsList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`; // Assuming ID primary key might conflict if re-run
         
         // Note: ON CONFLICT DO NOTHING implies we strictly rely on ID. 
         // If table doesn't have ID as primary key or unique constraint, this might duplicate in some SQL flavors, 
         // but here we are migrating to empty DB mostly.
         
         try {
             await newPool.query(query, rowValues);
         } catch (err) {
             console.error(`Error inserting row into ${tableName}:`, err.message);
         }
    }

    console.log(`Finished migrating ${tableName}`);
  } catch (error) {
    console.error(`Error migrating ${tableName}:`, error);
  }
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log("Starting migration...");
    
    try {
        // Test connections
        await oldPool.query('SELECT 1');
        console.log("Connected to Old DB");
        await newPool.query('SELECT 1');
        console.log("Connected to New DB");

        // Apply Schema
        console.log("Applying schema to New DB...");
        const schemaPath = path.resolve(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await newPool.query(schemaSql);
        console.log("Schema applied successfully.");
        
    } catch (err) {
        console.error("Connection/Schema failed:", err);
        process.exit(1);
    }
    
    for (const table of tables) {
        await migrateTable(table);
    }

    console.log("Migration completed.");
    oldPool.end();
    newPool.end();
}

migrate();
