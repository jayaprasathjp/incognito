import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function debugLogin() {
    try {
        console.log("Debugging login...");
        const result = await pool.query("SELECT * FROM users WHERE email = 'admin@test.com'");
        if (result.rows.length === 0) {
            console.log("User not found");
            return;
        }
        
        const user = result.rows[0];
        console.log("User found:", user.email);
        console.log("Stored Hash:", user.password_hash);
        
        const password = "password";
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`Password '${password}' valid?`, isValid);
        
        // Also try hashing again to see if it matches format
        const newHash = await bcrypt.hash(password, 10);
        console.log("New Hash:", newHash);
        const isValidNew = await bcrypt.compare(password, newHash);
        console.log("New Hash valid?", isValidNew);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugLogin();
