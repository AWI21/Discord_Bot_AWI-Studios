const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'kick',
  description: 'Kick a member',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.KickMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.KickMembers)) return;

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}kick @user [reason]\``)] });
    if (!target.kickable) return message.reply({ embeds: [errorEmbed('I cannot kick this member.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await target.send({ embeds: [new EmbedBuilder().setColor(0xf97316).setTitle('👢 You have been kicked').setDescription(`**Server:** ${message.guild.name}\n**Reason:** ${reason}`)] }).catch(() => {});
      await target.kick(`${message.author.tag}: ${reason}`);
      await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
      await logAction(message.guild, 'kick', { moderator: message.author, target: target.user, reason });
    } catch {
      message.reply({ embeds: [errorEmbed('Failed to kick that member.')] });
    }
  },
};
