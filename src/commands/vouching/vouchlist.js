const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getVouchLeaderboard, getVouches } = require('../../database/db');

module.exports = {
  name: 'vouchlist',
  aliases: ['vouches', 'vouchlb'],
  cooldown: 10,
  slashData: new SlashCommandBuilder()
    .setName('vouchlist').setDescription('View the vouch leaderboard')
    .addUserOption(o => o.setName('user').setDescription('Check a specific user').setRequired(false)),

  async execute(message, args) {
    const target = message.mentions.users.first();
    message.reply({ embeds: [await buildEmbed(message.guild, target)] });
  },

  async executeSlash(interaction) {
    const target = interaction.options.getUser('user');
    await interaction.reply({ embeds: [await buildEmbed(interaction.guild, target)] });
  },
};

async function buildEmbed(guild, target) {
  if (target) {
    const data = await getVouches(target.id, guild.id);
    return new EmbedBuilder().setColor(0xf59e0b).setTitle(`⭐ Vouches for ${target.username}`)
      .setDescription(data ? `**${data.points}** vouch points` : 'No vouches yet.')
      .setThumbnail(target.displayAvatarURL({ dynamic: true }));
  }
  const top = await getVouchLeaderboard(guild.id, 15);
  const medals = ['🥇', '🥈', '🥉'];
  return new EmbedBuilder().setColor(0xf59e0b).setTitle(`⭐ ${guild.name} — Vouch Leaderboard`)
    .setDescription(top.length ? top.map((u, i) => `${medals[i] || `**${i + 1}.**`} <@${u.user_id}> — **${u.points}** points`).join('\n') : 'No vouch data yet.')
    .setFooter({ text: 'Vouches track fan engagement for Trusted Fan role eligibility' }).setTimestamp();
}
