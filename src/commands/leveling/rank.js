const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { getUser, ensureUser, getUserRank } = require('../../database/db');
const { generateLevelCard } = require('../../utils/canvas');
// Import getRankStats alongside calculateLevel
const { calculateLevel, getRankStats } = require('../../systems/leveling');

module.exports = {
  name: 'rank',
  aliases: ['level', 'xp'],
  cooldown: 10,
  slashData: new SlashCommandBuilder()
      .setName('rank').setDescription('View your rank card')
      .addUserOption(o => o.setName('user').setDescription('Member to check').setRequired(false)),

  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    const loading = await message.channel.send('🖼️ Generating rank card...');
    const attachment = await _genCard(target, message.guild);
    await loading.delete().catch(() => {});
    if (attachment) await message.reply({ files: [attachment] });
    else await message.reply(`**${target.username}** — Level info unavailable`);
  },

  async executeSlash(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const attachment = await _genCard(target, interaction.guild);
    if (attachment) await interaction.editReply({ files: [attachment] });
    else await interaction.editReply({ content: `**${target.username}** — Level info unavailable` });
  },
};

async function _genCard(target, guild) {
  await ensureUser(target.id, guild.id);
  const userData = await getUser(target.id, guild.id);
  const rank = await getUserRank(target.id, guild.id) || 0;

  const totalXp = userData?.xp || 0;
  // Get all our precise, dynamic scaling metrics for this user
  const stats = getRankStats(totalXp);

  try {
    // We pass the clean stats straight into the canvas generator
    const buffer = await generateLevelCard({
      user: target,
      xp: stats.xpInCurrentLevel,              // Progress bar current value (e.g. 45 XP)
      nextLevelXp: stats.xpRequiredForLevelGap, // Progress bar max value (e.g. 120 XP)
      level: stats.level,
      rank,
      totalXp: totalXp                         // Passed to fix the TOTAL XP block on the card
    });
    return new AttachmentBuilder(buffer, { name: 'rank.png' });
  } catch (error) {
    console.error(error); // Log the error to console so you can track canvas bugs
    return null;
  }
}