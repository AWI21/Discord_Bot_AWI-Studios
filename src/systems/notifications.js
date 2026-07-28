const axios = require('axios');
const xml2js = require('xml2js');
const { getConfig, hasPosted, markPosted } = require('../database/db');
const config = require('../config');

const POLL_INTERVAL = 5 * 60 * 1000;

function startNotificationPoller(client) {
  setTimeout(() => pollAll(client), 10_000);
  setInterval(() => pollAll(client), POLL_INTERVAL);
  console.log('📡 Notification poller started (immediate + 5min interval)');
}

async function pollAll(client) {
  console.log('🔍 [System Poller] Beginning scanning cycle for social media streams...');
  for (const guild of client.guilds.cache.values()) {
    await pollYouTube(client, guild).catch(err => console.error(`[YouTube poll error][${guild.name}]`, err.message));
    await pollTwitch(client, guild).catch(err => console.error(`[Twitch poll error][${guild.name}]`, err.message));
    await pollTikTok(client, guild).catch(() => {});
    await pollInstagram(client, guild).catch(() => {});
  }
}

async function pollYouTube(client, guild) {
  const channelIdsRaw = await getConfig(guild.id, 'yt_channel_id');
  const notifChannelId = await getConfig(guild.id, 'yt_notif_channel');

  if (!channelIdsRaw || !notifChannelId) return;

  const discordChannel = guild.channels.cache.get(notifChannelId) ||
      await guild.channels.fetch(notifChannelId).catch(() => null);

  if (!discordChannel) return;

  const ytChannelIds = channelIdsRaw.split(',').map(s => s.trim()).filter(Boolean);

  for (const ytChannelId of ytChannelIds) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannelId}`;

      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        validateStatus: () => true,
      });

      if (res.status !== 200) continue;

      let parsed;
      try {
        parsed = await xml2js.parseStringPromise(res.data);
      } catch (parseErr) {
        continue;
      }

      const entries = parsed?.feed?.entry || [];
      if (!entries.length) continue;

      const latest = entries[0];
      const videoId = latest['yt:videoId']?.[0];
      if (!videoId) continue;

      if (await hasPosted(videoId, 'youtube', guild.id)) continue;

      const title = latest.title?.[0] || 'New Video';
      const link = latest.link?.[0]?.$?.href || `https://www.youtube.com/watch?v=${videoId}`;
      const author = latest.author?.[0]?.name?.[0] || 'YouTube';

      const pingRole = await getConfig(guild.id, 'yt_ping_role');

      let actionText = 'uploaded a video';
      if (link.includes('/shorts/')) {
        actionText = 'posted a short';
      } else if (link.includes('live') || latest.isLive) {
        actionText = 'went live';
      }

      // Check DB for server custom message -> fallback to config default
      const customMsg = await getConfig(guild.id, 'yt_notif_msg');
      const template = customMsg || config.ytNotifMsg;

      const messageContent = config.formatMsg(template, {
        pingRole,
        author,
        actionText,
        title,
        link,
        guildName: guild.name
      });

      await discordChannel.send({ content: messageContent });
      await markPosted(videoId, 'youtube', guild.id);

      console.log(`[YouTube] ✅ Alert posted successfully: "${title}" (${videoId}) inside guild: ${guild.name}`);

    } catch (err) {
      console.error(`[YouTube] Error processing channel ${ytChannelId} for guild ${guild.name}: ${err.message}`);
    }
  }
}

async function pollTwitch(client, guild) {
  const twitchUsersRaw = await getConfig(guild.id, 'twitch_username');
  const notifChannelId = await getConfig(guild.id, 'twitch_notif_channel');
  if (!twitchUsersRaw || !notifChannelId) return;
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return;

  const discordChannel = guild.channels.cache.get(notifChannelId) ||
      await guild.channels.fetch(notifChannelId).catch(() => null);
  if (!discordChannel) return;

  let token;
  try {
    const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
      timeout: 10000,
    });
    token = tokenRes.data.access_token;
  } catch (err) {
    console.error('[Twitch] Failed to acquire token:', err.message);
    return;
  }

  const twitchUsers = twitchUsersRaw.split(',').map(s => s.trim()).filter(Boolean);

  for (const twitchUser of twitchUsers) {
    try {
      const streamRes = await axios.get('https://api.twitch.tv/helix/streams', {
        params: { user_login: twitchUser },
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      const stream = streamRes.data.data?.[0];
      if (!stream) continue;

      const streamKey = `twitch_${stream.id}`;
      if (await hasPosted(streamKey, 'twitch', guild.id)) continue;

      const pingRole = await getConfig(guild.id, 'twitch_ping_role');
      const link = `https://twitch.tv/${twitchUser}`;

      const customMsg = await getConfig(guild.id, 'twitch_notif_msg');
      const template = customMsg || config.twitchNotifMsg;

      const messageContent = config.formatMsg(template, {
        pingRole,
        author: stream.user_name || twitchUser,
        actionText: 'went live on Twitch',
        title: stream.title || 'Live Stream',
        link,
        guildName: guild.name
      });

      await discordChannel.send({ content: messageContent });
      await markPosted(streamKey, 'twitch', guild.id);

      console.log(`[Twitch] ✅ Alert posted successfully: ${twitchUser} (${stream.id}) inside guild: ${guild.name}`);
    } catch (err) {
      console.error(`[Twitch] Error for user ${twitchUser} in guild ${guild.name}: ${err.message}`);
    }
  }
}

async function pollTikTok(client, guild) {
  const notifChannelId = await getConfig(guild.id, 'tiktok_notif_channel');
  if (!notifChannelId || !process.env.TIKTOK_ACCESS_TOKEN) return;
}

async function pollInstagram(client, guild) {
  const notifChannelId = await getConfig(guild.id, 'instagram_notif_channel');
  if (!notifChannelId || !process.env.INSTAGRAM_ACCESS_TOKEN) return;
}

module.exports = { startNotificationPoller };