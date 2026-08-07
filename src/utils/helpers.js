const config = require('../config.js');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function requirePerms(message, ...perms) {
  const missing = perms.filter(p => !message.member.permissions.has(p));
  if (missing.length) {
    const names = missing.map(p => Object.keys(PermissionFlagsBits).find(k => PermissionFlagsBits[k] === p) || p);
    message.reply({ content: `❌ You need: **${names.join(', ')}**`, allowedMentions: { repliedUser: false } });
    return false;
  }
  return true;
}

function requireBotPerms(message, ...perms) {
  const missing = perms.filter(p => !message.guild.members.me.permissions.has(p));
  if (missing.length) {
    const names = missing.map(p => Object.keys(PermissionFlagsBits).find(k => PermissionFlagsBits[k] === p) || p);
    message.reply({ content: `❌ I need: **${names.join(', ')}**`, allowedMentions: { repliedUser: false } });
    return false;
  }
  return true;
}

function errorEmbed(msg) {
  return new EmbedBuilder().setColor(config.errorColor).setDescription(`❌ ${msg}`);
}

function successEmbed(msg) {
  return new EmbedBuilder().setColor(config.successColor).setDescription(`✅ ${msg}`);
}

function infoEmbed(msg) {
  return new EmbedBuilder().setColor(config.color).setDescription(msg);
}

function normalizeNewlines(text) {
  if (!text) return text;
  return String(text).replaceAll('\\n', '\n');
}

function toMention(value, wrap) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') {
    const id = value.id;
    return id ? wrap(id) : '';
  }
  const str = String(value);
  if (/^<(@!?|@&|#)\d+>$/.test(str)) return str;
  if (/^\d+$/.test(str)) return wrap(str);
  return str;
}

function formatTemplate(template, data = {}) {
  if (!template) return '';

  let result = String(template)
      .replaceAll('<@{user}>', '{user}')
      .replaceAll('<@{role}>', '{role}')
      .replaceAll('<@&{role}>', '{role}')
      .replaceAll('<@{author}>', '{author}')
      .replaceAll('<@{pingRole}>', '{pingRole}');

  const role = toMention(data.role ?? data.pingRole, id => `<@&${id}>`);

  const values = {
    user: toMention(data.user, id => `<@${id}>`),
    username: data.username || data.user?.username || data.user?.user?.username || '',
    role,
    pingRole: role,
    level: data.level ?? '',
    unlockedText: data.unlockedText ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    author: data.author ?? '',
    actionText: data.actionText ?? 'posted new content',
    title: data.title ?? '',
    link: data.link ?? data.url ?? '',
    url: data.url ?? data.link ?? '',
    guildName: data.guildName ?? data.server ?? '',
    server: data.guildName ?? data.server ?? '',
    memberCount: data.memberCount ?? '',
  };

  for (const [key, val] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, val === null || val === undefined ? '' : String(val));
  }

  return normalizeNewlines(result);
}

async function resolveChannel(guild, rawId, fallback = null) {
  if (!rawId) return fallback;
  const cleanId = String(rawId).replace(/[<#>]/g, '');
  return guild.channels.cache.get(cleanId) || (await guild.channels.fetch(cleanId).catch(() => null)) || fallback;
}

module.exports = {
  requirePerms, requireBotPerms, errorEmbed, successEmbed, infoEmbed,
  formatTemplate, normalizeNewlines, resolveChannel,
};