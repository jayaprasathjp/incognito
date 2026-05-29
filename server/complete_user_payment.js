import "dotenv/config";
import { pool } from "./db.js";

const args = process.argv.slice(2);
const emailInput = args[0];
const aliasInput = args[1];
const sessionInput = args[2] || "morning";

if (!emailInput || !aliasInput) {
    console.error("❌ Usage: node complete_user_payment.js <email> <alias> [session]");
    console.error("Example: node complete_user_payment.js goodnesv37@gmail.com SHIELD_AGENT morning");
    process.exit(1);
}

const email = emailInput.trim();
let alias = aliasInput.trim().toUpperCase();
const session = sessionInput.trim().toLowerCase();

(async () => {
    console.log(`🚀 Starting manual payment completion for: ${email}`);
    console.log(`Parameters: Alias="${alias}", SessionPreference="${session}"`);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Find user by email
        const userRes = await client.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        if (userRes.rows.length === 0) {
            throw new Error(`User not found with email: ${email}`);
        }
        const userId = userRes.rows[0].id;

        // 2. Find pending payment
        const paymentRes = await client.query(
            "SELECT * FROM payments WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
            [userId]
        );

        if (paymentRes.rows.length === 0) {
            // Check if already completed
            const completedRes = await client.query(
                "SELECT * FROM payments WHERE user_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
                [userId]
            );
            if (completedRes.rows.length > 0) {
                console.log(`ℹ️ Payment already marked as completed for user (ID: ${userId}). Reference: ${completedRes.rows[0].reference}`);
            } else {
                throw new Error(`No pending payment record found for user (ID: ${userId}).`);
            }
        }

        const payment = paymentRes.rows[0] || {};
        const tournamentId = payment.tournament_id || 37; // fallback to latest tournament ID if no payment record exists
        const paymentId = payment.id;

        console.log(`🔍 User ID: ${userId}, Tournament ID: ${tournamentId}`);

        // 3. Register user in participants table
        const participantCheck = await client.query(
            "SELECT id FROM participants WHERE tournament_id = $1 AND user_id = $2",
            [tournamentId, userId]
        );

        if (participantCheck.rows.length > 0) {
            console.log(`ℹ️ User is already in participants table for this tournament.`);
        } else {
            // Verify alias is unique, append numbers if taken
            const aliasCheck = await client.query(
                "SELECT id FROM participants WHERE tournament_id = $1 AND LOWER(alias) = LOWER($2)",
                [tournamentId, alias]
            );
            if (aliasCheck.rows.length > 0) {
                const newAlias = `${alias}${Math.floor(100 + Math.random() * 900)}`;
                console.warn(`⚠️ Alias "${alias}" already exists. Using alternative "${newAlias}" to avoid errors.`);
                alias = newAlias;
            }

            await client.query(
                "INSERT INTO participants (tournament_id, user_id, status, session_preference, alias) VALUES ($1, $2, 'in', $3, $4)",
                [tournamentId, userId, session, alias]
            );
            console.log(`🎉 Successfully added user to participants table!`);
        }

        // 4. Update payment status to completed
        if (paymentId) {
            await client.query(
                "UPDATE payments SET status = 'completed', flw_transaction_id = 'MANUAL_RECOVER' WHERE id = $1",
                [paymentId]
            );
            console.log(`💳 Updated payment record ${paymentId} to status='completed'.`);
        } else {
            // Create completed payment row if missing entirely
            const tx_ref = `MANUAL-${tournamentId}-${userId}-${Date.now()}`;
            await client.query(
                "INSERT INTO payments (user_id, tournament_id, amount, status, reference, flw_transaction_id) VALUES ($1, $2, 446.00, 'completed', $3, 'MANUAL_RECOVER')",
                [userId, tournamentId, tx_ref]
            );
            console.log(`💳 Created completed payment record in database.`);
        }

        // 5. Activate user and increment tournament count
        await client.query(
            "UPDATE users SET tournament_joined = tournament_joined + 1, status = 'active' WHERE id = $1 AND status != 'banned'",
            [userId]
        );
        console.log(`👤 Activated user account and incremented tournament count.`);

        await client.query("COMMIT");
        console.log(`🚀 MANUAL RECOVERY COMPLETED SUCCESSFULLY FOR ${email}!`);
    } catch (e) {
        await client.query("ROLLBACK");
        console.error(`❌ DB Manual Recovery Failed:`, e.message);
    } finally {
        client.release();
        pool.end();
    }
})();
