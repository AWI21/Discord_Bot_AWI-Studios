const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  async execute(message, args, client) {
    const sent = await message.reply('Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setColor(latency < 100 ? 0x22c55e : latency < 300 ? 0xf59e0b : 0xef4444)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Bot Latency', value: `${latency}ms`, inline: true },
        { name: '💙 API Latency', value: `${apiPing}ms`, inline: true },
      );

    sent.edit({ content: null, embeds: [embed] });
  },
};
