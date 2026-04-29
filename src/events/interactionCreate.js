const { handleTicketInteraction } = require('../systems/tickets');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_')) {
        await handleTicketInteraction(interaction, client);
      }
    }
  },
};
