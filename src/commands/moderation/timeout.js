const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

const DURATIONS = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
function parseDuration(str) {
  const match = str?.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  return parseInt(match[1]) * DURATIONS[match[2].toLowerCase()];
}

module.exports = {
  name: 'timeout',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration: 10s, 5m, 2h, 1d (max 28d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ModerateMembers)) return;
    const target = message.mentions.members.first();
    if (!target || !args[1]) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}timeout @user <10s/5m/2h/1d> [reason]\``)] });
    const duration = parseDuration(args[1]);
    if (!duration) return message.reply({ embeds: [errorEmbed('Invalid duration. Use: `10s`, `5m`, `2h`, `1d`')] });
    if (duration > 2419200000) return message.reply({ embeds: [errorEmbed('Maximum timeout is 28 days.')] });
    const reason = args.slice(2).join(' ') || 'No reason provided';
    await _doTimeout(message.guild, target, message.author, duration, args[1], reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** timed out for **${args[1]}**.\n**Reason:** ${reason}`)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const durStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const duration = parseDuration(durStr);
    if (!duration) return interaction.editReply({ embeds: [errorEmbed('Invalid duration. Use: `10s`, `5m`, `2h`, `1d`')] });
    if (duration > 2419200000) return interaction.editReply({ embeds: [errorEmbed('Maximum timeout is 28 days.')] });
    await _doTimeout(interaction.guild, target, interaction.user, duration, durStr, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** timed out for **${durStr}**.\n**Reason:** ${reason}`)] });
  },
};

async function _doTimeout(guild, target, moderator, duration, readableDur, reason) {
  await target.send({ embeds: [new EmbedBuilder().setColor(0xfbbf24).setTitle('⏰ You have been timed out')
    .setDescription(`You have been **timed out** in **${guild.name}** for **${readableDur}**.`)
    .addFields({ name: '📝 Reason', value: reason }, { name: '🛡️ Moderator', value: moderator.tag }, { name: '⏱️ Duration', value: readableDur })
    .setTimestamp()] }).catch(() => {});
  await target.timeout(duration, `${moderator.tag}: ${reason}`);
  await logAction(guild, 'timeout', { moderator, target: target.user, reason, extra: { Duration: readableDur } });
}
