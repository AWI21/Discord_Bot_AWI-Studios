const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getConfig } = require('../../database/db');

module.exports = {
  name: 'help',
  slashData: new SlashCommandBuilder().setName('help').setDescription('Show all Wolfy commands'),

  async execute(message, args, client, prefix) {
    message.reply({ embeds: [buildEmbed(client, prefix)] });
  },

  async executeSlash(interaction) {
    await interaction.reply({ embeds: [buildEmbed(interaction.client, '/')] });
  },
};

function buildEmbed(client, prefix) {
  return new EmbedBuilder().setColor(0x7c3aed).setTitle('🐺 Wolfy — Command List')
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '⚔️ Moderation', value: `\`${prefix}ban\` \`${prefix}kick\` \`${prefix}timeout\` \`${prefix}mute\` \`${prefix}deafen\`\n\`${prefix}warn\` \`${prefix}warnings\` \`${prefix}purge\` \`${prefix}move\`\n\`${prefix}role\` \`${prefix}slowmode\`` },
      { name: '📈 Leveling', value: `\`${prefix}rank\` \`${prefix}leaderboard\`` },
      { name: '🎂 Birthdays', value: `\`${prefix}remember-birthday\`` },
      { name: '⭐ Vouching', value: `\`${prefix}vouch\` \`${prefix}vouchlist\`` },
      { name: '🏆 Achievements', value: `\`${prefix}achievements\`` },
      { name: '🎫 Tickets', value: `\`${prefix}ticket\` \`${prefix}ticket panel\`` },
      { name: '📝 Embeds', value: `\`${prefix}embed send\`` },
      { name: '🔧 Custom Commands', value: `\`${prefix}customcmd add/remove/list\`` },
      { name: '⚙️ Config (Admin)', value: `\`${prefix}config help\`` },
      { name: 'ℹ️ Utility', value: `\`${prefix}ping\` \`${prefix}serverinfo\` \`${prefix}userinfo\`` },
    )
    .setFooter({ text: `Prefix: ${prefix} | Wolfy Bot` }).setTimestamp();
}
