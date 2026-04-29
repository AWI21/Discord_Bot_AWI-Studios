const { EmbedBuilder } = require('discord.js');
const { setBirthday, getBirthday } = require('../../database/db');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'remember-birthday',
  aliases: ['setbirthday', 'birthday'],
  async execute(message, args) {
    const input = args[0];
    if (!input) return message.reply({ embeds: [errorEmbed('Usage: `!remember-birthday MM-DD`\nExample: `!remember-birthday 03-15`')] });

    const match = input.match(/^(\d{2})-(\d{2})$/);
    if (!match) return message.reply({ embeds: [errorEmbed('Invalid format. Use `MM-DD` (e.g. `03-15` for March 15th).')] });

    const month = parseInt(match[1]);
    const day = parseInt(match[2]);

    if (month < 1 || month > 12) return message.reply({ embeds: [errorEmbed('Month must be between 01 and 12.')] });
    if (day < 1 || day > 31) return message.reply({ embeds: [errorEmbed('Day must be between 01 and 31.')] });

    setBirthday(message.author.id, message.guild.id, month, day);

    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const embed = new EmbedBuilder()
      .setColor(0xf472b6)
      .setTitle('🎂 Birthday Saved!')
      .setDescription(`Your birthday has been set to **${months[month - 1]} ${day}**.\nI'll celebrate with you! 🥳`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
