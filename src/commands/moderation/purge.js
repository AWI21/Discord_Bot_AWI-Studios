const { PermissionFlagsBits } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageMessages)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ManageMessages)) return;

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}purge <1-100> [@user]\``)] });
    }

    const filterUser = message.mentions.users.first();
    await message.delete().catch(() => {});

    let messages = await message.channel.messages.fetch({ limit: 100 });

    // Filter by user if mentioned
    if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);

    // Only messages < 14 days old (Discord limitation)
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo).first(amount);

    const deleted = await message.channel.bulkDelete(messages, true).catch(() => null);
    const count = deleted?.size || 0;

    const msg = await message.channel.send({ embeds: [successEmbed(`Deleted **${count}** message(s)${filterUser ? ` from **${filterUser.tag}**` : ''}.`)] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);

    await logAction(message.guild, 'purge', {
      moderator: message.author,
      target: filterUser,
      reason: `Purged ${count} messages`,
      extra: { Channel: message.channel.name },
    });
  },
};
