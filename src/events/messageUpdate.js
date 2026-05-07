const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database/db');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const logChannelId = await getConfig(newMessage.guild.id, 'log_channel');
    if (!logChannelId) return;
    const logChannel = newMessage.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    const embed = new EmbedBuilder().setColor(0x3498db).setTitle('✏️ Message Edited')
      .setDescription(`Message edited in ${newMessage.channel} by ${newMessage.author}`)
      .addFields({ name: '📄 Before', value: (oldMessage.content || '*empty*').substring(0, 1024) }, { name: '📝 After', value: (newMessage.content || '*empty*').substring(0, 1024) })
      .setFooter({ text: `User ID: ${newMessage.author.id} | Message ID: ${newMessage.id}` })
      .setThumbnail(newMessage.author.displayAvatarURL({ dynamic: true })).setTimestamp();
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
