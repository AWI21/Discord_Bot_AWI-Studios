const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addCustomCommand, removeCustomCommand, getAllCustomCommands } = require('../../database/db');
const { successEmbed, errorEmbed, requirePerms } = require('../../utils/helpers');

module.exports = {
  name: 'customcmd',
  aliases: ['cc', 'addcmd'],
  // ── Slash Command Builder ──────────────────────────────────────────────────
  slashData: new SlashCommandBuilder()
      .setName('customcmd').setDescription('Manage custom commands')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(s => s.setName('add').setDescription('Add a custom command')
          .addStringOption(o => o.setName('trigger').setDescription('Trigger word').setRequired(true))
          .addStringOption(o => o.setName('response').setDescription('Response text').setRequired(true))
          .addRoleOption(o => o.setName('role').setDescription('Optional: Role required to use this command'))) // Added Role Option
      .addSubcommand(s => s.setName('remove').setDescription('Remove a command')
          .addStringOption(o => o.setName('trigger').setDescription('Trigger to remove').setRequired(true)))
      .addSubcommand(s => s.setName('list').setDescription('List all custom commands')),

  // ── Prefix Command Logic ───────────────────────────────────────────────────
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
    const sub = args[0]?.toLowerCase();

    if (sub === 'add') {
      const trigger = args[1];

      // 1. Capture roles from mentions
      const allowedRoles = message.mentions.roles.map(r => r.id);

      // 2. Get response text and strip the role pings so they aren't part of the text
      let response = args.slice(2).join(' ').replace(/<@&\d+>/g, '').trim();

      if (!trigger || !response) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customcmd add <trigger> <response> [@role]\``)] });

      await addCustomCommand(message.guild.id, trigger, response, allowedRoles);
      return message.reply({ embeds: [successEmbed(`Custom command \`${prefix}${trigger}\` created!${allowedRoles.length ? ` (Restricted to ${allowedRoles.length} role(s))` : ''}`)] });
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

  // ── Slash Command Logic ────────────────────────────────────────────────────
  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const trigger = interaction.options.getString('trigger');
      const response = interaction.options.getString('response');
      const role = interaction.options.getRole('role');

      const roles = role ? [role.id] : [];

      await addCustomCommand(interaction.guild.id, trigger, response, roles);
      return interaction.editReply({ embeds: [successEmbed(`Custom command \`!${trigger}\` created!${role ? ` (Role: ${role.name})` : ''}`)] });
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
  // Optional: show a lock emoji if the command has role restrictions
  return new EmbedBuilder().setColor(0x7c3aed).setTitle(`🔧 Custom Commands (${cmds.length})`)
      .setDescription(cmds.length ? cmds.map(c => `\`${prefix}${c.trigger}\` ${c.allowed_roles ? '🔒' : ''} → ${c.response.substring(0, 50)}...`).join('\n') : 'No custom commands yet.');
}