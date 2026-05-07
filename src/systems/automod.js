const { PermissionFlagsBits } = require('discord.js');
const { getBannedWords, getConfig } = require('../database/db');
const { logAction } = require('../utils/logger');

const URL_REGEX = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+/gi;
const DISCORD_INVITE_REGEX = /discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+/gi;
const GIF_REGEX = /https?:\/\/(tenor\.com|giphy\.com|media\.giphy\.com|media\.tenor\.com|i\.imgur\.com\/[^\s]+\.gif|cdn\.discordapp\.com\/[^\s]+\.gif)[^\s]*/gi;

function isGifOnly(content) {
  const urls = content.match(URL_REGEX) || [];
  if (!urls.length) return false;
  return urls.every(url => { GIF_REGEX.lastIndex = 0; return GIF_REGEX.test(url); });
}

async function handleAutomod(message, client) {
  if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const guildId = message.guild.id;
  const content = message.content;

  // 1. Banned words
  const bannedWords = await getBannedWords(guildId);
  if (bannedWords.length) {
    const found = bannedWords.find(w => content.toLowerCase().includes(w));
    if (found) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send({ content: `⚠️ ${message.author} Your message was removed — it contained a banned word.` });
      setTimeout(() => warn.delete().catch(() => {}), 5000);
      await logAction(message.guild, 'automod_word', { moderator: client.user, target: message.author, reason: `Banned word: "${found}"`, extra: { Channel: message.channel.name } });
      return;
    }
  }

  // 2. Discord invites — never allowed
  DISCORD_INVITE_REGEX.lastIndex = 0;
  if (DISCORD_INVITE_REGEX.test(content)) {
    await message.delete().catch(() => {});
    const warn = await message.channel.send({ content: `🚫 ${message.author} Discord invite links are not allowed in this server.` });
    setTimeout(() => warn.delete().catch(() => {}), 6000);
    await logAction(message.guild, 'automod_discord_link', { moderator: client.user, target: message.author, reason: 'Posted a Discord invite link', extra: { Channel: message.channel.name } });
    return;
  }

  // 3. General link filter
  URL_REGEX.lastIndex = 0;
  if (!URL_REGEX.test(content)) return;

  const allowedLinkChannelsRaw = await getConfig(guildId, 'allowed_link_channels') || '';
  const allowedLinkChannels = allowedLinkChannelsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (allowedLinkChannels.includes(message.channel.id)) return;
  if (isGifOnly(content)) return;

  await message.delete().catch(() => {});
  const hint = allowedLinkChannels.length ? ` Links are only allowed in: ${allowedLinkChannels.map(id => `<#${id}>`).join(', ')}` : '';
  const warn = await message.channel.send({ content: `🔗 ${message.author} Links are not allowed in this channel.${hint}` });
  setTimeout(() => warn.delete().catch(() => {}), 7000);
  await logAction(message.guild, 'automod_link', { moderator: client.user, target: message.author, reason: 'Posted a link in a non-allowed channel', extra: { Channel: message.channel.name } });
}

module.exports = { handleAutomod };
