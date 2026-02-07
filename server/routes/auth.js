import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    try {
        const { username, email, password, institution, whatsapp_number, referralCode } = req.body;
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate a unique referral code for the new user
        // Simple strategy: random 8 char string or username + random
        const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Start a transaction to ensure both user creation and referral linking happen or neither
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert user
            const newUserResult = await client.query(
                "INSERT INTO users (username, email, password_hash, institution, whatsapp_number, role, referral_code) VALUES ($1, $2, $3, $4, $5, 'player', $6) RETURNING id, username, email, role, referral_code",
                [username, email, hashedPassword, institution, whatsapp_number, newReferralCode]
            );
            const newUser = newUserResult.rows[0];

            // Handle incoming referral code
            if (referralCode) {
                // Find referrer
                const referrerResult = await client.query("SELECT id FROM users WHERE referral_code = $1", [referralCode]);
                
                if (referrerResult.rows.length > 0) {
                    const referrerId = referrerResult.rows[0].id;
                    // Create referral record
                    await client.query(
                        "INSERT INTO referrals (referrer_id, referred_user_id) VALUES ($1, $2)",
                        [referrerId, newUser.id]
                    );
                }
                // If invalid code, we ignore it as it's optional
            }

            await client.query('COMMIT');
            res.status(201).json(newUser);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Username or email already exists" });
        }
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "24h" }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
