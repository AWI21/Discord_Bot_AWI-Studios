const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'slowmode',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 to disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageChannels)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ManageChannels)) return;
    const seconds = parseInt(args[0]);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}slowmode <0-21600> [reason]\``)] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await message.channel.setRateLimitPerUser(seconds, `${message.author.tag}: ${reason}`);
    await message.reply({ embeds: [successEmbed(`${seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to **${seconds}s**.`}\n**Reason:** ${reason}`)] });
    await logAction(message.guild, 'slowmode', { moderator: message.author, reason, extra: { Channel: message.channel.name, Seconds: seconds } });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const seconds = interaction.options.getInteger('seconds');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    await interaction.channel.setRateLimitPerUser(seconds, `${interaction.user.tag}: ${reason}`);
    await interaction.editReply({ embeds: [successEmbed(`${seconds === 0 ? 'Slowmode disabled.' : `Slowmode set to **${seconds}s**.`}\n**Reason:** ${reason}`)] });
    await logAction(interaction.guild, 'slowmode', { moderator: interaction.user, reason, extra: { Channel: interaction.channel.name, Seconds: seconds } });
  },
};
