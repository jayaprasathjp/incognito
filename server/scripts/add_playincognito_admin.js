import "dotenv/config";
import { pool } from "../db.js";
import bcrypt from "bcryptjs";

const addPlayIncognitoAdmin = async () => {
    try {
        console.log("🔄 Provisioning playincognito admin user...");
        const passwordHash = await bcrypt.hash("admin", 10);
        
        // Use an upsert query to ensure it creates or updates the admin
        const res = await pool.query(
            `INSERT INTO users (email, password_hash, role, institution, referral_code, status) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (email) 
             DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, status = EXCLUDED.status
             RETURNING id, email, role, status`,
            ["admin@playincognito.ng", passwordHash, "admin", "HQ", "REF-ADMIN-PLAY", "active"]
        );

        if (res.rows.length > 0) {
            console.log("✅ Admin credentials provisioned successfully!");
            console.log("User details:", res.rows[0]);
        } else {
            console.log("⚠️ Could not provision admin credentials.");
        }
    } catch (error) {
        console.error("❌ Error provisioning admin:", error);
    } finally {
        pool.end();
    }
};

addPlayIncognitoAdmin();
