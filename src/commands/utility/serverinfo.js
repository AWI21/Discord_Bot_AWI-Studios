const { EmbedBuilder } = require('discord.js');

// serverinfo.js
module.exports = {
  name: 'serverinfo',
  async execute(message) {
    const { guild } = message;
    await guild.fetch();

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '👥 Members', value: String(guild.memberCount), inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '💬 Channels', value: String(guild.channels.cache.size), inline: true },
        { name: '🎭 Roles', value: String(guild.roles.cache.size), inline: true },
        { name: '😀 Emojis', value: String(guild.emojis.cache.size), inline: true },
      )
      .setFooter({ text: `ID: ${guild.id}` })
      .setTimestamp();

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

    message.reply({ embeds: [embed] });
  },
};
