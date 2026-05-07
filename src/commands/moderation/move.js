const { PermissionFlagsBits, SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'move',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a member to another voice channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to move').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Target voice channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

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

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const targetChannel = interaction.options.getChannel('channel');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target?.voice?.channel) return interaction.editReply({ embeds: [errorEmbed('That member is not in a voice channel.')] });
    await target.voice.setChannel(targetChannel, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** moved to **${targetChannel.name}**.`)] });
    await logAction(interaction.guild, 'move', { moderator: interaction.user, target: target.user, reason, extra: { Channel: targetChannel.name } });
  },
};
