import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    const { email, password, institution, whatsapp_number, referralCode } = req.body;
    try {
        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ error: "Password must be at least 6 characters and contain both letters and numbers" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate a unique referral code for the new user
        const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Start a transaction to ensure both user creation and referral linking happen or neither
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert user
            const newUserResult = await client.query(
                "INSERT INTO users (email, password_hash, institution, whatsapp_number, role, referral_code, status) VALUES ($1, $2, $3, $4, 'player', $5, 'inactive') RETURNING id, email, role, referral_code, status",
                [email, hashedPassword, institution || null, whatsapp_number || null, newReferralCode]
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
                // If invalid code, we ignore it
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
                const checkEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
                if (checkEmail.rows.length > 0) {
                    return res.status(400).json({ error: "This email is already registered", field: "email" });
                }
            } catch (checkError) {
                console.error("Conflict check error:", checkError);
            }
            return res.status(400).json({ error: "Email already exists" });
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

        if (!loginTerm) return res.status(400).json({ error: "Email is required" });

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1", 
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
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "24h" }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
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
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);" border="0" cellspacing="0" cellpadding="0">
                    <!-- Top Accent Header Bar -->
                    <tr>
                      <td height="6" style="background: linear-gradient(90deg, #6366f1 0%, #3b82f6 100%);"></td>
                    </tr>
                    <!-- Body Content -->
                    <tr>
                      <td style="padding: 40px 32px;">
                        <!-- Brand Header -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                          <tr>
                            <td align="center">
                              <span style="font-size: 22px; font-weight: 900; letter-spacing: 0.1em; color: #1e293b; text-transform: uppercase;">INCØGNITØ</span>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Icon Indicator -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                          <tr>
                            <td align="center">
                              <div style="width: 56px; height: 56px; line-height: 56px; border-radius: 18px; background-color: #e0e7ff; color: #4f46e5; font-size: 24px; text-align: center;">🔑</div>
                            </td>
                          </tr>
                        </table>

                        <!-- Main Title -->
                        <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; text-align: center; color: #0f172a; letter-spacing: -0.02em;">Reset Your Password</h2>
                        
                        <!-- Paragraph 1 -->
                        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; text-align: center; color: #475569;">
                          We received a request to reset the password for your Incognito account. No worries, we've got you covered!
                        </p>

                        <!-- Reset Button -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 14px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25); text-transform: uppercase; letter-spacing: 0.05em;" clicktracking="off">
                                Verify & Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>

                        <!-- Expiry Alert -->
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 12px 16px; font-size: 12px; line-height: 18px; color: #64748b; text-align: center;">
                              ⏳ This link is secure and will expire in <strong>1 hour</strong>.
                            </td>
                          </tr>
                        </table>

                        <!-- Paragraph 2 (Security) -->
                        <p style="margin: 0; font-size: 13px; line-height: 20px; text-align: center; color: #94a3b8;">
                          If you did not request this change, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Campus Esports League</p>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; 2026 INCØGNITØ. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
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
