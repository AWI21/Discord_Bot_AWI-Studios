const { PermissionFlagsBits } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'deafen',
  description: 'Server deafen a member in voice',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.DeafenMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.DeafenMembers)) return;

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}deafen @user [reason]\``)] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('That member is not in a voice channel.')] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const isDeafened = target.voice.serverDeaf;

    await target.voice.setDeaf(!isDeafened, reason);
    const action = isDeafened ? 'undeafened' : 'deafened';
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been **${action}**.\n**Reason:** ${reason}`)] });
    await logAction(message.guild, 'deafen', { moderator: message.author, target: target.user, reason });
  },
};
