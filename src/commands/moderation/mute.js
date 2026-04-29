// mute.js
const { PermissionFlagsBits } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'mute',
  description: 'Server mute a member in voice',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.MuteMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.MuteMembers)) return;

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}mute @user [reason]\``)] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('That member is not in a voice channel.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const isMuted = target.voice.serverMute;

    await target.voice.setMute(!isMuted, reason);
    const action = isMuted ? 'unmuted' : 'muted';
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been **${action}**.\n**Reason:** ${reason}`)] });
    await logAction(message.guild, isMuted ? 'unmute' : 'mute', { moderator: message.author, target: target.user, reason });
  },
};
