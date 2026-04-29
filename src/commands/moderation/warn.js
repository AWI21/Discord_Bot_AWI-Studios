const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { addWarning, getWarnings, clearWarnings, removeWarning } = require('../../database/db');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'warn',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warn @user <reason>\``)] });

    const reason = args.slice(1).join(' ');
    if (!reason) return message.reply({ embeds: [errorEmbed('A reason is required for warnings.')] });

    addWarning(target.id, message.guild.id, reason, message.author.id);
    const allWarnings = getWarnings(target.id, message.guild.id);

    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been warned.\n**Reason:** ${reason}\n**Total warnings:** ${allWarnings.length}`)] });
    await logAction(message.guild, 'warn', { moderator: message.author, target: target.user, reason, extra: { 'Total Warnings': allWarnings.length } });

    try {
      await target.send({ embeds: [new EmbedBuilder().setColor(0xeab308).setTitle('⚠️ You have been warned').setDescription(`**Server:** ${message.guild.name}\n**Reason:** ${reason}\n**Total warnings:** ${allWarnings.length}`)] });
    } catch {}
  },
};
