
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

// Forgot Password
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await pool.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3",
            [resetToken, resetPasswordExpires, email]
        );

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

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

            res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
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
