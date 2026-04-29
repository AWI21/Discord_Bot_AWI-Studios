const { PermissionFlagsBits } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'slowmode',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageChannels)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ManageChannels)) return;

    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}slowmode <0-21600 seconds> [reason]\`\nUse 0 to disable.`)] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await message.channel.setRateLimitPerUser(seconds, `${message.author.tag}: ${reason}`);

    const msg = seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to **${seconds}s**.`;
    await message.reply({ embeds: [successEmbed(`${msg}\n**Reason:** ${reason}`)] });
    await logAction(message.guild, 'slowmode', { moderator: message.author, reason, extra: { Channel: message.channel.name, Seconds: seconds } });
  },
};
