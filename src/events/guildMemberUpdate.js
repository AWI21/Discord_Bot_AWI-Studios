const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database/db');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const logChannelId = await getConfig(newMember.guild.id, 'log_channel');
    if (!logChannelId) return;
    const logChannel = newMember.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
    if (added.size === 0 && removed.size === 0) return;
    const embed = new EmbedBuilder().setColor(0x9b59b6).setTitle('🎭 Member Roles Updated')
      .setDescription(`${newMember.user}'s roles were updated`)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `User ID: ${newMember.id}` }).setTimestamp();
    if (added.size > 0) embed.addFields({ name: '✅ Roles Added', value: added.map(r => r.toString()).join(', ') });
    if (removed.size > 0) embed.addFields({ name: '❌ Roles Removed', value: removed.map(r => r.toString()).join(', ') });
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
