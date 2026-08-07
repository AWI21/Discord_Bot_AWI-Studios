require('dotenv').config();

const parseColor = (hex, fallback) => {
    try {
        return parseInt((hex || fallback).replace('#', ''), 16);
    } catch {
        return parseInt(fallback.replace('#', ''), 16);
    }
};

module.exports = {
    botName: process.env.BOT_NAME || 'Wolfy Bot',
    footerText: process.env.BOT_FOOTER_TEXT || 'Wolfy Bot',
    color: parseColor(process.env.BOT_COLOR, '7C3AED'),
    successColor: parseColor(process.env.BOT_SUCCESS_COLOR, '22C55E'),
    errorColor: parseColor(process.env.BOT_ERROR_COLOR, 'EF4444'),
    prefix: process.env.DEFAULT_PREFIX || '!',
    jtcTemplate: process.env.DEFAULT_JTC_TEMPLATE || "{user}'s Channel",
    statsCategory: process.env.DEFAULT_STATS_CATEGORY || '📊 Server Stats',
    ticketTitle: process.env.DEFAULT_TICKET_TITLE || '🎫 Support Tickets',
    ticketDesc: process.env.DEFAULT_TICKET_DESC || 'Click the button below to open a support ticket.',
    welcomeMsg: process.env.WELCOME_DEFAULT_MSG || 'Welcome to the server, {user}!',
    birthdayMsg: process.env.BIRTHDAY_DEFAULT_MSG || '🎂 Happy Birthday {user}! Wish you the best! 🥳🎉',
    levelUpMsg: process.env.DEFAULT_LEVEL_UP_MSG || "LET'S GO {user}! You just advanced to **Level {level}**! 🎉{unlockedText}",
    achievementNotifMsg: process.env.DEFAULT_ACHIEVEMENT_MSG || "Milestone reached! {user}, you just unlocked the **{name}** achievement! 🏆\n> {description}",
    ytNotifMsg: process.env.DEFAULT_YT_NOTIF_MSG || '🔴 **{author}** uploaded a new video: **{title}**!\n{link}',
    twitchNotifMsg: process.env.DEFAULT_TWITCH_NOTIF_MSG || '💜 **{author}** is now LIVE on Twitch!\n{link}',
    tiktokNotifMsg: process.env.DEFAULT_TIKTOK_NOTIF_MSG || '🎵 **{author}** posted a new TikTok!\n{link}',
    instagramNotifMsg: process.env.DEFAULT_INSTAGRAM_NOTIF_MSG || '📸 **{author}** posted on Instagram!\n{link}',
};