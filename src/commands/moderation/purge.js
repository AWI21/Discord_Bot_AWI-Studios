const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'purge',
  modOnly: true,
  aliases: ['clear', 'prune'],
  slashData: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageMessages)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ManageMessages)) return;
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}purge <1-100> [@user]\``)] });
    const filterUser = message.mentions.users.first();
    await message.delete().catch(() => {});
    const count = await _doPurge(message.channel, amount, filterUser, message.author, message.guild);
    const msg = await message.channel.send({ embeds: [successEmbed(`Deleted **${count}** message(s)${filterUser ? ` from **${filterUser.tag}**` : ''}.`)] });
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const amount = interaction.options.getInteger('amount');
    const filterUser = interaction.options.getUser('user');
    const count = await _doPurge(interaction.channel, amount, filterUser, interaction.user, interaction.guild);
    await interaction.editReply({ embeds: [successEmbed(`Deleted **${count}** message(s)${filterUser ? ` from **${filterUser.tag}**` : ''}.`)] });
  },
};

async function _doPurge(channel, amount, filterUser, moderator, guild) {
  let messages = await channel.messages.fetch({ limit: 100 });
  if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo).first(amount);
  const deleted = await channel.bulkDelete(messages, true).catch(() => null);
  const count = deleted?.size || 0;
  await logAction(guild, 'purge', { moderator, target: filterUser, reason: `Purged ${count} messages`, extra: { Channel: channel.name } });
  return count;
}
