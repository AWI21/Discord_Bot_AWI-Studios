const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'kick',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.KickMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.KickMembers)) return;
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}kick @user [reason]\``)] });
    if (!target.kickable) return message.reply({ embeds: [errorEmbed('I cannot kick this member.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    await _doKick(message.guild, target, message.author, reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.editReply({ embeds: [errorEmbed('Member not found.')] });
    if (!target.kickable) return interaction.editReply({ embeds: [errorEmbed('I cannot kick this member.')] });
    await _doKick(interaction.guild, target, interaction.user, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}`)] });
  },
};

async function _doKick(guild, target, moderator, reason) {
  await target.send({ embeds: [new EmbedBuilder().setColor(0xf97316).setTitle('👢 You have been kicked')
    .setDescription(`You have been **kicked** from **${guild.name}**.\nYou can rejoin if you have an invite.`)
    .addFields({ name: '📝 Reason', value: reason }, { name: '🛡️ Moderator', value: moderator.tag })
    .setTimestamp()] }).catch(() => {});
  await target.kick(`${moderator.tag}: ${reason}`);
  await logAction(guild, 'kick', { moderator, target: target.user, reason });
}
