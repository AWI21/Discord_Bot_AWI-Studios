const config = require('../../config.js');
const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'ban',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.BanMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.BanMembers)) return;
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}ban @user [reason]\``)] });
    if (!target.bannable) return message.reply({ embeds: [errorEmbed('I cannot ban this member.')] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('You cannot ban yourself.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await _doBan(message.guild, target, message.author, reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.editReply({ embeds: [errorEmbed('Member not found.')] });
    if (!target.bannable) return interaction.editReply({ embeds: [errorEmbed('I cannot ban this member.')] });
    if (target.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed('You cannot ban yourself.')] });
    await _doBan(interaction.guild, target, interaction.user, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** has been banned.\n**Reason:** ${reason}`)] });
  },
};

async function _doBan(guild, target, moderator, reason) {
  await target.send({ embeds: [new EmbedBuilder().setColor(config.errorColor).setTitle('🔨 You have been banned')
    .setDescription(`You have been **permanently banned** from **${guild.name}**.`)
    .addFields({ name: '📝 Reason', value: reason }, { name: '🛡️ Moderator', value: moderator.tag })
    .setTimestamp()] }).catch(() => {});
  await target.ban({ reason: `${moderator.tag}: ${reason}` });
  await logAction(guild, 'ban', { moderator, target: target.user, reason });
}
