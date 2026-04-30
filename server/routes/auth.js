import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    const { username, email, password, institution, whatsapp_number, referralCode } = req.body;
    try {
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return res.status(400).json({ error: "Alias must be alphanumeric. No spaces or special characters allowed." });
        }

        if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ error: "Password must be at least 6 characters and contain both letters and numbers" });
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
            try {
                // Check which field caused the conflict
                const checkUsername = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
                if (checkUsername.rows.length > 0) {
                    return res.status(400).json({ error: "This alias is already taken", field: "alias" });
                }
                const checkEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
                if (checkEmail.rows.length > 0) {
                    return res.status(400).json({ error: "This email is already registered", field: "email" });
                }
            } catch (checkError) {
                console.error("Conflict check error:", checkError);
            }
            return res.status(400).json({ error: "Alias or email already exists" });
        }
        console.error("Registration error:", error);
        res.status(500).json({ error: "Server error during registration" });
    }
});



// Login
router.post("/login", async (req, res) => {
    try {
        const { email, identifier, password } = req.body;
        // Support both "email" (legacy/standard) and "identifier" (new admin login)
        const loginTerm = identifier || email;

        if (!loginTerm) return res.status(400).json({ error: "Email or username required" });

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 OR username = $1", 
            [loginTerm]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (user.status === 'banned') {
            return res.status(403).json({ error: "Your account has been banned." });
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

// Forgot Password
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(404).json({ error: "No account found with that email address." });
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await pool.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3",
            [resetToken, resetPasswordExpires, email]
        );

        // Use environment variable for frontend URL, fallback to localhost
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        const message = `
            <h1>Password Reset Request</h1>
            <p>You have requested to reset your password.</p>
            <p>Please click on the following link to verify your email and set a new password:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `;

        try {
            await sendEmail({
                to: email,
                subject: "Password Reset Request",
                html: message,
            });

            res.status(200).json({ message: "Success! A password reset link has been sent to your email." });
        } catch (error) {
            await pool.query(
                "UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1",
                [email]
            );
            console.error(error);
            return res.status(500).json({ error: "Email could not be sent" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Reset Password
router.post("/reset-password/:resetToken", async (req, res) => {
    try {
        const { resetToken } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ error: "Password must be at least 6 characters and contain both letters and numbers" });
        }

        // Note: In production, verify if reset_password_expires is stored as BigInt (need handling) or BigInt string
        // Postgres BIGINT returns as string in node-postgres usually, or we cast.
        // Let's use a query that handles the comparison in SQL for safety
        
        const user = await pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
            [resetToken, Date.now()]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
            [hashedPassword, user.rows[0].id]
        );

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
