const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  slashData: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),

  async execute(message, args, client) {
    const sent = await message.reply('Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    sent.edit({ content: null, embeds: [buildEmbed(latency, client.ws.ping)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply();
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.editReply({ embeds: [buildEmbed(latency, interaction.client.ws.ping)] });
  },
};

function buildEmbed(latency, apiPing) {
  return new EmbedBuilder()
    .setColor(latency < 100 ? 0x22c55e : latency < 300 ? 0xf59e0b : 0xef4444)
    .setTitle('🏓 Pong!')
    .addFields({ name: '📡 Bot Latency', value: `${latency}ms`, inline: true }, { name: '💙 API Latency', value: `${apiPing}ms`, inline: true });
}
