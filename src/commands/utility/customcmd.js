const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addCustomCommand, removeCustomCommand, getAllCustomCommands } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'customcmd',
  aliases: ['cc', 'addcmd'],
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;

    const sub = args[0]?.toLowerCase();

    // ── !customcmd add <trigger> <response> ──────────────────────────────────────
    if (sub === 'add') {
      const trigger = args[1];
      const response = args.slice(2).join(' ');
      if (!trigger || !response) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customcmd add <trigger> <response>\`\n\nVariables: \`{user}\` \`{username}\` \`{server}\` \`{membercount}\``)] });
      if (trigger.length > 50) return message.reply({ embeds: [errorEmbed('Trigger must be 50 characters or less.')] });

      addCustomCommand(message.guild.id, trigger, response);
      return message.reply({ embeds: [successEmbed(`Custom command \`${prefix}${trigger}\` created!\n**Response:** ${response}`)] });
    }

    // ── !customcmd remove <trigger> ──────────────────────────────────────────────
    if (sub === 'remove' || sub === 'delete') {
      const trigger = args[1];
      if (!trigger) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customcmd remove <trigger>\``)] });

      const result = removeCustomCommand(message.guild.id, trigger);
      if (result.changes === 0) return message.reply({ embeds: [errorEmbed(`Command \`${prefix}${trigger}\` not found.`)] });
      return message.reply({ embeds: [successEmbed(`Custom command \`${prefix}${trigger}\` removed.`)] });
    }

    // ── !customcmd list ──────────────────────────────────────────────────────────
    const cmds = getAllCustomCommands(message.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`🔧 Custom Commands (${cmds.length})`);

    if (!cmds.length) {
      embed.setDescription(`No custom commands yet.\nUse \`${prefix}customcmd add <trigger> <response>\` to add one.`);
    } else {
      const list = cmds.map(c => `\`${prefix}${c.trigger}\` → ${c.response.substring(0, 60)}${c.response.length > 60 ? '...' : ''}`).join('\n');
      embed.setDescription(list);
    }

    message.reply({ embeds: [embed] });
  },
};
