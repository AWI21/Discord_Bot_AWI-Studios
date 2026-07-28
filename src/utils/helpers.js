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

module.exports = { requirePerms, requireBotPerms, errorEmbed, successEmbed, infoEmbed };
