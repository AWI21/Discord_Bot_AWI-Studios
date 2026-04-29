const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database/db');

const ACTION_COLORS = {
  ban: 0xef4444,
  kick: 0xf97316,
  mute: 0xf59e0b,
  unmute: 0x22c55e,
  timeout: 0xfbbf24,
  deafen: 0x6366f1,
  warn: 0xeab308,
  purge: 0x64748b,
  move: 0x06b6d4,
  role_add: 0x22c55e,
  role_remove: 0xef4444,
  slowmode: 0x8b5cf6,
};

const ACTION_EMOJIS = {
  ban: '🔨', kick: '👢', mute: '🔇', unmute: '🔊', timeout: '⏰',
  deafen: '🔕', warn: '⚠️', purge: '🧹', move: '📦',
  role_add: '✅', role_remove: '❌', slowmode: '🐢',
};

async function logAction(guild, action, { moderator, target, reason, extra }) {
  const logChannelId = getConfig(guild.id, 'log_channel');
  if (!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId);
  if (!channel) return;

  const emoji = ACTION_EMOJIS[action] || '📋';
  const color = ACTION_COLORS[action] || 0x7c3aed;
  const title = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${emoji} ${title}`)
    .setTimestamp();

  if (target) embed.addFields({ name: '👤 Target', value: `${target} (${target.id || target})`, inline: true });
  if (moderator) embed.addFields({ name: '🛡️ Moderator', value: `${moderator}`, inline: true });
  if (reason) embed.addFields({ name: '📝 Reason', value: reason });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      embed.addFields({ name: k, value: String(v), inline: true });
    }
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logAction };
