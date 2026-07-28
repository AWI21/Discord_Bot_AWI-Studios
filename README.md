# ⚡ AWI Studios — Discord Bot Framework (v4.0.0)

> A modular, white-label Discord bot framework built with **Discord.js v14**, **Turso (Cloud SQLite)**, **@napi-rs/canvas**, and a fully dynamic **.env-driven styling engine**. Easily rebrandable for any community or server in seconds.

![Version](https://img.shields.io/badge/Version-4.0.0-7C3AED?style=for-the-badge&logo=git&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Turso](https://img.shields.io/badge/Turso-SQLite_Cloud-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Canvas](https://img.shields.io/badge/Canvas-Rank_Cards-FF6C37?style=for-the-badge&logo=html5&logoColor=white)

---

## 🌟 Key Features

### 🎨 Fully Customizable Rank Cards & Leveling
* **Dynamic Canvas Engine:** Uses `@napi-rs/canvas` to build custom rank cards showing current XP, progress bar, rank position, total XP, and milestone badges.
* **100% Themeable via `.env`:** Change card background gradients, accent colors, progress bars, custom fonts, and text colors directly from environment variables.
* **Milestone Level Roles:** Automatic role assignments at levels 5, 10, 20, 30, 40, 50, and 100 with automatic cleanup of obsolete level roles.
* **Custom Template Messages:** Server admins can customize level-up messages using template variables (`{user}`, `{level}`, `{role}`, `{unlockedText}`, `{guildName}`).

### 🎂 Birthday Tracking
* **Daily Automated Checks:** Cron job scans for birthdays every midnight.
* **24-Hour Special Role:** Temporarily assigns a designated birthday role for 24 hours before automatically revoking it.
* **Templated Greetings:** Fully configurable announcement message with placeholders.

### 🏆 Achievements & Milestones
* **Automatic Progression:** Grants achievements based on message count, XP thresholds, or level milestones.
* **Rewards System:** Automatically awards role rewards or bonus XP upon unlocking milestones.

### 📣 Social Media Notifications
* **Multi-Platform Support:** Polling engines for **YouTube**, **Twitch**, **TikTok**, and **Instagram**.
* **Ping Roles & Custom Formatting:** Send custom alerts with platform-specific emojis, pings, and video links.

### 🛡️ Moderation, Tickets & Server Utility
* **Button-Based Ticket System:** Interactive support panels with auto-generated ticket channels.
* **Custom Commands:** Role-restricted custom server commands.
* **Auto-Roles & Welcome Messages:** Welcomes new members with customizable template embeds and auto-assigned roles.
* **Join-To-Create (JTC) Voice:** Dynamic temporary voice channels.
* **Server Stats Counters:** Live updating category and channel stats.

---

## 📋 Slash & Prefix Commands

| Category | Command | Description |
| :--- | :--- | :--- |
| **Engagement** | `/rank` | Displays your custom Canvas rank card. |
| **Engagement** | `/leaderboard` | View top server members by XP and Level. |
| **Engagement** | `/remember-birthday` | Save your birthday to the database. |
| **Engagement** | `/achievements` | Check unlocked milestone badges and rewards. |
| **Support** | `/ticket panel` | Spawn an interactive support ticket panel. |
| **Utility** | `/customcmd` | Create server-specific commands with role locks. |
| **Utility** | `/embed` | Build rich interactive embeds via modal forms. |
| **Admin** | `/ban`, `/kick`, `/mute` | Complete moderation suite with audit logging. |

---

## ⚙️ Environment Variables Setup (`.env`)

Create a `.env` file in the root directory of your project using the template below:

```env
# ── Credentials ─────────────────────────────────────────────────────────────
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# ── Database (Turso / SQLite) ────────────────────────────────────────────────
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your_turso_auth_token

# ── Branding & Styling ───────────────────────────────────────────────────────
BOT_NAME=Wolfy
BOT_COLOR=#7C3AED
BOT_SUCCESS_COLOR=#22C55E
BOT_ERROR_COLOR=#EF4444
BOT_FOOTER_TEXT=Powered by AWI Studios

# ── Bot Presence ─────────────────────────────────────────────────────────────
# Types: PLAYING | WATCHING | LISTENING | COMPETING
BOT_STATUS=Watching YouTube!
BOT_STATUS_TYPE=WATCHING
BOT_ONLINE_STATUS=online

# ── Canvas / Rank Card Customization ─────────────────────────────────────────
CANVAS_FONT_MAIN="Bryndan Write", sans-serif
CANVAS_FONT_CLEAN=system-ui, -apple-system, sans-serif
CANVAS_BG=#161a6f
CANVAS_BG_ALT=#0c0e3e
CANVAS_ACCENT=#2721e3
CANVAS_ACCENT_LIGHT=#38b6ff
CANVAS_BAR_BG=#1e2480
CANVAS_BAR_FILL=#2721e3
CANVAS_BAR_FILL_END=#38b6ff
CANVAS_TEXT_PRIMARY=#ffffff
CANVAS_TEXT_SECONDARY=#38b6ff
CANVAS_TEXT_MUTED=#6f7bb0
CANVAS_AVATAR_BORDER=#38b6ff

# ── System Defaults ──────────────────────────────────────────────────────────
DEFAULT_PREFIX=!
DEFAULT_JTC_TEMPLATE={user}'s Channel
DEFAULT_STATS_CATEGORY=📊 Server Stats
DEFAULT_TICKET_TITLE=🎫 Support Tickets
DEFAULT_TICKET_DESC=Click the button below to open a support ticket.\nOur staff team will assist you as soon as possible.

# ── Custom Message Templates ─────────────────────────────────────────────────
BIRTHDAY_DEFAULT_MSG=🎂 Happy Birthday {user}! Wish you the best! 🥳🎉
WELCOME_DEFAULT_MSG=Welcome to **{guildName}**, {user}!\nYou are member **#{memberCount}**.
LEVEL_UP_DEFAULT_MSG=LET'S GO {user}! You just advanced to **Level {level}**! 🎉{unlockedText}
ACHIEVEMENT_DEFAULT_MSG=Milestone reached! {user}, you just unlocked the **{name}** achievement! 🏆\n> {description}

# ── Social Notification Defaults ────────────────────────────────────────────
DEFAULT_SOCIAL_NOTIF_MSG=Hey {pingRole}, **{author}** just {actionText}! Go check it out!\n{link}
DEFAULT_YT_NOTIF_MSG=🔴 Hey {pingRole}, **{author}** just {actionText}! Go check it out!\n{link}
DEFAULT_TWITCH_NOTIF_MSG=💜 **{author}** is now LIVE on Twitch playing **{title}**!\n{link}
DEFAULT_TIKTOK_NOTIF_MSG=🎵 **{author}** posted a new TikTok!\n{link}
DEFAULT_INSTAGRAM_NOTIF_MSG=📸 **{author}** posted on Instagram!\n{link}

# ── Dashboard & API Keys (Optional) ──────────────────────────────────────────
PORT=3000
CALLBACK_URL=http://localhost:3000/api/auth/callback
SESSION_SECRET=super_secret_session_key
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TIKTOK_ACCESS_TOKEN=
INSTAGRAM_ACCESS_TOKEN=