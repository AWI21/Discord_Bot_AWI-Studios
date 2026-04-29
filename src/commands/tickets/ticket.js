const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { openTicket } = require('../../systems/tickets');
const { requirePerms, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'ticket',
  async execute(message, args, client, prefix) {
    const sub = args[0]?.toLowerCase();

    // ── !ticket panel — mods send the ticket panel ────────────────────────────────
    if (sub === 'panel') {
      if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
      await message.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('🎫 Support Tickets')
        .setDescription('Click the button below to open a support ticket.\nOur staff team will assist you as soon as possible.')
        .setFooter({ text: message.guild.name });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open_panel')
          .setLabel('📩 Open a Ticket')
          .setStyle(ButtonStyle.Primary),
      );

      const panel = await message.channel.send({ embeds: [embed], components: [row] });

      // Handle "open" from panel button via event
      const collector = panel.createMessageComponentCollector();
      collector.on('collect', async (interaction) => {
        if (interaction.customId === 'ticket_open_panel') {
          await interaction.deferReply({ ephemeral: true });
          const channel = await openTicket(interaction.guild, interaction.user, client);
          await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
        }
      });
      return;
    }

    // ── !ticket — user opens their own ticket ─────────────────────────────────────
    const channel = await openTicket(message.guild, message.author, client);
    await message.reply({ content: `✅ Ticket created: ${channel}`, allowedMentions: { repliedUser: false } });
  },
};
