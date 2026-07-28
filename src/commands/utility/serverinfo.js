const config = require('../../config.js');
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'serverinfo',
  slashData: new SlashCommandBuilder().setName('serverinfo').setDescription('View server information'),

  async execute(message) { message.reply({ embeds: [await buildEmbed(message.guild)] }); },
  async executeSlash(interaction) { await interaction.reply({ embeds: [await buildEmbed(interaction.guild)] }); },
};

async function buildEmbed(guild) {
  await guild.fetch();
  const embed = new EmbedBuilder().setColor(config.color).setTitle(guild.name).setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: '👥 Members', value: String(guild.memberCount), inline: true },
      { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '💬 Channels', value: String(guild.channels.cache.size), inline: true },
      { name: '🎭 Roles', value: String(guild.roles.cache.size), inline: true },
      { name: '😀 Emojis', value: String(guild.emojis.cache.size), inline: true },
    ).setFooter({ text: `ID: ${guild.id}` }).setTimestamp();
  if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));
  return embed;
}
