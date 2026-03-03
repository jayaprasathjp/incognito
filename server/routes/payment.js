import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Initialize Payment — creates a tx_ref and returns config for Flutterwave inline
router.post("/initialize", authenticateToken, async (req, res) => {
    const { tournament_id, session_preference } = req.body;
    const userId = req.user.id;

    try {
        // 1. Validate tournament
        const tournamentRes = await pool.query("SELECT * FROM tournaments WHERE id = $1", [tournament_id]);
        if (tournamentRes.rows.length === 0) {
            return res.status(404).json({ error: "Tournament not found" });
        }

        const tournament = tournamentRes.rows[0];

        if (tournament.status !== 'open') {
            return res.status(400).json({ error: "Tournament is not open for registration" });
        }

        // 2. Check registration window
        const now = new Date();
        const regStart = tournament.registration_start ? new Date(tournament.registration_start) : null;
        const regEnd = tournament.registration_end ? new Date(tournament.registration_end) : null;

        if (regStart && now < regStart) {
            return res.status(400).json({ error: "Registration has not started yet" });
        }
        if (regEnd && now > regEnd) {
            return res.status(400).json({ error: "Registration has ended" });
        }

        // 3. Check if already joined
        const existingParticipant = await pool.query(
            "SELECT * FROM participants WHERE tournament_id = $1 AND user_id = $2",
            [tournament_id, userId]
        );
        if (existingParticipant.rows.length > 0) {
            return res.status(400).json({ error: "Already joined this tournament" });
        }

        // 5. Get user details for Flutterwave
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userRes.rows[0];

        // 6. Generate unique tx_ref
        const tx_ref = `INCOG-${tournament_id}-${userId}-${Date.now()}`;
        const amount = parseFloat(tournament.entry_fee) || 0;

        // 7. Check for developer bypass
        if (process.env.PAYMENT_BYPASS === 'true') {
            // Dev mode: skip payment, join directly
            await pool.query(
                "INSERT INTO participants (tournament_id, user_id, status, session_preference) VALUES ($1, $2, 'approved', $3)",
                [tournament_id, userId, session_preference || null]
            );

            // Record a bypassed payment
            await pool.query(
                "INSERT INTO payments (user_id, tournament_id, amount, status, reference, flw_transaction_id) VALUES ($1, $2, $3, 'completed', $4, 'BYPASS')",
                [userId, tournament_id, amount, tx_ref]
            );

            return res.json({ 
                status: "bypass", 
                message: "Payment bypassed (dev mode). Tournament joined successfully." 
            });
        }

        // 8. Save pending payment record
        await pool.query(
            "INSERT INTO payments (user_id, tournament_id, amount, status, reference) VALUES ($1, $2, $3, 'pending', $4)",
            [userId, tournament_id, amount, tx_ref]
        );

        // 9. Return payment config for frontend Flutterwave inline
        res.json({
            status: "pay",
            config: {
                tx_ref,
                amount,
                currency: "NGN",
                customer: {
                    email: user.email,
                    name: user.username
                },
                meta: {
                    tournament_id,
                    user_id: userId,
                    session_preference: session_preference || null
                }
            }
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: "Already joined this tournament" });
        }
        console.error("Payment initialization error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Verify Payment — called after Flutterwave inline returns success
router.post("/verify", authenticateToken, async (req, res) => {
    const { transaction_id, tx_ref, session_preference } = req.body;
    const userId = req.user.id;

    try {
        // 1. Find the pending payment
        const paymentRes = await pool.query(
            "SELECT * FROM payments WHERE reference = $1 AND user_id = $2",
            [tx_ref, userId]
        );

        if (paymentRes.rows.length === 0) {
            return res.status(404).json({ error: "Payment record not found" });
        }

        const payment = paymentRes.rows[0];

        if (payment.status === 'completed') {
            return res.status(400).json({ error: "Payment already verified" });
        }

        // 2. Verify with Flutterwave API
        const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
        console.log('[DEBUG] FLW_SECRET_KEY loaded:', FLW_SECRET_KEY ? 'YES (' + FLW_SECRET_KEY.substring(0, 15) + '...)' : 'NO');
        
        if (!FLW_SECRET_KEY) {
            console.error("FLW_SECRET_KEY not set! Check your server .env file and restart the server.");
            return res.status(500).json({ error: "Payment verification unavailable" });
        }

        const verifyResponse = await fetch(
            `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`
                }
            }
        );

        const verifyData = await verifyResponse.json();

        if (
            verifyData.status === "success" &&
            verifyData.data.status === "successful" &&
            verifyData.data.tx_ref === tx_ref &&
            parseFloat(verifyData.data.amount) >= parseFloat(payment.amount) &&
            verifyData.data.currency === "NGN"
        ) {
            // 3. Payment verified! Update payment record
            await pool.query(
                "UPDATE payments SET status = 'completed', flw_transaction_id = $1 WHERE id = $2",
                [String(transaction_id), payment.id]
            );

            // 4. Join the tournament
            await pool.query(
                "INSERT INTO participants (tournament_id, user_id, status, session_preference) VALUES ($1, $2, 'approved', $3)",
                [payment.tournament_id, userId, session_preference || null]
            );

            return res.json({ status: "success", message: "Payment verified. Tournament joined!" });
        } else {
            // Payment failed verification
            await pool.query(
                "UPDATE payments SET status = 'failed', flw_transaction_id = $1 WHERE id = $2",
                [String(transaction_id), payment.id]
            );

            return res.status(400).json({ 
                error: "Payment verification failed", 
                details: verifyData.data?.status || verifyData.message 
            });
        }

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: "Already joined this tournament" });
        }
        console.error("Payment verification error:", error);
        res.status(500).json({ error: "Server error during verification" });
    }
});

export default router;
