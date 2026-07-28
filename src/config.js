const config = require('./config.js');
require('dotenv').config();

const parseColor = (hex, fallback) => {
    try {
        return parseInt((hex || fallback).replace('#', ''), 16);
    } catch {
        return parseInt(fallback.replace('#', ''), 16);
    }
};

module.exports = {
    botName: process.env.BOT_NAME || config.botName,
    footerText: process.env.BOT_FOOTER_TEXT || config.footerText,
    color: parseColor(process.env.BOT_COLOR, '7C3AED'),
    successColor: parseColor(process.env.BOT_SUCCESS_COLOR, '22C55E'),
    errorColor: parseColor(process.env.BOT_ERROR_COLOR, 'EF4444'),
    prefix: process.env.DEFAULT_PREFIX || '!',
    jtcTemplate: process.env.DEFAULT_JTC_TEMPLATE || "{user}'s Channel",
    statsCategory: process.env.DEFAULT_STATS_CATEGORY || '📊 Server Stats',
    ticketTitle: process.env.DEFAULT_TICKET_TITLE || '🎫 Support Tickets',
    ticketDesc: process.env.DEFAULT_TICKET_DESC || 'Click the button below to open a support ticket.',
    birthdayMsg: process.env.BIRTHDAY_DEFAULT_MSG || '🎉 Happy Birthday {user}!',
    welcomeMsg: process.env.WELCOME_DEFAULT_MSG || 'Welcome to the server, {user}!',
    ytNotifMsg: process.env.DEFAULT_YT_NOTIF_MSG || '🔴 **{author}** uploaded a new video: **{title}**!\n{link}',
    twitchNotifMsg: process.env.DEFAULT_TWITCH_NOTIF_MSG || '💜 **{author}** is now LIVE on Twitch!\n{link}',
    tiktokNotifMsg: process.env.DEFAULT_TIKTOK_NOTIF_MSG || '🎵 **{author}** posted a new TikTok!\n{link}',
    instagramNotifMsg: process.env.DEFAULT_INSTAGRAM_NOTIF_MSG || '📸 **{author}** posted on Instagram!\n{link}',

    formatMsg(template, data = {}) {
        if (!template) return '';
        return template
            .replaceAll('{pingRole}', data.pingRole ? `<@&${data.pingRole}>` : '')
            .replaceAll('{user}', data.user ? `<@${data.user.id || data.user}>` : '')
            .replaceAll('{username}', data.user?.username || data.username || '')
            .replaceAll('{author}', data.author || '')
            .replaceAll('{actionText}', data.actionText || 'posted new content')
            .replaceAll('{title}', data.title || '')
            .replaceAll('{link}', data.link || '')
            .replaceAll('{server}', data.guildName || '');
    }
};