import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Initialize Payment — creates a tx_ref and returns config for Flutterwave inline
router.post("/initialize", authenticateToken, async (req, res) => {
    const { tournament_id, session_preference, alias } = req.body;
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

        // Validate alias
        if (!alias || !alias.trim()) {
            return res.status(400).json({ error: "Alias is required to join a tournament" });
        }
        if (!/^[A-Z0-9]+$/.test(alias.trim())) {
            return res.status(400).json({ error: "Alias must be uppercase alphanumeric. No spaces or special characters allowed." });
        }
        if (alias.trim().length < 3 || alias.trim().length > 20) {
            return res.status(400).json({ error: "Alias must be between 3 and 20 characters." });
        }

        // 2. Check registration window (date-only comparison to avoid timezone issues)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (tournament.registration_start) {
            const regStart = new Date(tournament.registration_start);
            const regStartDate = new Date(regStart.getFullYear(), regStart.getMonth(), regStart.getDate());
            if (today < regStartDate) {
                return res.status(400).json({ error: "Registration has not started yet" });
            }
        }
        if (tournament.registration_end) {
            const regEnd = new Date(tournament.registration_end);
            const regEndDate = new Date(regEnd.getFullYear(), regEnd.getMonth(), regEnd.getDate());
            if (today > regEndDate) {
                return res.status(400).json({ error: "Registration has ended" });
            }
        }

        // 3. Check if already joined
        const existingParticipant = await pool.query(
            "SELECT * FROM participants WHERE tournament_id = $1 AND user_id = $2",
            [tournament_id, userId]
        );
        if (existingParticipant.rows.length > 0) {
            return res.status(400).json({ error: "Already joined this tournament" });
        }

        // Check alias uniqueness within this tournament
        const aliasCheck = await pool.query(
            "SELECT id FROM participants WHERE tournament_id = $1 AND LOWER(alias) = LOWER($2)",
            [tournament_id, alias.trim()]
        );
        if (aliasCheck.rows.length > 0) {
            return res.status(400).json({ error: "This alias is already taken in this tournament. Please choose another." });
        }

        // 5. Get user details for Flutterwave
        const userRes = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userRes.rows[0];

        // 6. Generate unique tx_ref
        const tx_ref = `INCOG-${tournament_id}-${userId}-${Date.now()}`;
        const amount = parseFloat(tournament.entry_fee) || 0;

        // 7. Check for developer bypass (TEMPORARILY ALWAYS TRUE FOR FREE TOURNAMENT)
        if (true || process.env.PAYMENT_BYPASS === 'true') {
            // Dev mode / Free mode: skip payment, join directly
            await pool.query(
                "INSERT INTO participants (tournament_id, user_id, status, session_preference, alias) VALUES ($1, $2, 'in', $3, $4)",
                [tournament_id, userId, session_preference || null, alias.trim()]
            );

            // Increment permanent tournament count in users table and set status to active
            await pool.query(
                "UPDATE users SET tournament_joined = tournament_joined + 1, status = 'active' WHERE id = $1 AND status != 'banned'",
                [userId]
            );


            return res.json({ 
                status: "bypass", 
                message: "Tournament joined successfully!" 
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
                    email: user.email || `player${userId}@incognito.ng`,
                    name: alias.trim()
                },
                meta: {
                    tournament_id,
                    user_id: userId,
                    session_preference: session_preference || null,
                    alias: alias.trim()
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
    const { transaction_id, tx_ref, session_preference, alias } = req.body;
    const userId = req.user.id;

    console.log("[DEBUG] Verification parameters received:", {
        userId,
        transaction_id,
        tx_ref,
        session_preference,
        alias
    });

    if (!transaction_id || String(transaction_id).trim() === "" || String(transaction_id) === "undefined") {
        console.error("[ERROR] Payment verification request received with missing or invalid transaction_id.");
        return res.status(400).json({ error: "Invalid transaction ID" });
    }

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

        const targetUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
        console.log(`[DEBUG] Attempting to contact Flutterwave API at: ${targetUrl}`);

        const verifyResponse = await fetch(
            targetUrl,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`
                }
            }
        );

        const contentType = verifyResponse.headers.get("content-type") || "";
        let verifyData;

        if (contentType.includes("application/json")) {
            verifyData = await verifyResponse.json();
        } else {
            const rawBody = await verifyResponse.text();
            console.error(
                `[ERROR] Flutterwave verification returned a non-JSON response.\n` +
                `Status Code: ${verifyResponse.status}\n` +
                `Content-Type: ${contentType}\n` +
                `Response body preview (first 1000 chars):\n${rawBody.substring(0, 1000)}`
            );
            return res.status(502).json({
                error: "Payment verification failed",
                details: `Flutterwave API returned a non-JSON response with status code ${verifyResponse.status}.`
            });
        }

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
                "INSERT INTO participants (tournament_id, user_id, status, session_preference, alias) VALUES ($1, $2, 'in', $3, $4)",
                [payment.tournament_id, userId, session_preference || null, alias ? alias.trim() : null]
            );

            // Increment permanent tournament count in users table and set status to active
            await pool.query(
                "UPDATE users SET tournament_joined = tournament_joined + 1, status = 'active' WHERE id = $1 AND status != 'banned'",
                [userId]
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

// Update payment status to 'cancelled' or 'failed' — called when user closes/cancels or payment fails
router.post("/update-status", authenticateToken, async (req, res) => {
    const { tx_ref, status } = req.body;
    const userId = req.user.id;

    const allowed = ['cancelled', 'failed'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        await pool.query(
            "UPDATE payments SET status = $1 WHERE reference = $2 AND user_id = $3 AND status = 'pending'",
            [status, tx_ref, userId]
        );
        res.json({ status: "ok" });
    } catch (error) {
        console.error("Payment status update error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Flutterwave Webhook Receiver — handles users who close the payment popup early
router.post("/webhook", async (req, res) => {
    // 1. Verify the signature hash to ensure this request genuinely came from Flutterwave
    const signature = req.headers["verif-hash"];
    const localHash = process.env.FLW_WEBHOOK_HASH || "incognito_flw_webhook_secret_2026";

    if (!signature || signature !== localHash) {
        console.warn("[WARNING] Webhook received with invalid or missing verification hash.");
        return res.status(401).send("Unauthorized");
    }

    const payload = req.body;
    console.log(`[DEBUG] Webhook received event: "${payload.event}"`);

    if (payload.event === "charge.completed" && payload.data) {
        const transaction = payload.data;

        if (transaction.status === "successful") {
            const tx_ref = transaction.tx_ref;
            const transaction_id = transaction.id;
            
            console.log(`[DEBUG] Processing successful webhook for reference: ${tx_ref}`);

            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                // Find the payment record in our DB
                const paymentRes = await client.query(
                    "SELECT * FROM payments WHERE reference = $1 FOR UPDATE",
                    [tx_ref]
                );

                if (paymentRes.rows.length === 0) {
                    console.warn(`[WARNING] Webhook paid reference "${tx_ref}" not found in payments table. Skipping.`);
                    await client.query("COMMIT");
                    return res.status(200).send("Reference not found");
                }

                const payment = paymentRes.rows[0];

                if (payment.status === "completed") {
                    console.log(`[DEBUG] Payment "${tx_ref}" was already verified and completed. Skipping duplicate registration.`);
                    await client.query("COMMIT");
                    return res.status(200).send("Already completed");
                }

                // Fetch full verified data from Flutterwave to guarantee metadata is present
                const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
                let finalMeta = transaction.meta || {};
                
                if (FLW_SECRET_KEY) {
                    try {
                        const targetUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
                        const verifyRes = await fetch(targetUrl, {
                            headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.status === 'success' && verifyData.data && verifyData.data.meta) {
                            finalMeta = verifyData.data.meta;
                        }
                    } catch (e) {
                        console.error("[ERROR] Failed to fetch transaction meta from flutterwave API in webhook:", e);
                    }
                }

                // Recover metadata
                let alias = finalMeta.alias || transaction.customer?.name || "PLAYER";
                let session_preference = finalMeta.session_preference || "morning";

                alias = String(alias).trim().toUpperCase();

                // 1. Update payment status to completed
                await client.query(
                    "UPDATE payments SET status = 'completed', flw_transaction_id = $1 WHERE id = $2",
                    [String(transaction_id), payment.id]
                );

                // 2. Double check if already registered in participants
                const participantCheck = await client.query(
                    "SELECT id FROM participants WHERE tournament_id = $1 AND user_id = $2",
                    [payment.tournament_id, payment.user_id]
                );

                if (participantCheck.rows.length > 0) {
                    console.log(`[DEBUG] User is already in participants table. Skipping duplicate insertion.`);
                } else {
                    // Check if alias is unique, append numbers if taken
                    let finalAlias = alias;
                    const aliasCheck = await client.query(
                        "SELECT id FROM participants WHERE tournament_id = $1 AND LOWER(alias) = LOWER($2)",
                        [payment.tournament_id, finalAlias]
                    );
                    if (aliasCheck.rows.length > 0) {
                        finalAlias = `${alias}${Math.floor(100 + Math.random() * 900)}`;
                        console.warn(`[WARNING] Alias "${alias}" taken. Assigned alternative "${finalAlias}".`);
                    }

                    // Insert participant
                    await client.query(
                        "INSERT INTO participants (tournament_id, user_id, status, session_preference, alias) VALUES ($1, $2, 'in', $3, $4)",
                        [payment.tournament_id, payment.user_id, session_preference || null, finalAlias]
                    );
                    console.log(`[DEBUG] Successfully inserted user ${payment.user_id} into participants table under alias "${finalAlias}".`);
                }

                // 3. Increment tournament_joined and activate user
                await client.query(
                    "UPDATE users SET tournament_joined = tournament_joined + 1, status = 'active' WHERE id = $1 AND status != 'banned'",
                    [payment.user_id]
                );

                await client.query("COMMIT");
                console.log(`🎉 Webhook processed and committed successfully for reference: ${tx_ref}`);
            } catch (dbErr) {
                await client.query("ROLLBACK");
                console.error(`[ERROR] Webhook DB transaction failed for reference "${tx_ref}":`, dbErr);
                return res.status(500).send("Database error");
            } finally {
                client.release();
            }
        }
    }

    // Always respond with a 200 OK so Flutterwave doesn't keep retrying the webhook
    return res.status(200).send("OK");
});

export default router;
