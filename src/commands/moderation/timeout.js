const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

const DURATIONS = { s: 1000, m: 60000, h: 3600000, d: 86400000 };

function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  return parseInt(match[1]) * DURATIONS[match[2].toLowerCase()];
}

module.exports = {
  name: 'timeout',
  description: 'Timeout a member',
  usage: '!timeout @user 10m [reason]',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ModerateMembers)) return;

    const target = message.mentions.members.first();
    if (!target || !args[1]) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}timeout @user <duration: 10s/5m/2h/1d> [reason]\``)] });

    const duration = parseDuration(args[1]);
    if (!duration) return message.reply({ embeds: [errorEmbed('Invalid duration. Use: `10s`, `5m`, `2h`, `1d`')] });
    if (duration > 2419200000) return message.reply({ embeds: [errorEmbed('Maximum timeout is 28 days.')] });

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      await target.timeout(duration, `${message.author.tag}: ${reason}`);
      const readableDur = args[1];
      await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been timed out for **${readableDur}**.\n**Reason:** ${reason}`)] });
      await logAction(message.guild, 'timeout', { moderator: message.author, target: target.user, reason, extra: { Duration: readableDur } });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to timeout that member.')] });
    }
  },
};
