const { EmbedBuilder } = require('discord.js');
const { getUser, getUserRank, getWarnings, getVouches } = require('../../database/db');
const { calculateLevel } = require('../../systems/leveling');

module.exports = {
  name: 'userinfo',
  aliases: ['whois', 'ui'],
  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;

    const userData = getUser(target.id, message.guild.id);
    const level = calculateLevel(userData?.xp || 0);
    const rank = getUserRank(target.id, message.guild.id);
    const warnings = getWarnings(target.id, message.guild.id);
    const vouches = getVouches(target.id, message.guild.id);

    const roles = target.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .first(5)
      .map(r => r.toString())
      .join(', ') || 'None';

    const embed = new EmbedBuilder()
      .setColor(target.displayColor || 0x7c3aed)
      .setTitle(`${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🆔 ID', value: target.id, inline: true },
        { name: '📅 Joined Server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📈 Level', value: String(level), inline: true },
        { name: '⭐ XP', value: String(userData?.xp || 0), inline: true },
        { name: '🏆 Rank', value: rank ? `#${rank}` : 'N/A', inline: true },
        { name: '⚠️ Warnings', value: String(warnings.length), inline: true },
        { name: '👍 Vouches', value: String(vouches?.points || 0), inline: true },
        { name: `🎭 Top Roles`, value: roles },
      )
      .setFooter({ text: target.user.bot ? '🤖 Bot Account' : '👤 User' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
