import { pool } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const createDisputesTable = async () => {
    try {
        console.log("Creating disputes table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS disputes (
                id SERIAL PRIMARY KEY,
                match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
                submitted_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                evidence_url VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Disputes table created successfully.");
    } catch (error) {
        console.error("❌ Error creating disputes table:", error);
    } finally {
        pool.end();
    }
};

createDisputesTable();
