const axios = require('axios');
const xml2js = require('xml2js');
const { EmbedBuilder } = require('discord.js');
const { getConfig, hasPosted, markPosted } = require('../database/db');

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function startNotificationPoller(client) {
  // Poll immediately on startup, then every 5 minutes
  setTimeout(() => pollAll(client), 10_000); // 10s after ready
  setInterval(() => pollAll(client), POLL_INTERVAL);
  console.log('📡 Notification poller started (immediate + 5min interval)');
}

async function pollAll(client) {
  for (const guild of client.guilds.cache.values()) {
    await pollYouTube(client, guild).catch(err => console.error(`[YouTube poll error][${guild.name}]`, err.message));
    await pollTwitch(client, guild).catch(err => console.error(`[Twitch poll error][${guild.name}]`, err.message));
    await pollTikTok(client, guild).catch(() => {});
    await pollInstagram(client, guild).catch(() => {});
  }
}

// ── YouTube ───────────────────────────────────────────────────────────────────
// Supports multiple channel IDs separated by commas:
//   !config yt-channel-id UCaaa,UCbbb,UCccc
// Each channel gets its OWN notif channel config:
//   yt_notif_channel      (default for all)
//   yt_notif_channel_2    (optional per-channel overrides if needed)
// Ping role:
//   yt_ping_role (single role pings for all YT channels)

async function pollYouTube(client, guild) {
  const channelIdsRaw = getConfig(guild.id, 'yt_channel_id');
  const notifChannelId = getConfig(guild.id, 'yt_notif_channel');

  if (!channelIdsRaw || !notifChannelId) return;

  const discordChannel = guild.channels.cache.get(notifChannelId);
  if (!discordChannel) {
    console.warn(`[YouTube] Discord channel ${notifChannelId} not found in guild ${guild.name}`);
    return;
  }

  // Support multiple YouTube channel IDs comma-separated
  const ytChannelIds = channelIdsRaw.split(',').map(s => s.trim()).filter(Boolean);

  for (const ytChannelId of ytChannelIds) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannelId}`;

      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          // Spoof a real browser to avoid YouTube blocking cloud IPs
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        // Don't throw on 4xx/5xx — handle manually so we can log the status
        validateStatus: () => true,
      });

      if (res.status !== 200) {
        console.warn(`[YouTube] Feed returned HTTP ${res.status} for channel ${ytChannelId} in guild ${guild.name}`);
        continue;
      }

      let parsed;
      try {
        parsed = await xml2js.parseStringPromise(res.data);
      } catch (parseErr) {
        console.error(`[YouTube] XML parse error for ${ytChannelId}: ${parseErr.message}`);
        console.error(`[YouTube] Raw response (first 500 chars): ${String(res.data).substring(0, 500)}`);
        continue;
      }

      const entries = parsed?.feed?.entry || [];
      if (!entries.length) {
        console.log(`[YouTube] No entries found for channel ${ytChannelId} — channel may be empty or ID wrong`);
        continue;
      }

      const latest = entries[0];
      const videoId = latest['yt:videoId']?.[0];
      if (!videoId) {
        console.warn(`[YouTube] No videoId found in latest entry for ${ytChannelId}`);
        continue;
      }

      // Already posted — skip
      if (hasPosted(videoId, 'youtube', guild.id)) continue;

      const title = latest.title?.[0] || 'New Video';
      const link = latest.link?.[0]?.$?.href || `https://www.youtube.com/watch?v=${videoId}`;
      const author = latest.author?.[0]?.name?.[0] || 'YouTube';
      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const published = latest.published?.[0];

      const pingRole = getConfig(guild.id, 'yt_ping_role');
      const pingContent = pingRole ? `<@&${pingRole}> ` : '';

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎥 New YouTube Video!')
        .setDescription(`**[${title}](${link})**`)
        .setImage(thumbnail)
        .setAuthor({ name: author, iconURL: 'https://www.youtube.com/favicon.ico', url: `https://www.youtube.com/channel/${ytChannelId}` })
        .addFields({ name: '📺 Watch Now', value: link })
        .setFooter({ text: 'YouTube Notification' })
        .setTimestamp(published ? new Date(published) : new Date());

      // Send FIRST, then mark as posted — so a failed send doesn't permanently skip the video
      await discordChannel.send({ content: `${pingContent}🎥 **${author}** just uploaded a new video!`, embeds: [embed] });
      markPosted(videoId, 'youtube', guild.id);

      console.log(`[YouTube] ✅ Posted "${title}" (${videoId}) for guild ${guild.name}`);

    } catch (err) {
      console.error(`[YouTube] Error processing channel ${ytChannelId} for guild ${guild.name}: ${err.message}`);
    }
  }
}

// ── Twitch ────────────────────────────────────────────────────────────────────
// Supports multiple Twitch usernames comma-separated:
//   !config twitch-username streamer1,streamer2
async function pollTwitch(client, guild) {
  const twitchUsersRaw = getConfig(guild.id, 'twitch_username');
  const notifChannelId = getConfig(guild.id, 'twitch_notif_channel');
  if (!twitchUsersRaw || !notifChannelId) return;
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return;

  const discordChannel = guild.channels.cache.get(notifChannelId);
  if (!discordChannel) return;

  // Get app access token (one token for all usernames)
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
    console.error('[Twitch] Failed to get access token:', err.message);
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
      if (!stream) continue; // offline

      const streamKey = `twitch_${stream.id}`;
      if (hasPosted(streamKey, 'twitch', guild.id)) continue;

      const pingRole = getConfig(guild.id, 'twitch_ping_role');
      const ping = pingRole ? `<@&${pingRole}> ` : '';

      const embed = new EmbedBuilder()
        .setColor(0x9146ff)
        .setTitle(`🔴 ${twitchUser} is LIVE on Twitch!`)
        .setDescription(`**${stream.title}**\nPlaying: **${stream.game_name}**\n\n[Watch Live](https://twitch.tv/${twitchUser})`)
        .addFields({ name: '👥 Viewers', value: String(stream.viewer_count), inline: true })
        .setImage(stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'))
        .setFooter({ text: 'Twitch Notification' })
        .setTimestamp();

      await discordChannel.send({ content: `${ping}🔴 **${twitchUser}** just went live!`, embeds: [embed] });
      markPosted(streamKey, 'twitch', guild.id);

      console.log(`[Twitch] ✅ Posted live notification for ${twitchUser} in guild ${guild.name}`);
    } catch (err) {
      console.error(`[Twitch] Error for user ${twitchUser} in guild ${guild.name}: ${err.message}`);
    }
  }
}

// ── TikTok placeholder ────────────────────────────────────────────────────────
async function pollTikTok(client, guild) {
  if (!getConfig(guild.id, 'tiktok_notif_channel') || !process.env.TIKTOK_ACCESS_TOKEN) return;
}

// ── Instagram placeholder ──────────────────────────────────────────────────────
async function pollInstagram(client, guild) {
  if (!getConfig(guild.id, 'instagram_notif_channel') || !process.env.INSTAGRAM_ACCESS_TOKEN) return;
}

module.exports = { startNotificationPoller };
