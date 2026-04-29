const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../../database/db');

module.exports = {
  name: 'help',
  async execute(message, args, client, prefix) {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('🐺 Wolfy — Command List')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '⚔️ Moderation',
          value: `\`${prefix}ban\` \`${prefix}kick\` \`${prefix}timeout\` \`${prefix}mute\` \`${prefix}deafen\`\n\`${prefix}warn\` \`${prefix}warnings\` \`${prefix}purge\` \`${prefix}move\`\n\`${prefix}role add/remove\` \`${prefix}slowmode\``,
        },
        {
          name: '📈 Leveling',
          value: `\`${prefix}rank\` \`${prefix}leaderboard\``,
        },
        {
          name: '🎂 Birthdays',
          value: `\`${prefix}remember-birthday MM-DD\``,
        },
        {
          name: '⭐ Vouching',
          value: `\`${prefix}vouch @user [points]\` \`${prefix}vouchlist\``,
        },
        {
          name: '🏆 Achievements',
          value: `\`${prefix}achievements\` \`${prefix}achievements add\` \`${prefix}achievements @user\``,
        },
        {
          name: '🎫 Tickets',
          value: `\`${prefix}ticket\` — Open a ticket\n\`${prefix}ticket panel\` — Send panel to channel`,
        },
        {
          name: '📝 Embeds',
          value: `\`${prefix}embed send [#channel]\` — Create and send rich embeds\n\`${prefix}embed raw <json>\``,
        },
        {
          name: '🔧 Custom Commands',
          value: `\`${prefix}customcmd add/remove/list\``,
        },
        {
          name: '⚙️ Config (Admin)',
          value: `\`${prefix}config help\` — All setup options`,
        },
      )
      .setFooter({ text: `Prefix: ${prefix} | Wolfy Bot` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
