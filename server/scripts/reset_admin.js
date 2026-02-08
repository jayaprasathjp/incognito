import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const resetAdmin = async () => {
    try {
        console.log("🔄 Resetting admin credentials...");
        const passwordHash = await bcrypt.hash("password123", 10);
        
        // Update both by username and email to be sure
        const res = await pool.query(
            `UPDATE users 
             SET password_hash = $1, role = 'admin' 
             WHERE username = 'admin' OR email = 'admin@incognito.com'
             RETURNING id, username, email`,
            [passwordHash]
        );

        if (res.rows.length > 0) {
            console.log("✅ Admin credentials updated successfully!");
            console.log("User details:", res.rows[0]);
        } else {
            console.log("⚠️ Admin user not found. Creating one...");
            // Fallback: Create if not exists (though check_admin said it exists)
             const insert = await pool.query(
                `INSERT INTO users (username, email, password_hash, role, institution, referral_code) 
                 VALUES ($1, $2, $3, 'admin', 'HQ', 'REF-ADMIN') RETURNING id, username`,
                ['admin', 'admin@incognito.com', passwordHash]
            );
            console.log("✅ Admin user created:", insert.rows[0]);
        }
    } catch (error) {
        console.error("❌ Error resetting admin:", error);
    } finally {
        pool.end();
    }
};

resetAdmin();
