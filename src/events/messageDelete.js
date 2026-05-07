const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../database/db');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    const logChannelId = await getConfig(message.guild.id, 'log_channel');
    if (!logChannelId) return;
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;
    const embed = new EmbedBuilder().setColor(0xe74c3c).setTitle('🗑️ Message Deleted')
      .setDescription(`Message deleted in ${message.channel}${message.author ? ` by ${message.author}` : ''}`)
      .addFields({ name: '📄 Content', value: (message.content || '*empty or unknown*').substring(0, 1024) })
      .setFooter({ text: `User ID: ${message.author?.id || 'unknown'} | Message ID: ${message.id}` }).setTimestamp();
    if (message.author) embed.setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
