const config = require('../../config.js');
const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, errorEmbed } = require('../../utils/helpers');
const { getWarnings, clearWarnings, removeWarning } = require('../../database/db');

module.exports = {
  name: 'warnings',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or manage member warnings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(s => s.setName('list').setDescription('List warnings for a user').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand(s => s.setName('clear').setDescription('Clear all warnings for a user').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a specific warning by ID').addIntegerOption(o => o.setName('id').setDescription('Warning ID').setRequired(true))),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;
    const sub = args[0]?.toLowerCase();
    if (sub === 'clear') {
      const t = message.mentions.members.first();
      if (!t) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warnings clear @user\``)] });
      clearWarnings(t.id, message.guild.id);
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setDescription(`✅ Cleared all warnings for **${t.user.tag}**.`)] });
    }
    if (sub === 'remove') {
      const id = parseInt(args[1]);
      if (!id) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warnings remove <id>\``)] });
      removeWarning(id);
      return message.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setDescription(`✅ Removed warning **#${id}**.`)] });
    }
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warnings @user\``)] });
    return message.reply({ embeds: [buildWarnEmbed(target.user, getWarnings(target.id, message.guild.id))] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    if (sub === 'list') {
      const target = interaction.options.getUser('user');
      const warns = getWarnings(target.id, interaction.guild.id);
      return interaction.editReply({ embeds: [buildWarnEmbed(target, warns)] });
    }
    if (sub === 'clear') {
      const target = interaction.options.getUser('user');
      clearWarnings(target.id, interaction.guild.id);
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.successColor).setDescription(`✅ Cleared all warnings for **${target.tag}**.`)] });
    }
    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      removeWarning(id);
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.successColor).setDescription(`✅ Removed warning **#${id}**.`)] });
    }
  },
};

function buildWarnEmbed(user, warns) {
  const embed = new EmbedBuilder().setColor(0xeab308).setTitle(`⚠️ Warnings for ${user.tag}`).setThumbnail(user.displayAvatarURL({ dynamic: true })).setFooter({ text: `Total: ${warns.length}` });
  embed.setDescription(warns.length ? warns.slice(0, 10).map(w => `**#${w.id}** — <@${w.moderator_id}>\n${w.reason}\n<t:${Math.floor(w.timestamp / 1000)}:R>`).join('\n\n') : 'No warnings on record.');
  return embed;
}
