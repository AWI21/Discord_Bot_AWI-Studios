const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { setBirthday } = require('../../database/db');
const { errorEmbed } = require('../../utils/helpers');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

module.exports = {
  name: 'remember-birthday',
  aliases: ['setbirthday', 'birthday'],
  slashData: new SlashCommandBuilder()
    .setName('remember-birthday').setDescription('Set your birthday')
    .addIntegerOption(o => o.setName('month').setDescription('Month (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
    .addIntegerOption(o => o.setName('day').setDescription('Day (1-31)').setRequired(true).setMinValue(1).setMaxValue(31)),

  async execute(message, args) {
    const input = args[0];
    if (!input) return message.reply({ embeds: [errorEmbed('Usage: `!remember-birthday MM-DD`')] });
    const match = input.match(/^(\d{2})-(\d{2})$/);
    if (!match) return message.reply({ embeds: [errorEmbed('Invalid format. Use `MM-DD`')] });
    const month = parseInt(match[1]), day = parseInt(match[2]);
    if (month < 1 || month > 12) return message.reply({ embeds: [errorEmbed('Month must be 01-12.')] });
    if (day < 1 || day > 31) return message.reply({ embeds: [errorEmbed('Day must be 01-31.')] });
    await setBirthday(message.author.id, message.guild.id, month, day);
    message.reply({ embeds: [buildEmbed(message.author, month, day)] });
  },

  async executeSlash(interaction) {
    const month = interaction.options.getInteger('month');
    const day = interaction.options.getInteger('day');
    await setBirthday(interaction.user.id, interaction.guild.id, month, day);
    await interaction.reply({ embeds: [buildEmbed(interaction.user, month, day)], flags: MessageFlags.Ephemeral });
  },
};

function buildEmbed(user, month, day) {
  return new EmbedBuilder().setColor(0xf472b6).setTitle('🎂 Birthday Saved!')
    .setDescription(`Your birthday has been set to **${MONTHS[month - 1]} ${day}**. I'll celebrate with you! 🥳`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true })).setTimestamp();
}
