import { pool } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

const checkAdmin = async () => {
    try {
        const res = await pool.query("SELECT id, username, email, role, password_hash FROM users WHERE email = 'admin@incognito.com'");
        if (res.rows.length > 0) {
            console.log("✅ Admin found:", res.rows[0]);
        } else {
            console.log("❌ Admin NOT found");
        }
    } catch (error) {
        console.error("Error checking admin:", error);
    } finally {
        pool.end();
    }
};

checkAdmin();
