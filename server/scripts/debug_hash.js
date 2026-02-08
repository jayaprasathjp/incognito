import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const debugHash = async () => {
    try {
        const res = await pool.query("SELECT * FROM users WHERE username = 'admin'");
        if (res.rows.length === 0) {
            console.log("User not found");
            return;
        }
        const user = res.rows[0];
        console.log("User found:", user.username);
        console.log("Stored Hash:", user.password_hash);

        const input = "password123";
        const match = await bcrypt.compare(input, user.password_hash);
        console.log(`Comparing '${input}' with hash:`, match);
        
        // Re-hash to see if it matches format
        const newHash = await bcrypt.hash(input, 10);
        console.log("New Hash of input:", newHash);
        const matchNew = await bcrypt.compare(input, newHash);
        console.log("Compare with new hash:", matchNew);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        pool.end();
    }
};

debugHash();
