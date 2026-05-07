const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addVouch, getVouches, getConfig } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'vouch',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('vouch').setDescription('Give vouch points to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to vouch for').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('Points (1-100)').setRequired(false).setMinValue(1).setMaxValue(100)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;
    const target = message.mentions.members.first();
    const points = parseInt(args[1]) || 1;
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}vouch @user [points]\``)] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('You cannot vouch for yourself.')] });
    const result = await _doVouch(message.guild, target, message.author, points);
    await message.reply({ embeds: [successEmbed(result)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const points = interaction.options.getInteger('points') || 1;
    if (target.id === interaction.user.id) return interaction.editReply({ embeds: [errorEmbed('You cannot vouch for yourself.')] });
    const result = await _doVouch(interaction.guild, target, interaction.user, points);
    await interaction.editReply({ embeds: [successEmbed(result)] });
  },
};

async function _doVouch(guild, target, giver, points) {
  await addVouch(target.id, guild.id, points, giver.id);
  const userData = await getVouches(target.id, guild.id);
  const trustedRoleId = await getConfig(guild.id, 'trusted_fan_role');
  const trustedThreshold = parseInt(await getConfig(guild.id, 'trusted_fan_threshold')) || 10;
  if (trustedRoleId && userData.points >= trustedThreshold) {
    const role = guild.roles.cache.get(trustedRoleId);
    const member = guild.members.cache.get(target.id);
    if (role && member && !member.roles.cache.has(trustedRoleId)) await member.roles.add(role).catch(() => {});
  }
  return `Vouched **+${points}** point(s) for **${target.user.tag}**.\nThey now have **${userData.points}** total vouch points.`;
}
