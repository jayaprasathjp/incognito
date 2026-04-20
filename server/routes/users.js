import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";
import { ensureAnnouncementTables } from "../utils/announcementHelpers.js";

const router = express.Router();

// Get Current User (Profile + Referral Code + Stats)
router.get("/referral", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Ensure user has a referral code
        let userResult = await pool.query("SELECT referral_code FROM users WHERE id = $1", [userId]);
        let referralCode = userResult.rows[0].referral_code;

        if (!referralCode) {
            referralCode = "INC-" + crypto.randomBytes(3).toString("hex").toUpperCase();
            await pool.query("UPDATE users SET referral_code = $1 WHERE id = $2", [referralCode, userId]);
        }

        // 2. Get Stats
        const statsResult = await pool.query(
            "SELECT COUNT(*) as total_referrals FROM referrals WHERE referrer_id = $1", 
            [userId]
        );
        
        res.json({
            referralCode,
            totalReferrals: parseInt(statsResult.rows[0].total_referrals) || 0,
            rewardsEarned: 0 // Placeholder logic for now
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Get Bank Details
router.get("/bank-details", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM bank_details WHERE user_id = $1", [req.user.id]);
        if (result.rows.length === 0) return res.json({});
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Upsert Bank Details
router.post("/bank-details", authenticateToken, async (req, res) => {
    const { account_name, account_number, bank_name } = req.body;
    try {
        const check = await pool.query("SELECT id FROM bank_details WHERE user_id = $1", [req.user.id]);
        
        if (check.rows.length > 0) {
            // Update
            const update = await pool.query(
                `UPDATE bank_details 
                 SET account_name = $1, account_number = $2, bank_name = $3, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $4 RETURNING *`,
                [account_name, account_number, bank_name, req.user.id]
            );
            res.json(update.rows[0]);
        } else {
            // Insert
            const insert = await pool.query(
                `INSERT INTO bank_details (user_id, account_name, account_number, bank_name) 
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [req.user.id, account_name, account_number, bank_name]
            );
            res.json(insert.rows[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/announcements/unread-count", authenticateToken, async (req, res) => {
    try {
        await ensureAnnouncementTables();

        const result = await pool.query(
            `SELECT COUNT(*)::int AS unread_count
             FROM announcement_recipients
             WHERE user_id = $1
               AND read_at IS NULL`,
            [req.user.id]
        );

        res.json({ count: result.rows[0]?.unread_count || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/announcements", authenticateToken, async (req, res) => {
    try {
        await ensureAnnouncementTables();

        const [announcementsResult, unreadCountResult] = await Promise.all([
            pool.query(
                `SELECT a.id,
                        a.message,
                        a.audience_type,
                        a.created_at,
                        a.tournament_id,
                        t.title AS tournament_title,
                        ar.read_at,
                        creator.username AS created_by_username
                 FROM announcement_recipients ar
                 JOIN announcements a ON a.id = ar.announcement_id
                 LEFT JOIN tournaments t ON t.id = a.tournament_id
                 LEFT JOIN users creator ON creator.id = a.created_by
                 WHERE ar.user_id = $1
                 ORDER BY a.created_at DESC`,
                [req.user.id]
            ),
            pool.query(
                `SELECT COUNT(*)::int AS unread_count
                 FROM announcement_recipients
                 WHERE user_id = $1
                   AND read_at IS NULL`,
                [req.user.id]
            ),
        ]);

        res.json({
            announcements: announcementsResult.rows,
            unreadCount: unreadCountResult.rows[0]?.unread_count || 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/announcements/read-all", authenticateToken, async (req, res) => {
    try {
        await ensureAnnouncementTables();

        const result = await pool.query(
            `UPDATE announcement_recipients
             SET read_at = COALESCE(read_at, NOW())
             WHERE user_id = $1
               AND read_at IS NULL`,
            [req.user.id]
        );

        res.json({ updatedCount: result.rowCount || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
