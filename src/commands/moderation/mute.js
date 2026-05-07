const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'mute',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Server mute/unmute a member in voice')
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to mute/unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.MuteMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.MuteMembers)) return;
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}mute @user [reason]\``)] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('That member is not in a voice channel.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    const result = await _doMute(message.guild, target, message.author, reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been **${result}**.\n**Reason:** ${reason}`)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target?.voice?.channel) return interaction.editReply({ embeds: [errorEmbed('That member is not in a voice channel.')] });
    const result = await _doMute(interaction.guild, target, interaction.user, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** has been **${result}**.\n**Reason:** ${reason}`)] });
  },
};

async function _doMute(guild, target, moderator, reason) {
  const isMuted = target.voice.serverMute;
  const action = isMuted ? 'unmuted' : 'muted';
  await target.voice.setMute(!isMuted, reason);
  if (!isMuted) {
    await target.send({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setTitle('🔇 You have been server muted')
      .setDescription(`You have been **server muted** in **${guild.name}**.`)
      .addFields({ name: '📝 Reason', value: reason }, { name: '🛡️ Moderator', value: moderator.tag })
      .setTimestamp()] }).catch(() => {});
  }
  await logAction(guild, isMuted ? 'unmute' : 'mute', { moderator, target: target.user, reason });
  return action;
}
