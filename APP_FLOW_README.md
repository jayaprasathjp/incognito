# INCØGNITØ — Complete Tournament System Documentation

> A full-stack competitive FIFA/eFootball tournament platform for the Nigerian university esports community.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Phase 1: User Registration](#phase-1-user-registration--authentication)
3. [Phase 2: Tournament Creation](#phase-2-tournament-creation-admin)
4. [Phase 3: Player Joins Tournament](#phase-3-player-joins-tournament)
5. [Phase 4: Bracket & Fixture Generation](#phase-4-bracket-configuration--fixture-generation)
6. [Phase 5: Match Play](#phase-5-match-play-lifecycle)
7. [Phase 6: Score Submission & Disputes](#phase-6-score-submission--dispute-resolution)
8. [Phase 7: Round Advancement](#phase-7-round-advancement)
9. [Phase 8: Tournament Completion](#phase-8-tournament-completion)
10. [Phase 9: Tournament Cycling](#phase-9-recursive-tournament-cycling)
11. [Admin Modules](#admin-dashboard-modules)
12. [Automated Systems](#automated-systems-background-processes)
13. [All Possible Scenarios & Edge Cases](#all-possible-scenarios--edge-cases-explained)
14. [Environment Variables](#environment-variables)
15. [Player Pages](#player-facing-pages)

---

## Architecture

| Layer                | Technology                                              |
| -------------------- | ------------------------------------------------------- |
| **Frontend**         | React (Vite) + TailwindCSS                              |
| **Backend**          | Node.js / Express                                       |
| **Database**         | PostgreSQL (node-postgres)                              |
| **Payments**         | Flutterwave (inline checkout)                           |
| **File Storage**     | Supabase Storage (match proof screenshots)              |
| **Hosting**          | Vercel (analytics + speed insights)                     |
| **Auth**             | JWT (access tokens)                                     |
| **Real-time Sync**   | Socket.io (instant match updates, room codes, statuses) |
| **Background Timer** | Native `setInterval` (dispute auto-expiry every 15 min) |

---

## Phase 1: User Registration & Authentication

### What Happens

1. User visits `/register` and fills the form:
   - **Institution** — searchable dropdown of Nigerian universities
   - **WhatsApp Number** — for direct communication during matches
   - **Email + Password** — account credentials
   - **Referral Code** (optional) — pre-filled from URL `?ref=` parameter if coming from a referral link
   - **Agree to Rules** — mandatory checkbox

   > ⚠️ **No alias at registration.** There is no global username or alias on the account. Your alias is chosen **per tournament** when you join it.

2. On submit → the server:
   - Checks no duplicate email exists
   - Creates user account with `role = 'player'` and `status = 'inactive'`
   - If referral code provided and valid → links the referral in the database
   - If referral code is invalid or missing → registration continues without it (no error)

3. After successful registration:
   - User is **auto-logged in** (JWT token issued immediately)
   - Redirected to their Player Dashboard (`/dashboard`)

### User Status Lifecycle

| Status | When | Meaning |
|--------|------|---------|
| `inactive` | On registration | Account created, never joined a tournament |
| `active` | On first tournament join (payment confirmed) | Has competed in at least one tournament |
| `banned` | Admin action | Cannot join new tournaments |

### Other Auth Features

| Feature | How It Works |
|---------|-------------|
| **Login** | Email + password → JWT token issued |
| **Forgot Password** | Enter email → reset link sent to inbox |
| **Reset Password** | Click link with token → set new password |
| **Session** | JWT stored in browser, attached to all API calls |
| **Personal Details** | `/personal-details` shows email, WhatsApp, institution (all read-only) |

---

## Phase 2: Tournament Creation (Admin)

### Who: Admin only (via `/admin/tournament`)

### When: After previous tournament is completed, or if no tournament exists

### What Admin Fills:

| Field                  | Details                             |
| ---------------------- | ----------------------------------- |
| **Title**              | e.g., "Winter Championship 2026"    |
| **Capacity**           | 256 / 512 / 1024 / 2048 players     |
| **Entry Fee**          | Amount in NGN (₦)                   |
| **Registration Start** | Date when players can begin joining |
| **Registration End**   | Date when joining closes            |

### What The System Does:

- Creates tournament with `status = 'open'`
- Registration window is defined by the start/end dates
- **Prize Pool** is fixed at **₦90,000** per tournament
- Registration start must be tomorrow or later
- End date must be after start date

---

## Phase 3: Player Joins Tournament

### What The Player Sees on Dashboard

The player's dashboard (`/dashboard`) shows different states:

| Scenario                      | What Player Sees                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Before registration opens     | "Registration Opens Soon" + the start date                                        |
| Registration window is active | Countdown timer showing days/hours/minutes/seconds + **"JOIN TOURNAMENT"** button |
| After registration closes     | "Registration Closed — Wait for next tournament"                                  |
| Player already joined         | "You're In!" badge + their session preference                                     |
| Tournament is live            | Match card or "Live Now" indicator                                                |
| Tournament completed          | 🏆 Winner trophy card                                                             |
| No tournament exists          | "No active tournament at the moment"                                              |

### How a Player Joins (3-Step Process)

**Step 1 — Choose Alias:**

Player sets their **tournament alias** — the public in-game name opponents will see:

- Must be **3–20 characters**, uppercase alphanumeric only (`A-Z`, `0-9`), no spaces or special characters
- Must be **unique within this tournament** (case-insensitive)
- **Not global** — the same player can reuse their preferred alias in a future tournament as long as no one else has claimed it there

> Alias is stored in the `participants` table (not `users`), so a player has a fresh alias slot each tournament.

**Step 2 — Choose Session Preference:**

Player picks when they prefer their matches to be scheduled:

| Session          | Time Window        |
| ---------------- | ------------------ |
| ☀️ **Morning**   | 10:30 AM – 1:30 PM |
| 🌤️ **Afternoon** | 2:00 PM – 5:00 PM  |
| 🌙 **Evening**   | 5:30 PM – 8:30 PM  |

> ⚠️ **Important:** Session preference is a _preference_, NOT a guarantee. The system tries to match players in the same session, but may schedule outside the preference based on bracket constraints.

**Step 3 — Payment:**

Player reviews the summary (tournament name, alias, chosen session, fee amount) and clicks **"PAY ₦X"**.

### What Happens Behind the Scenes (Payment)

1. Frontend sends `POST /payment/initialize` with tournament ID, alias, and session preference
2. Server creates a payment intent:

   **In Production:**
   - Opens Flutterwave inline checkout (card, bank transfer, USSD)
   - Player completes payment in the Flutterwave popup
   - On success → Frontend sends `POST /payment/verify` with transaction ID
   - Server verifies with Flutterwave API → if legit, participant status set to `approved`
   - Player sees "You're In!" on dashboard

   **In Development (PAYMENT_BYPASS=true):**
   - Payment is skipped entirely
   - Player is auto-approved immediately
   - Useful for testing without real payments

3. If payment fails or is cancelled → player stays unapproved, can retry anytime

---

## Phase 4: Bracket Configuration & Fixture Generation

### Step 1 — Admin Generates Bracket Structure

After registration ends, admin clicks **"Generate Bracket"** on the Tournament Control page.

The system analyzes participant count and determines the bracket type:

| Participant Count                                | Bracket Type     | What Happens                                         |
| ------------------------------------------------ | ---------------- | ---------------------------------------------------- |
| **Exact power of 2** (e.g., 512)                 | Standard Bracket | All players play in Round 1, no BYEs                 |
| **Not a power of 2** (e.g., 899)                 | BYE Bracket      | Some players skip Round 1 and go directly to Round 2 |
| **More than capacity** (e.g., 1200 for 1024 cap) | Qualifier Round  | Extra players play a qualifier to reduce to capacity |

**BYE Example (899 players):**

- Nearest lower power of 2 = **512**
- Players who must play Round 1 = (899 - 512) × 2 = **774**
- Players who get a BYE = 899 - 774 = **125** (skip to Round 2 automatically)
- After Round 1: 387 winners + 125 BYE players = **512** → standard bracket from here

### Step 2 — Admin Sets Round Dates

Admin assigns a specific date to each round:

- Round 1 must be tomorrow or later
- Each subsequent round must be **at least 1 day** after the previous round
- Changing an earlier round date **resets all later round dates** (cascade validation)
- All rounds must have dates before saving

### Step 3 — Admin Activates Tournament

Admin changes tournament status from `open` → `active`, which starts the competition.

### Step 4 — Admin Generates Fixtures

Admin clicks **"Generate Fixtures"** for a specific round:

**Round 1 matching rules:**

- Players are grouped by their **session preference** (morning plays morning, etc.)
- Match times are **staggered** within each session (e.g., 10:30, 11:00, 11:30...)
- Each match gets a unique `match_code` for identification
- BYE matches (one player, no opponent) are auto-completed immediately

**Subsequent round matching:**

- Winners from the previous round are paired together
- Same staggered time slot logic applies

### ⚡ Auto-Trigger Fixture Generation

**This is a critical automated feature:** The system does NOT rely solely on the admin manually clicking "Generate Fixtures". There is an **auto-trigger mechanism**:

- **When it fires:** Every time the admin opens the Tournament Control page (`GET /admin/tournaments/control`), the server checks ALL rounds
- **What it checks:** For each round where the scheduled date has arrived (today or earlier) AND fixtures have NOT been generated yet
- **What it does:** Automatically generates fixtures for that round
- **Bonus:** If the tournament was in `scheduled` status and fixtures were just auto-generated, it also **automatically sets the tournament to `active`**

**In plain English:** If the admin has already set the round dates and the round day arrives, simply opening the Tournament Control page will auto-generate the fixtures. The admin doesn't need to remember to click the button — it happens automatically when they visit the page.

> 💡 However, the admin CAN still manually generate fixtures earlier using the "Generate Fixtures" button (e.g., generating next round fixtures in advance after 22 hours).

---

## Phase 5: Match Play Lifecycle

### Match States (What Each Status Means)

| Status             | Meaning                                        | What Player Sees                                     |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------- |
| `scheduled`        | Match created, waiting for match time          | Match time displayed, "Check-in not open yet"        |
| `checking_in`      | Check-in window is open                        | "I'M READY" button visible                           |
| `active`           | Both players checked in, game in progress      | "MATCH IS LIVE!" — play window running               |
| `walkover_pending` | Check-in window closed, someone didn't show up | "Claim Walkover" button for the player who showed up |
| `pending_review`   | Scores conflict, admin must decide             | "Awaiting admin review"                              |
| `completed`        | Match resolved, winner determined              | Victory or Defeat result screen                      |
| `cancelled`        | Match voided (both no-show or double DQ)       | "Match was cancelled"                                |

### Match Timeline (Minute by Minute)

```
Match Time: 10:30 AM (example)
──────────────────────────────────────────────
10:15 AM   → Check-in window OPENS (15 min before)
             Players see "I'M READY" button

10:30 AM   → Scheduled match time
             Check-in still open

11:00 AM   → Check-in window CLOSES (30 min after)
             If player(s) didn't check in → walkover available

─── Once BOTH players check in: ───

Check-in    → Match goes ACTIVE
             60-minute play window starts
             Home player (Player 1) must share room code

+60 min     → Match timer expires
             System checks: Who submitted scores?
             Auto-resolution kicks in
```

### Check-In Process

1. **15 minutes before match time** → "I'M READY" button appears for both players
2. Player clicks "I'M READY" → `POST /matches/:id/ready`
3. Their ready status is recorded
4. **When BOTH players are ready** → `checked_in_at` timestamp is set, match becomes **active**
5. If check-in window closes (30 min after match time) and player(s) didn't check in → walkover scenario

### During an Active Match

1. **Home player (Player 1)** shares the game room code → `POST /matches/:id/room-code`
   - Only Player 1 can submit the room code
   - Room code MUST be shared before any score/dispute submission
2. **Both players** play the FIFA/eFootball match
3. After the game → each player uploads a **screenshot of the final score** as proof
4. Each player submits their score claim

### Room Code Rules

| Who             | Can Submit Room Code?   |
| --------------- | ----------------------- |
| Player 1 (Home) | ✅ Yes — only they can  |
| Player 2 (Away) | ❌ No — they receive it |

**Instant Updates & Resend Feature:**

- All match updates (including the room code being shared) are **instantaneous** using WebSockets (Socket.io).
- If the home player makes a mistake or there's a connection issue, they can **resend/edit the room code** within the **first 10 minutes** of the active match window (when remaining time is ≥ 50:00).
- If the home player **never shares the room code** and the 60-minute timer expires → **away player (Player 2) auto-wins** (match code: `HOME_NO_CODE`).

---

## Phase 6: Score Submission & Dispute Resolution

### How Score Submission Works

Each player independently submits:

- **Their score** (e.g., "I scored 3")
- **Opponent's score** (e.g., "They scored 1")
- **Proof screenshot** (uploaded to Supabase Storage)
- **Dispute Reason & Category** (if they disagree with opponent or have issues)

### All Possible Outcomes After Both Submit

| Scenario                                                       | What Happens                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Both players agree** (P1 says "3-1", P2 says "1-3")          | ✅ Match **auto-completes**. Winner gets 3 points.                                                                       |
| **Scores conflict** (P1 says "I won", P2 also says "I won")    | ⚠️ `score_conflict` dispute created. Match goes to `pending_review`. **Admin must review proof screenshots and decide.** |
| **Scores are equal** (including carry-over from disconnection) | ⚠️ `score_conflict` dispute created. Admin decides.                                                                      |
| **Only one player submits** (opponent doesn't submit anything) | ⏰ **1-hour countdown** starts for opponent to respond                                                                   |

### The 1-Hour Response Window (Player Claim Dispute)

When only one player submits their result:

1. A `player_claim` dispute is created automatically
2. The opponent gets **exactly 1 hour** to respond with:
   - **Their scores** (Claiming their side)
   - **Remark** (Explanation)
   - **Proof screenshots**
3. **If opponent responds within 1 hour:**
   - If they **accept** (agree with result) → Match auto-completes.
   - If they **reject/disagree** (provide conflicting scores) → Match goes to admin review (`pending_review`).
4. **If opponent does NOT respond within 1 hour:**
   - **Automatic resolution** → the submitter **wins by default** with score 3-0

### How Auto-Expiry Works (Background Process)

The system has a **background timer** that runs:

- **Every 15 minutes** after server startup
- It scans ALL pending `player_claim` disputes
- Finds ones where the 1-hour `respond_by` deadline has passed
- **Auto-resolves them:** submitter wins with 3-0 score
- Also checks if this resolution completes the tournament final

### Admin Dispute Resolution

When a dispute reaches admin review (either `score_conflict` or `awaiting_admin`), the admin has **3 options:**

| Admin Action         | What It Does                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Set Winner**       | Admin picks the real winner and sets final scores (match → `completed`)                                                                           |
| **Reject Dispute**   | Dispute dismissed, match **returns to `scheduled`** — players can re-submit scores fresh                                                          |
| **Schedule Rematch** | Match fully reset (all scores, room code, check-in cleared). Admin sets a new match time (e.g., "15:30"). Players must check in again and replay. |

---

## Phase 7: Round Advancement

### When All Matches in a Round Are Done

After every match in the current round is `completed` or `cancelled`:

1. Admin opens Tournament Control page
2. System shows the **next round's countdown timer** with the scheduled date
3. Admin can generate fixtures for the next round

### 22-Hour Gate Rule

**Fixture generation for the next round is locked until 22 hours have passed since the current round's start date.**

Why: This ensures all matches have had enough time to complete — including any dispute resolution, timeout handling, and walkovers.

Example:

- Round 1 date: April 15 (starts at 00:00)
- Admin can generate Round 2 fixtures after: April 15, 10:00 PM (22 hours later)
- If admin opens Tournament Control before 22 hours → "Generate Fixtures" button is hidden

### What Happens When Fixtures Are Generated for Next Round

- Server collects all **winners** from completed matches in the previous round
- Winners are paired for the next round
- New matches created with staggered time slots
- Players see their **new opponent and match time** on their dashboard immediately

### Auto-Generation on Round Day

As explained in Phase 4, if the admin has already saved the round schedule, fixtures are **auto-generated when the admin visits the Tournament Control page on the round day** (or after). No manual button click needed — it's a safety net.

---

## Phase 8: Tournament Completion

### How The System Detects Tournament Is Finished

After every match completion, the system runs `checkIfTournamentFinished()`:

1. Finds the **maximum round number** (the final round) for this tournament.
2. Checks if the just-completed match is in that final round.
3. Looks at ALL matches in the final round — are they ALL `completed` or `cancelled`?
4. **If yes AND a winner exists** → The system **automatically**:
   - Sets Tournament `status = 'completed'`.
   - Updates Tournament `winner_id` to the final winner.
5. **If yes BUT no winner** (rare edge case) → Tournament → `paused` for admin to intervene.

### What Players See After Tournament Ends

**The Champion:**

- 🏆 Large trophy card with their name and avatar initial
- Prize pool amount (₦90,000) displayed
- If they've filled bank details → "Prize money will be transferred shortly!"
- If they haven't → Red alert: "Action Required: Fill Bank Details!" with a link to `/bank-details`

**Other Players:**

- See the winner card
- "Awaiting Next Season" button

### Winner Payout Process

1. Winner navigates to `/bank-details`
2. Enters: bank name, account number
3. Dashboard confirms: "Prize money will be transferred shortly!"
4. Admin handles the actual bank transfer manually

---

## Phase 9: Recursive Tournament Cycling

### What "Cycling" Means

When a tournament is completed and the admin wants to start a new season, they "cycle" the tournament — which cleans up old data and presents a fresh creation form.

### What Gets Deleted During Cycle

| Data                             | Deleted?                                           |
| -------------------------------- | -------------------------------------------------- |
| All disputes from old tournament | ✅ Yes — permanently removed                       |
| All matches from old tournament  | ✅ Yes — permanently removed                       |
| Round configurations             | ✅ Yes — cleared                                   |
| Participant list                 | ✅ Yes — all participants removed to free capacity |

### What Stays After Cycle

| Data                        | Preserved?                        |
| --------------------------- | --------------------------------- |
| User accounts and profiles  | ✅ Yes — all accounts intact      |
| Payment/transaction history | ✅ Yes — all records kept         |
| Referral relationships      | ✅ Yes — referral links preserved |
| Bank details                | ✅ Yes — no need to re-enter      |

### After Cycling

- Clicking **"End & Clear Tournament Data"** (only visible when tournament is `completed`) triggers the wipe.
- After the action succeeds, the admin is **automatically transitioned** to the "Create New Tournament" form.
- New tournament, new settings, new season.
- Players can re-register and pay for the new tournament.
- The entire lifecycle begins again.

---

## Admin Dashboard Modules

| Module                 | Route                  | What Admin Can Do                                                                                                                                |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard**          | `/admin/dashboard`     | Overview statistics and quick insights                                                                                                           |
| **Player Management**  | `/admin/players`       | View all players, see full profile (institution, phone, email), match history, payment history, ban/unban players                                |
| **Tournament Control** | `/admin/tournament`    | Configure brackets, set round dates, activate/pause, generate fixtures. After completion, use "End & Clear" to wipe data and start a new season. |
| **Matches**            | `/admin/matches`       | View all matches filtered by round, see results, winner details, proof screenshots                                                               |
| **Disputes**           | `/admin/disputes`      | Review proof screenshots from both players, set winner, reject dispute, schedule rematch                                                         |
| **Payments**           | `/admin/payments`      | Full transaction history, search by username/reference/Flutterwave ID, filter by payment status and tournament                                   |
| **Announcements**      | `/admin/announcements` | Send system-wide notifications                                                                                                                   |

---

## Automated Systems (Background Processes)

These things happen **automatically** without anyone clicking anything:

### 1. Dispute Auto-Expiry (Every 15 Minutes)

| Detail            | Value                                             |
| ----------------- | ------------------------------------------------- |
| **What**          | Scans all pending `player_claim` disputes         |
| **When**          | Runs on server startup, then every 15 minutes     |
| **Condition**     | Dispute's 1-hour `respond_by` deadline has passed |
| **Action**        | Submitter auto-wins with 3-0 score                |
| **Also triggers** | Tournament completion check                       |

### 2. Auto-Fixture Generation (On Admin Page Visit)

| Detail            | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| **What**          | Checks all rounds for the active tournament               |
| **When**          | Every time admin opens Tournament Control page            |
| **Condition**     | Round date has arrived AND fixtures not yet generated     |
| **Action**        | Auto-generates fixtures for that round                    |
| **Also triggers** | Auto-activates tournament if it was in `scheduled` status |

### 3. Match Timeout Resolution (60-Min Timer Expiry)

| Detail     | Value                                                               |
| ---------- | ------------------------------------------------------------------- |
| **What**   | Checks what happened during the 60-minute match window              |
| **When**   | Triggered by the frontend when the client-side 60-min timer expires |
| **Action** | See "All Timeout Scenarios" table below                             |

---

## All Possible Scenarios & Edge Cases (Explained)

### 🚶 No-Show / Walkover Scenarios

**What is a "no-show"?** A player doesn't click the "I'M READY" button during the check-in window (15 min before → 30 min after match time).

| Scenario                                 | What Happens                                                     | Result                                                   |
| ---------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| **Player 1 checks in, Player 2 doesn't** | Player 1 can click "Claim Walkover" after check-in window closes | Player 1 **wins automatically** (match code: `WALKOVER`) |
| **Player 2 checks in, Player 1 doesn't** | Player 2 can click "Claim Walkover"                              | Player 2 **wins automatically**                          |
| **Neither player checks in**             | Either player (or admin) can trigger walkover                    | Match is **cancelled** — no winner, no points for anyone |
| **Both players check in**                | Normal match proceeds                                            | Cannot claim walkover — must play                        |

### ⚖️ Score Conflict Scenarios

**What is a "score conflict"?** Both players submit their scores but they disagree on who won.

| Scenario                                                                           | What Happens                                          | Result                                                                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **P1 says "I won 3-1", P2 says "I won 2-0"**                                       | Both claim victory → `score_conflict` dispute created | Match goes to `pending_review`. **Admin reviews both players' proof screenshots** and picks the real winner. |
| **P1 says "3-1", P2 says "1-3"** (they agree)                                      | Scores match → system auto-resolves                   | Match **auto-completes**. Higher scorer gets 3 points.                                                       |
| **Scores agree but total is tied** (e.g., including carry-over from disconnection) | Equal aggregate → dispute created                     | Admin must decide the winner or schedule a rematch.                                                          |

### ⏰ 1-Hour Expiry (Player Claim Dispute)

**What is the "1-hour expiry"?** When only one player submits their score, the opponent has exactly 1 hour to respond.

| Scenario                                                                 | What Happens                   | Result                                                                 |
| ------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------- |
| **Player A submits score, Player B responds within 1 hour by accepting** | Goes to admin for final review | Admin makes final decision                                             |
| **Player A submits score, Player B responds within 1 hour by rejecting** | Both players' claims reviewed  | Match **cancelled as "double DQ"** — both disqualified from that match |
| **Player A submits score, Player B does NOTHING for 1 hour**             | Background timer auto-resolves | Player A **wins by default** with 3-0 score                            |

In simple terms: **If you don't respond to your opponent's score claim within 1 hour, you automatically lose.**

### 🚫 Mid-Tournament Player Withdrawal

**What if a player wants to quit the tournament mid-way?**

There is **no "withdraw" button** for players. This is handled manually:

1. Player contacts admin (via WhatsApp or support)
2. Admin goes to the player's current match in the Disputes/Matches panel
3. Admin **manually sets the opponent as the winner** of that match
4. The opponent advances to the next round normally
5. If needed, admin can **ban the withdrawing player** to prevent future issues

### 💀 Double DQ in Finals

**What happens if neither player wins the final match?**

This is an extremely rare edge case:

| Scenario                                  | What Happens                       |
| ----------------------------------------- | ---------------------------------- |
| Both players don't check in for the final | Final match cancelled, no winner   |
| Both players reject each other's disputes | Match cancelled as "double DQ"     |
| System can't determine a winner           | Tournament goes to `paused` status |

**Resolution:** Admin must manually intervene:

- Admin can override and set a winner based on available evidence
- Admin can schedule a rematch for the final
- Admin can set the tournament winner directly in the database

### 💳 Payment Failure Scenarios

**What if payment fails?**

| Scenario                                    | What Happens                                                             | Can They Retry?                                     |
| ------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| **Player closes Flutterwave popup**         | Nothing happens — player stays unregistered                              | ✅ Yes, click "JOIN" again                          |
| **Bank/card declines payment**              | Flutterwave shows error in popup                                         | ✅ Yes, try again with different method             |
| **Payment succeeds but verification fails** | Player sees "Payment received but verification failed. Contact support." | ⚠️ Contact admin — payment was taken but not linked |
| **Internet disconnects during payment**     | Payment may or may not have gone through                                 | ⚠️ Contact admin to verify                          |
| **Flutterwave system is down**              | Popup won't load                                                         | ✅ Try again later                                  |

### 🏠 Home Player Room Code Scenarios

| Scenario                                                     | What Happens                                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Home player shares room code normally**                    | Match proceeds — both players can join the game                                                          |
| **Home player shares code but network disconnects**          | Home player can click "EDIT" to **resend a new code** (valid for the first 10 minutes of the match only) |
| **Home player never shares room code, 60-min timer expires** | Away player (Player 2) **auto-wins** (match code: `HOME_NO_CODE`)                                        |
| **Room code shared but game has technical issues**           | Player opens a dispute (connection_issues category)                                                      |

### ⏱️ All 60-Minute Timeout Scenarios

When the match timer expires and scores aren't resolved:

| Condition                                                   | Result                                            |
| ----------------------------------------------------------- | ------------------------------------------------- |
| **No room code was shared**                                 | Away player wins (`HOME_NO_CODE`)                 |
| **Neither player submitted scores AND no disputes pending** | Match cancelled — both disqualified (`DOUBLE_DQ`) |
| **Neither player submitted scores BUT dispute is pending**  | Match stays frozen until dispute resolves         |
| **Only Player 1 submitted**                                 | Player 1 wins by default (`TIMEOUT_WIN`)          |
| **Only Player 2 submitted**                                 | Player 2 wins by default (`TIMEOUT_WIN`)          |
| **Both submitted (already auto-resolved)**                  | No action needed                                  |

### 🔗 Referral Code Edge Cases

| Scenario                                    | What Happens                                                   |
| ------------------------------------------- | -------------------------------------------------------------- |
| Valid referral code entered                 | Referral recorded, referred user linked to referrer            |
| Invalid/nonexistent referral code           | Registration continues normally — no error, no linkage         |
| No referral code entered                    | Registration continues normally                                |
| Player tries to use their own referral code | Registration continues (no self-referral validation currently) |

### 👤 Banned Player Scenarios

| Scenario                                   | What Happens                                                    |
| ------------------------------------------ | --------------------------------------------------------------- |
| Admin bans a player                        | Player account flagged; admin handles affected matches manually |
| Banned player tries to join new tournament | Prevented at the admin level                                    |
| Admin unbans a player                      | Player can participate in future tournaments                    |

---

## 🏆 Scoring Rules

| Event                                                 | Points                       |
| ----------------------------------------------------- | ---------------------------- |
| **Match Win** (any method)                            | **3 points**                 |
| Match Loss                                            | 0 points                     |
| BYE (auto-advance, no opponent)                       | 0 points                     |
| Walkover Win (opponent no-show)                       | **3 points** (scored as 3-0) |
| Dispute Auto-Win (opponent didn't respond in 1 hour)  | **3 points** (scored as 3-0) |
| Timeout Win (only one player submitted score)         | **3 points**                 |
| Home No-Code Win (home player never shared room code) | **3 points**                 |
| Double DQ (both disqualified)                         | 0 points for both            |

### Leaderboard Ranking Order:

1. **Total Points** (highest first)
2. **Goal Difference** (goals scored minus goals conceded)
3. **Goals Scored** (highest first)

---

## 🔐 Authentication & Access Control

| Middleware                  | What It Does                                                                   | Where Used                  |
| --------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| `authenticateToken`         | Validates JWT token. Blocks with 401/403 if invalid or missing.                | All player routes           |
| `optionalAuthenticateToken` | Allows guests to access. Attaches user data if token present.                  | Leaderboard, spectator view |
| `authorizeAdmin`            | Restricts access to admin-only (`role = 'admin'`). Returns 403 for non-admins. | All `/admin/*` routes       |

---

## Environment Variables

| Variable               | What It's For                                                | Required?     |
| ---------------------- | ------------------------------------------------------------ | ------------- |
| `DATABASE_URL`         | PostgreSQL connection string                                 | ✅ Always     |
| `JWT_SECRET`           | Secret key for signing JWT tokens                            | ✅ Always     |
| `FLW_SECRET_KEY`       | Flutterwave API secret key (backend verification)            | ✅ Production |
| `VITE_FLW_PUBLIC_KEY`  | Flutterwave public key (frontend checkout popup)             | ✅ Production |
| `SUPABASE_URL`         | Supabase project URL for file storage                        | ✅ Always     |
| `SUPABASE_SERVICE_KEY` | Supabase service role key for uploading files                | ✅ Always     |
| `PAYMENT_BYPASS`       | Set to `"true"` to skip Flutterwave and auto-approve players | ❌ Dev only   |

---

## Player-Facing Pages

| Page                 | Route                    | Who Can Access    | What It Does                                                            |
| -------------------- | ------------------------ | ----------------- | ----------------------------------------------------------------------- |
| Welcome / Landing    | `/`                      | Anyone            | Hero page with tournament info and spectator access                     |
| Register             | `/register`              | Anyone            | Create account with institution, WhatsApp, referral                     |
| Login                | `/login`                 | Anyone            | Email + password login                                                  |
| Forgot Password      | `/forgot-password`       | Anyone            | Request password reset email                                            |
| Reset Password       | `/reset-password/:token` | Anyone with token | Set new password via reset link                                         |
| **Player Dashboard** | `/dashboard`             | 🔒 Logged in      | **Main hub** — tournament card, active match, join flow, winner display |
| My Matches           | `/matches`               | 🔒 Logged in      | Full list of all matches in the current tournament                      |
| Leaderboard          | `/leaderboard`           | Anyone            | Tournament standings with points, goal difference, rankings             |
| Tournament Details   | `/tournament/:id`        | 🔒 Logged in      | Full bracket view and participant list                                  |
| Roadmap              | `/roadmap`               | 🔒 Logged in      | Platform development timeline                                           |
| Rules                | `/rules`                 | 🔒 Logged in      | Complete tournament rules and guidelines                                |
| Referral Program     | `/referral`              | 🔒 Logged in      | View referral code, share it, see who used it                           |
| Bank Details         | `/bank-details`          | 🔒 Logged in      | Enter bank account for winner prize payout                              |

---

## 🔄 Full Lifecycle at a Glance

```
 1.  ADMIN creates tournament (title, capacity, fee, dates)
      ↓
 2.  Registration window opens on the start date
      ↓
 3.  PLAYERS register → choose session preference → pay via Flutterwave
      ↓
 4.  Registration closes → ADMIN generates bracket (auto-calculates BYEs)
      ↓
 5.  ADMIN sets round dates → saves schedule
      ↓
 6.  Round day arrives → fixtures AUTO-GENERATE when admin opens the page
      ↓
 7.  PLAYERS check in (15 min before match) → both ready → match goes LIVE
      ↓
 8.  Home player shares room code → players play FIFA → take screenshot
      ↓
 9.  PLAYERS submit scores, reason/category, and proof → auto-resolve if they agree
      ↓
10.  If scores conflict → DISPUTE reviewed by admin (using reason & scores) → picks winner
      ↓
11.  If one player doesn't respond → AUTO-EXPIRES after 1 hour → submitter wins
      ↓
12.  22 hours after round start → ADMIN generates next round fixtures
      ↓
13.  Repeat steps 7–12 until the FINAL match
      ↓
14.  Final resolved → TOURNAMENT AUTO-COMPLETES → 🏆 Winner crowned & recorded
      ↓
15.  Winner fills bank details → prize money transferred
      ↓
16.  ADMIN clicks "End & Clear" → data cleaned → AUTO-TRANSITION to Step 1
```

---

> **Document Version:** 2.0
> **Last Updated:** April 2026
> **Platform:** INCØGNITØ Tournament System
