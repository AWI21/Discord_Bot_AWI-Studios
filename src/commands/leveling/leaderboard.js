const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getLeaderboard } = require('../../database/db');
const { calculateLevel } = require('../../systems/leveling');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  cooldown: 15,
  slashData: new SlashCommandBuilder().setName('leaderboard').setDescription('View the XP leaderboard'),

  async execute(message) {
    message.reply({ embeds: [await buildEmbed(message.guild)] });
  },
  async executeSlash(interaction) {
    await interaction.reply({ embeds: [await buildEmbed(interaction.guild)] });
  },
};

async function buildEmbed(guild) {
  const top = await getLeaderboard(guild.id, 10);
  if (!top.length) return new EmbedBuilder().setColor(0x7c3aed).setDescription('No users have gained XP yet!');
  const medals = ['🥇', '🥈', '🥉'];
  const list = top.map((u, i) => `${medals[i] || `**${i + 1}.**`} <@${u.user_id}> — Level **${calculateLevel(u.xp)}** | **${u.xp.toLocaleString()}** XP`).join('\n');
  return new EmbedBuilder().setColor(0x7c3aed).setTitle(`🐺 ${guild.name} — XP Leaderboard`).setDescription(list).setThumbnail(guild.iconURL({ dynamic: true })).setTimestamp();
}
