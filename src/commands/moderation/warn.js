const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { addWarning, getWarnings } = require('../../database/db');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'warn',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warn @user <reason>\``)] });
    const reason = args.slice(1).join(' ');
    if (!reason) return message.reply({ embeds: [errorEmbed('A reason is required.')] });
    const total = await _doWarn(message.guild, target, message.author, reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** warned.\n**Reason:** ${reason}\n**Total:** ${total}`)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason');
    const total = await _doWarn(interaction.guild, target, interaction.user, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** warned.\n**Reason:** ${reason}\n**Total warnings:** ${total}`)] });
  },
};

async function _doWarn(guild, target, moderator, reason) {
  addWarning(target.id, guild.id, reason, moderator.id);
  const all = getWarnings(target.id, guild.id);
  await target.send({ embeds: [new EmbedBuilder().setColor(0xeab308).setTitle('⚠️ You have received a warning')
    .setDescription(`You have been **warned** in **${guild.name}**.\nPlease follow the server rules.`)
    .addFields({ name: '📝 Reason', value: reason }, { name: '🛡️ Moderator', value: moderator.tag }, { name: '⚠️ Total Warnings', value: String(all.length) })
    .setFooter({ text: 'Continued violations may result in further action.' }).setTimestamp()] }).catch(() => {});
  await logAction(guild, 'warn', { moderator, target: target.user, reason, extra: { 'Total Warnings': all.length } });
  return all.length;
}
