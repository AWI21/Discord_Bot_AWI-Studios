const axios = require('axios');
const xml2js = require('xml2js');
const { EmbedBuilder } = require('discord.js');
const { getConfig, hasPosted, markPosted } = require('../database/db');

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function startNotificationPoller(client) {
  setInterval(() => pollAll(client), POLL_INTERVAL);
  console.log('📡 Notification poller started (5min interval)');
}

async function pollAll(client) {
  for (const guild of client.guilds.cache.values()) {
    await pollYouTube(client, guild);
    await pollTwitch(client, guild);
    // TikTok & Instagram require official API approvals.
    // Placeholders are wired up — add your tokens in .env when approved.
    await pollTikTok(client, guild);
    await pollInstagram(client, guild);
  }
}

// ── YouTube (RSS feed — no API key needed) ────────────────────────────────────
async function pollYouTube(client, guild) {
  const channelId = getConfig(guild.id, 'yt_channel_id');
  const notifChannel = getConfig(guild.id, 'yt_notif_channel');
  if (!channelId || !notifChannel) return;

  const ch = guild.channels.cache.get(notifChannel);
  if (!ch) return;

  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await axios.get(url, { timeout: 8000 });
    const parsed = await xml2js.parseStringPromise(res.data);
    const entries = parsed?.feed?.entry || [];
    if (!entries.length) return;

    const latest = entries[0];
    const videoId = latest['yt:videoId']?.[0];
    if (!videoId) return;
    if (hasPosted(videoId, 'youtube', guild.id)) return;

    markPosted(videoId, 'youtube', guild.id);

    const title = latest.title?.[0];
    const link = latest.link?.[0]?.$?.href;
    const author = latest.author?.[0]?.name?.[0];
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const pingRole = getConfig(guild.id, 'yt_ping_role');
    const ping = pingRole ? `<@&${pingRole}> ` : '';

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`🎥 New YouTube Video!`)
      .setDescription(`**${title}**\n\n[Watch Now](${link})`)
      .setImage(thumbnail)
      .setFooter({ text: author || 'YouTube' })
      .setTimestamp();

    await ch.send({ content: `${ping}New video from **${author}**!`, embeds: [embed] });
  } catch { /* silent fail */ }
}

// ── Twitch (requires CLIENT_ID + CLIENT_SECRET, uses app token) ───────────────
async function pollTwitch(client, guild) {
  const twitchUser = getConfig(guild.id, 'twitch_username');
  const notifChannel = getConfig(guild.id, 'twitch_notif_channel');
  if (!twitchUser || !notifChannel) return;
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return;

  const ch = guild.channels.cache.get(notifChannel);
  if (!ch) return;

  try {
    // Get app access token
    const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    });
    const token = tokenRes.data.access_token;

    // Check stream status
    const streamRes = await axios.get('https://api.twitch.tv/helix/streams', {
      params: { user_login: twitchUser },
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      },
    });

    const stream = streamRes.data.data?.[0];
    if (!stream) return; // offline

    const streamKey = `twitch_${stream.id}`;
    if (hasPosted(streamKey, 'twitch', guild.id)) return;
    markPosted(streamKey, 'twitch', guild.id);

    const pingRole = getConfig(guild.id, 'twitch_ping_role');
    const ping = pingRole ? `<@&${pingRole}> ` : '';

    const embed = new EmbedBuilder()
      .setColor(0x9146ff)
      .setTitle(`🔴 ${twitchUser} is LIVE on Twitch!`)
      .setDescription(`**${stream.title}**\nPlaying: **${stream.game_name}**\n\n[Watch Live](https://twitch.tv/${twitchUser})`)
      .addFields({ name: '👥 Viewers', value: String(stream.viewer_count), inline: true })
      .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
      .setTimestamp();

    await ch.send({ content: `${ping}**${twitchUser}** just went live!`, embeds: [embed] });
  } catch { /* silent fail */ }
}

// ── TikTok (placeholder — TikTok API requires business account approval) ───────
async function pollTikTok(client, guild) {
  const notifChannel = getConfig(guild.id, 'tiktok_notif_channel');
  if (!notifChannel || !process.env.TIKTOK_ACCESS_TOKEN) return;
  // Implement with official TikTok Content Posting API when approved
  // Endpoint: https://open.tiktokapis.com/v2/video/list/
}

// ── Instagram (placeholder — requires Meta Business API approval) ──────────────
async function pollInstagram(client, guild) {
  const notifChannel = getConfig(guild.id, 'instagram_notif_channel');
  if (!notifChannel || !process.env.INSTAGRAM_ACCESS_TOKEN) return;
  // Implement with Instagram Graph API when approved
  // Endpoint: https://graph.instagram.com/me/media
}

module.exports = { startNotificationPoller };
