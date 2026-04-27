import express from "express";
import { pool } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import crypto from "crypto";
import { ensureAnnouncementTables } from "../utils/announcementHelpers.js";

const router = express.Router();

// Get basic profile details
router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT username, email, whatsapp_number, institution FROM users WHERE id = $1", 
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

// Update basic profile details
router.put("/profile", authenticateToken, async (req, res) => {
    const { email, whatsapp_number, institution } = req.body;
    try {
        const update = await pool.query(
            `UPDATE users 
             SET email = $1, whatsapp_number = $2, institution = $3 
             WHERE id = $4 RETURNING username, email, whatsapp_number, institution`,
            [email, whatsapp_number, institution, req.user.id]
        );
        if (update.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(update.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // Unique violation usually for email
            return res.status(400).json({ error: "Email already exists" });
        }
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

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
             FROM announcements a
             WHERE a.target_user_ids IS NOT NULL
                             AND a.deleted_at IS NULL
               AND (
                    a.audience_type = 'all'
                    OR (
                        a.audience_type IN ('current_tournament', 'round')
                        AND a.tournament_id IS NOT NULL
                        AND EXISTS (
                            SELECT 1
                            FROM participants p
                            WHERE p.tournament_id = a.tournament_id
                              AND p.user_id = $1
                              AND p.status = 'approved'
                        )
                    )
                    OR (
                        a.audience_type = 'individuals'
                        AND $1 = ANY(a.target_user_ids)
                    )
               )
               AND NOT EXISTS (
                    SELECT 1
                    FROM announcement_reads r
                    WHERE r.announcement_id = a.id
                      AND r.user_id = $1
               )`,
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
                        r.read_at,
                        creator.username AS created_by_username
                 FROM announcements a
                 LEFT JOIN announcement_reads r
                    ON r.announcement_id = a.id
                   AND r.user_id = $1
                 LEFT JOIN tournaments t ON t.id = a.tournament_id
                 LEFT JOIN users creator ON creator.id = a.created_by
                 WHERE a.target_user_ids IS NOT NULL
                                     AND a.deleted_at IS NULL
                   AND (
                        a.audience_type = 'all'
                        OR (
                            a.audience_type IN ('current_tournament', 'round')
                            AND a.tournament_id IS NOT NULL
                            AND EXISTS (
                                SELECT 1
                                FROM participants p
                                WHERE p.tournament_id = a.tournament_id
                                  AND p.user_id = $1
                                  AND p.status = 'approved'
                            )
                        )
                        OR (
                            a.audience_type = 'individuals'
                            AND $1 = ANY(a.target_user_ids)
                        )
                   )
                 ORDER BY a.created_at DESC`,
                [req.user.id]
            ),
            pool.query(
                `SELECT COUNT(*)::int AS unread_count
                 FROM announcements a
                 WHERE a.target_user_ids IS NOT NULL
                                     AND a.deleted_at IS NULL
                   AND (
                        a.audience_type = 'all'
                        OR (
                            a.audience_type IN ('current_tournament', 'round')
                            AND a.tournament_id IS NOT NULL
                            AND EXISTS (
                                SELECT 1
                                FROM participants p
                                WHERE p.tournament_id = a.tournament_id
                                  AND p.user_id = $1
                                  AND p.status = 'approved'
                            )
                        )
                        OR (
                            a.audience_type = 'individuals'
                            AND $1 = ANY(a.target_user_ids)
                        )
                   )
                   AND NOT EXISTS (
                        SELECT 1
                        FROM announcement_reads r
                        WHERE r.announcement_id = a.id
                          AND r.user_id = $1
                   )`,
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

        const compactResult = await pool.query(
            `INSERT INTO announcement_reads (announcement_id, user_id, read_at)
             SELECT a.id, $1, NOW()
             FROM announcements a
             WHERE a.target_user_ids IS NOT NULL
                             AND a.deleted_at IS NULL
               AND (
                    a.audience_type = 'all'
                    OR (
                        a.audience_type IN ('current_tournament', 'round')
                        AND a.tournament_id IS NOT NULL
                        AND EXISTS (
                            SELECT 1
                            FROM participants p
                            WHERE p.tournament_id = a.tournament_id
                              AND p.user_id = $1
                              AND p.status = 'approved'
                        )
                    )
                    OR (
                        a.audience_type = 'individuals'
                        AND $1 = ANY(a.target_user_ids)
                    )
               )
               AND NOT EXISTS (
                    SELECT 1
                    FROM announcement_reads r
                    WHERE r.announcement_id = a.id
                      AND r.user_id = $1
               )
             ON CONFLICT (announcement_id, user_id) DO NOTHING`,
            [req.user.id]
        );

        res.json({ updatedCount: compactResult.rowCount || 0 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
