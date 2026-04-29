const { AttachmentBuilder } = require('discord.js');
const { getUser, ensureUser, getUserRank } = require('../../database/db');
const { generateLevelCard } = require('../../utils/canvas');
const { calculateLevel } = require('../../systems/leveling');

module.exports = {
  name: 'rank',
  aliases: ['level', 'xp'],
  cooldown: 10,
  async execute(message, args, client, prefix) {
    const target = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(target.id);
    if (!member) return message.reply('❌ Member not found.');

    ensureUser(target.id, message.guild.id);
    const userData = getUser(target.id, message.guild.id);
    const rank = getUserRank(target.id, message.guild.id) || 0;
    const level = calculateLevel(userData?.xp || 0);

    const loading = await message.channel.send('🖼️ Generating rank card...');

    try {
      const buffer = await generateLevelCard({
        user: target,
        xp: userData?.xp || 0,
        level,
        rank,
        guildName: message.guild.name,
      });

      const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });
      await loading.delete().catch(() => {});
      await message.reply({ files: [attachment] });
    } catch (err) {
      console.error('Canvas error:', err);
      await loading.edit(`**${target.username}** — Level **${level}** | XP: **${userData?.xp || 0}** | Rank: **#${rank}**`);
    }
  },
};
