const { PermissionFlagsBits } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'move',
  description: 'Move a member to another voice channel',
  usage: '!move @user <#channel>',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.MoveMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.MoveMembers)) return;

    const target = message.mentions.members.first();
    const targetChannel = message.mentions.channels.first();
    if (!target || !targetChannel) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}move @user #voice-channel\``)] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('That member is not in a voice channel.')] });

    const reason = args.slice(2).join(' ') || 'No reason provided';

    await target.voice.setChannel(targetChannel, reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** moved to **${targetChannel.name}**.`)] });
    await logAction(message.guild, 'move', { moderator: message.author, target: target.user, reason, extra: { Channel: targetChannel.name } });
  },
};
