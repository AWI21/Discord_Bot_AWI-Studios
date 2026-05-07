const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addCustomCommand, removeCustomCommand, getAllCustomCommands } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'customcmd',
  aliases: ['cc', 'addcmd'],
  slashData: new SlashCommandBuilder()
    .setName('customcmd').setDescription('Manage custom commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('add').setDescription('Add a custom command')
      .addStringOption(o => o.setName('trigger').setDescription('Trigger word').setRequired(true))
      .addStringOption(o => o.setName('response').setDescription('Response text').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a command').addStringOption(o => o.setName('trigger').setDescription('Trigger to remove').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all custom commands')),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
    const sub = args[0]?.toLowerCase();
    if (sub === 'add') {
      const trigger = args[1], response = args.slice(2).join(' ');
      if (!trigger || !response) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customcmd add <trigger> <response>\``)] });
      await addCustomCommand(message.guild.id, trigger, response);
      return message.reply({ embeds: [successEmbed(`Custom command \`${prefix}${trigger}\` created!`)] });
    }
    if (sub === 'remove' || sub === 'delete') {
      const trigger = args[1];
      if (!trigger) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customcmd remove <trigger>\``)] });
      const result = await removeCustomCommand(message.guild.id, trigger);
      if (result.changes === 0) return message.reply({ embeds: [errorEmbed(`Command not found.`)] });
      return message.reply({ embeds: [successEmbed(`Command \`${prefix}${trigger}\` removed.`)] });
    }
    return message.reply({ embeds: [await buildListEmbed(message.guild, prefix)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger');
      const response = interaction.options.getString('response');
      await addCustomCommand(interaction.guild.id, trigger, response);
      return interaction.editReply({ embeds: [successEmbed(`Custom command \`!${trigger}\` created!`)] });
    }
    if (sub === 'remove') {
      const trigger = interaction.options.getString('trigger');
      const result = await removeCustomCommand(interaction.guild.id, trigger);
      if (result.changes === 0) return interaction.editReply({ embeds: [errorEmbed(`Command not found.`)] });
      return interaction.editReply({ embeds: [successEmbed(`Command \`!${trigger}\` removed.`)] });
    }
    return interaction.editReply({ embeds: [await buildListEmbed(interaction.guild, '!')] });
  },
};

async function buildListEmbed(guild, prefix) {
  const cmds = await getAllCustomCommands(guild.id);
  return new EmbedBuilder().setColor(0x7c3aed).setTitle(`🔧 Custom Commands (${cmds.length})`)
    .setDescription(cmds.length ? cmds.map(c => `\`${prefix}${c.trigger}\` → ${c.response.substring(0, 60)}${c.response.length > 60 ? '...' : ''}`).join('\n') : 'No custom commands yet.');
}
