const { EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../database/db');
const { calculateLevel } = require('../../systems/leveling');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  cooldown: 15,
  async execute(message, args) {
    const top = getLeaderboard(message.guild.id, 10);
    if (!top.length) return message.reply('No users have gained XP yet!');

    const medals = ['🥇', '🥈', '🥉'];

    const list = top.map((u, i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      const level = calculateLevel(u.xp);
      return `${medal} <@${u.user_id}> — Level **${level}** | **${u.xp.toLocaleString()}** XP`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(`🐺 ${message.guild.name} — XP Leaderboard`)
      .setDescription(list)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
