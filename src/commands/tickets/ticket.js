const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { openTicket } = require('../../systems/tickets');
const { requirePerms } = require('../../utils/helpers');

module.exports = {
  name: 'ticket',
  modOnly: false,
  slashData: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open a support ticket'),

  async execute(message, args, client, prefix) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'panel') {
      if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
      await message.delete().catch(() => {});
      await message.channel.send({
        embeds: [new EmbedBuilder().setColor(0x7c3aed).setTitle('🎫 Support Tickets').setDescription('Click the button below to open a support ticket.\n' +
            'Our staff team will assist you as soon as possible').setFooter({ text: message.guild.name })],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_open_panel').setLabel('📩 Open a Ticket').setStyle(ButtonStyle.Primary))],
      });
      return;
    }
    const channel = await openTicket(message.guild, message.author, client);
    await message.reply({ content: `✅ Ticket created: ${channel}`, allowedMentions: { repliedUser: false } });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const channel = await openTicket(interaction.guild, interaction.user, interaction.client);
    await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
  },
};
