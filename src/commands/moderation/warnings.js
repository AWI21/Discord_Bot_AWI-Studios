const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { requirePerms, errorEmbed } = require('../../utils/helpers');
const { getWarnings, clearWarnings, removeWarning } = require('../../database/db');

module.exports = {
  name: 'warnings',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;

    const subcommand = args[0]?.toLowerCase();

    // !warnings clear @user
    if (subcommand === 'clear') {
      const target = message.mentions.members.first();
      if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warnings clear @user\``)] });
      clearWarnings(target.id, message.guild.id);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription(`✅ Cleared all warnings for **${target.user.tag}**.`)] });
    }

    // !warnings remove <id>
    if (subcommand === 'remove') {
      const id = parseInt(args[1]);
      if (!id) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warnings remove <id>\``)] });
      removeWarning(id);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x22c55e).setDescription(`✅ Removed warning **#${id}**.`)] });
    }

    // !warnings @user
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}warnings @user\``)] });

    const warns = getWarnings(target.id, message.guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xeab308)
      .setTitle(`⚠️ Warnings for ${target.user.tag}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Total: ${warns.length} warning(s)` });

    if (!warns.length) {
      embed.setDescription('No warnings on record.');
    } else {
      const list = warns.slice(0, 10).map((w, i) =>
        `**#${w.id}** — <@${w.moderator_id}>\n${w.reason}\n<t:${Math.floor(w.timestamp / 1000)}:R>`
      ).join('\n\n');
      embed.setDescription(list);
    }

    message.reply({ embeds: [embed] });
  },
};
