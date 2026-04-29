# 🐺 Wolfy Bot

A fully-featured Discord bot with leveling, moderation, birthday tracking, vouching, achievements, social notifications, and more.

---

## 📋 Features

| Feature | Commands |
|---|---|
| **Leveling** | `!rank`, `!leaderboard` — Canvas rank cards, level-up roles |
| **Moderation** | `!ban`, `!kick`, `!timeout`, `!mute`, `!deafen`, `!warn`, `!warnings`, `!purge`, `!move`, `!role`, `!slowmode` |
| **Birthday** | `!remember-birthday MM-DD` — Ping + 24h role on birthday |
| **Vouching** | `!vouch @user [points]`, `!vouchlist` |
| **Achievements** | `!achievements` — Messages/level/XP milestones with role rewards |
| **Tickets** | `!ticket`, `!ticket panel` — Button-based support tickets |
| **Embeds** | `!embed send` — Full rich embed creator |
| **Custom Cmds** | `!customcmd add/remove/list` |
| **Notifications** | YouTube (RSS), Twitch (API), TikTok*, Instagram* |
| **Auto Roles** | `!config autorole add/remove/list` |
| **Bot Status** | `!config status WATCHING <text>` |
| **Config** | `!config help` — Full setup reference |

> *TikTok & Instagram require approved business API access from Meta/TikTok.

---

## 🚀 Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/wolfy-bot.git
cd wolfy-bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your `.env` file
```bash
cp .env.example .env
```
Then open `.env` and fill in your `BOT_TOKEN`.

### 4. Get your Bot Token
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it "Wolfy"
3. Go to **Bot** tab → **Reset Token** → copy the token
4. Enable **ALL Privileged Gateway Intents**:
   - Presence Intent ✅
   - Server Members Intent ✅
   - Message Content Intent ✅
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Administrator` (or select individual permissions)
6. Open the generated URL in your browser to invite the bot

### 5. Run locally (for testing)
```bash
npm start
# or for auto-restart:
npm run dev
```

---

## ☁️ Deploy to Render (Free 24/7 Hosting)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial Wolfy Bot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wolfy-bot.git
git push -u origin main
```
> **Important:** Make sure `.env` is in `.gitignore` — never commit your token.

### Step 2 — Create Render Service
1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New → Web Service**
3. Connect your GitHub account and select your `wolfy-bot` repo
4. Settings:
   - **Name:** `wolfy-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free

### Step 3 — Add Environment Variables
In Render's dashboard → your service → **Environment**:
- `BOT_TOKEN` = your Discord bot token
- `DEFAULT_PREFIX` = `!`
- `BOT_STATUS` = `Watching the pack 🐺`
- `BOT_STATUS_TYPE` = `WATCHING`
- Add Twitch keys if you want Twitch notifications

### Step 4 — Deploy
Click **Manual Deploy → Deploy latest commit**. Wait ~2 minutes for it to go green.

---

## ⏰ Keep Alive with UptimeRobot

Render's free tier sleeps after 15 minutes of inactivity. UptimeRobot pings your bot every 5 minutes to prevent this.

1. Go to [uptimerobot.com](https://uptimerobot.com) and sign up (free)
2. Click **Add New Monitor**:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Wolfy Bot`
   - **URL:** `https://your-render-url.onrender.com/ping`
   - **Monitoring Interval:** 5 minutes
3. Click **Create Monitor**

Your bot will now run 24/7 for free.

---

## ⚙️ First-Time Server Configuration

After inviting the bot, run these commands in your Discord server:

```
!config log-channel #mod-logs
!config level-channel #level-ups
!config birthday-channel #birthdays
!config welcome-channel #welcome
!config mod-role @Moderator
!config birthday-role @🎂 Birthday Star
!config trusted-fan-role @Trusted Fan
!config trusted-fan-threshold 10

# Level roles (bot will assign these at milestone levels)
!config level-role-5 @Pack Member
!config level-role-10 @Wolf
!config level-role-20 @Alpha Wolf
!config level-role-30 @Pack Leader
!config level-role-40 @Elder Wolf
!config level-role-50 @Wolf God

# YouTube notifications
!config yt-channel-id UCxxxxxxxxxxxxxxxxxx
!config yt-channel-notify #youtube-notifs
!config yt-ping-role @YouTube Alerts

# Twitch notifications
!config twitch-username your_twitch_name
!config twitch-channel #twitch-notifs
!config twitch-ping-role @Twitch Alerts

# Auto roles (given to all new members)
!config autorole add @Member

# Custom prefix (optional)
!config prefix !

# Send ticket panel to a channel
!ticket panel
```

---

## 🏆 Achievement Setup

```
!achievements add "First Steps" "Send your first 10 messages" messages 10
!achievements add "Chatterbox" "Send 500 messages" messages 500
!achievements add "Level 10 Club" "Reach level 10" level 10
!achievements add "XP Grinder" "Earn 10,000 XP" xp 10000 @SpecialRole 500
```

---

## 📝 Custom Commands

Variables available in responses:
- `{user}` — Mentions the user
- `{username}` — Username text
- `{server}` — Server name
- `{membercount}` — Member count

```
!customcmd add socials Follow us on IG @wolfyofficial and TT @wolfyofficial 🐺
!customcmd add rules Read the rules in #rules before chatting!
!customcmd list
!customcmd remove socials
```

---

## 📝 Embed Creator

```
!embed send #announcements
title: Welcome to the Server!
description: We're so happy to have you here 🐺
color: #7c3aed
thumbnail: https://i.imgur.com/example.png
footer: Wolfy Community
field: Rules | Read #rules before chatting | false
field: Roles | Get roles in #roles | false
timestamp
```

---

## 📁 Project Structure

```
wolfy_bot/
├── index.js                    # Entry point
├── package.json
├── render.yaml                 # Render deploy config
├── .env.example                # Environment variable template
├── .gitignore
├── data/
│   └── wolfy.db                # SQLite database (auto-created)
└── src/
    ├── bot.js                  # Client setup
    ├── database/
    │   └── db.js               # All database logic
    ├── web/
    │   └── server.js           # Express keep-alive server
    ├── handlers/
    │   ├── commandHandler.js
    │   └── eventHandler.js
    ├── events/
    │   ├── ready.js
    │   ├── messageCreate.js    # XP + command routing
    │   ├── guildMemberAdd.js   # Auto roles + welcome
    │   └── interactionCreate.js # Ticket buttons
    ├── systems/
    │   ├── leveling.js         # XP, level-up, achievement checks
    │   ├── birthday.js         # Daily cron checker
    │   ├── notifications.js    # YouTube/Twitch/TikTok/Instagram poller
    │   └── tickets.js          # Ticket open/close/delete logic
    ├── commands/
    │   ├── moderation/         # ban kick timeout mute deafen warn warnings purge move role slowmode
    │   ├── leveling/           # rank leaderboard
    │   ├── birthday/           # remember-birthday
    │   ├── vouching/           # vouch vouchlist
    │   ├── tickets/            # ticket
    │   ├── config/             # config
    │   └── utility/            # help embed customcmd achievements serverinfo userinfo ping
    └── utils/
        ├── canvas.js           # Rank card generator
        ├── logger.js           # Mod action logger
        └── helpers.js          # Permission checks, embed helpers
```
