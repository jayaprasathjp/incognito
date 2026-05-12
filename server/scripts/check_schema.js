import "dotenv/config";
import { pool } from "../db.js";

(async () => {
  try {
    const tables = ['users', 'participants'];
    for (const table of tables) {
      const res = await pool.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = $1 
         ORDER BY ordinal_position;`,
        [table]
      );
      console.log(`\nTable Schema for: ${table}`);
      console.table(res.rows);
    }
  } catch (error) {
    console.error("Error fetching schema:", error);
  } finally {
    await pool.end();
  }
})();
