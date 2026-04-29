const { EmbedBuilder } = require('discord.js');
const { getVouchLeaderboard, getVouches } = require('../../database/db');

module.exports = {
  name: 'vouchlist',
  aliases: ['vouches', 'vouchlb'],
  cooldown: 10,
  async execute(message, args) {
    // Check specific user
    const targetUser = message.mentions.users.first();
    if (targetUser) {
      const data = getVouches(targetUser.id, message.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`⭐ Vouches for ${targetUser.username}`)
        .setDescription(data ? `**${data.points}** vouch points` : 'No vouches yet.')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));
      return message.reply({ embeds: [embed] });
    }

    const top = getVouchLeaderboard(message.guild.id, 15);
    if (!top.length) return message.reply('No vouch data yet.');

    const medals = ['🥇', '🥈', '🥉'];
    const list = top.map((u, i) =>
      `${medals[i] || `**${i + 1}.**`} <@${u.user_id}> — **${u.points}** points`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`⭐ ${message.guild.name} — Vouch Leaderboard`)
      .setDescription(list)
      .setFooter({ text: 'Vouches track fan engagement for Trusted Fan role eligibility' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
