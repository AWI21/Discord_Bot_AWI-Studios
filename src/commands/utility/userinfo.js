const config = require('../../config.js');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getUser, getUserRank, getWarnings, getVouches } = require('../../database/db');
const { calculateLevel } = require('../../systems/leveling');

module.exports = {
  name: 'userinfo',
  aliases: ['whois', 'ui'],
  slashData: new SlashCommandBuilder()
    .setName('userinfo').setDescription('View info about a member')
    .addUserOption(o => o.setName('user').setDescription('Member to view').setRequired(false)),

  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;
    message.reply({ embeds: [await buildEmbed(target, message.guild)] });
  },
  async executeSlash(interaction) {
    const target = interaction.options.getMember('user') || interaction.member;
    await interaction.reply({ embeds: [await buildEmbed(target, interaction.guild)] });
  },
};

async function buildEmbed(target, guild) {
  const userData = await getUser(target.id, guild.id);
  const level = calculateLevel(userData?.xp || 0);
  const rank = await getUserRank(target.id, guild.id);
  const warnings = await getWarnings(target.id, guild.id);
  const vouches = await getVouches(target.id, guild.id);
  const roles = target.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).first(5).map(r => r.toString()).join(', ') || 'None';
  return new EmbedBuilder().setColor(target.displayColor || config.color).setTitle(target.user.username)
    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '🆔 ID', value: target.id, inline: true },
      { name: '📅 Joined', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(target.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '📈 Level', value: String(level), inline: true },
      { name: '⭐ XP', value: String(userData?.xp || 0), inline: true },
      { name: '🏆 Rank', value: rank ? `#${rank}` : 'N/A', inline: true },
      { name: '⚠️ Warnings', value: String(warnings.length), inline: true },
      { name: '👍 Vouches', value: String(vouches?.points || 0), inline: true },
      { name: '🎭 Top Roles', value: roles },
    ).setFooter({ text: target.user.bot ? '🤖 Bot' : '👤 User' }).setTimestamp();
}
