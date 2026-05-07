const { MessageFlags } = require('discord.js');
const { handleTicketInteraction, openTicket } = require('../systems/tickets');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ── Slash commands ────────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command || !command.executeSlash) return;
      try {
        await command.executeSlash(interaction);
      } catch (err) {
        console.error(`Slash command error [/${interaction.commandName}]:`, err);
        const reply = { content: '❌ An error occurred.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // ── Buttons ───────────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_open_panel') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
          const channel = await openTicket(interaction.guild, interaction.user, client);
          await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
        } catch (err) {
          console.error('Ticket open error:', err);
          await interaction.editReply({ content: '❌ Failed to create ticket. Check bot permissions.' });
        }
        return;
      }

      if (interaction.customId.startsWith('ticket_')) {
        await handleTicketInteraction(interaction, client);
      }
    }
  },
};
