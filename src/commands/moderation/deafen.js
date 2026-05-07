const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'deafen',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('deafen')
    .setDescription('Server deafen/undeafen a member in voice')
    .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to deafen/undeafen').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.DeafenMembers)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.DeafenMembers)) return;
    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}deafen @user [reason]\``)] });
    if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('That member is not in a voice channel.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';
    const result = await _doDeafen(message.guild, target, message.author, reason);
    await message.reply({ embeds: [successEmbed(`**${target.user.tag}** has been **${result}**.\n**Reason:** ${reason}`)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target?.voice?.channel) return interaction.editReply({ embeds: [errorEmbed('That member is not in a voice channel.')] });
    const result = await _doDeafen(interaction.guild, target, interaction.user, reason);
    await interaction.editReply({ embeds: [successEmbed(`**${target.user.tag}** has been **${result}**.\n**Reason:** ${reason}`)] });
  },
};

async function _doDeafen(guild, target, moderator, reason) {
  const isDeafened = target.voice.serverDeaf;
  const action = isDeafened ? 'undeafened' : 'deafened';
  await target.voice.setDeaf(!isDeafened, reason);
  if (!isDeafened) {
    await target.send({ embeds: [new EmbedBuilder().setColor(0x6366f1).setTitle('🔕 You have been server deafened')
      .setDescription(`You have been **server deafened** in **${guild.name}**.`)
      .addFields({ name: '📝 Reason', value: reason }, { name: '🛡️ Moderator', value: moderator.tag })
      .setTimestamp()] }).catch(() => {});
  }
  await logAction(guild, 'deafen', { moderator, target: target.user, reason });
  return action;
}
