const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'ban',
  description: 'Ban a member',
  usage: '!ban @user [reason]',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.BanMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.BanMembers)) return;

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}ban @user [reason]\``)] });
    if (!target.bannable) return message.reply({ embeds: [errorEmbed('I cannot ban this member.')] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('You cannot ban yourself.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await target.send({ embeds: [new EmbedBuilder().setColor(0xef4444).setTitle('🔨 You have been banned').setDescription(`**Server:** ${message.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${message.author.tag}`)] }).catch(() => {});
      await target.ban({ reason: `${message.author.tag}: ${reason}` });

      await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)] });
      await logAction(message.guild, 'ban', { moderator: message.author, target: target.user, reason });
    } catch (e) {
      message.reply({ embeds: [errorEmbed('Failed to ban that member.')] });
    }
  },
};
