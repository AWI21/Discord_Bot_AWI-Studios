const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { openTicket } = require('../../systems/tickets');
const { requirePerms } = require('../../utils/helpers');

const DEFAULT_TITLE = '🎫 Support Tickets';
const DEFAULT_DESC = 'Click the button below to open a support ticket.\nOur staff team will assist you as soon as possible.';

const slashData = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage or open support tickets')
    .addSubcommand(sub =>
        sub
            .setName('open')
            .setDescription('Open a new support ticket')
    )
    .addSubcommand(sub =>
        sub
            .setName('panel')
            .setDescription('Send a ticket creation panel to the current channel')
            .addStringOption(opt =>
                opt
                    .setName('title')
                    .setDescription('Custom title for the ticket panel embed')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt
                    .setName('description')
                    .setDescription('Custom description for the ticket panel embed (use \\n for new line)')
                    .setRequired(false)
            )
    );

module.exports = {
  name: 'ticket',
  modOnly: false,
  slashData,

  async execute(message, args, client, prefix) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'panel') {
      if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
      await message.delete().catch(() => {});

      // Obsługa podawania custom opisu przez wersję tekstową (np. !ticket panel Custom Title | Custom Desc)
      const input = args.slice(1).join(' ');
      let title = DEFAULT_TITLE;
      let description = DEFAULT_DESC;

      if (input.includes('|')) {
        const parts = input.split('|');
        title = parts[0].trim() || DEFAULT_TITLE;
        description = parts.slice(1).join('|').trim().replace(/\\n/g, '\n') || DEFAULT_DESC;
      } else if (input.length > 0) {
        description = input.replace(/\\n/g, '\n');
      }

      const panelEmbed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle(title)
          .setDescription(description)
          .setFooter({ text: message.guild.name });

      const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
              .setCustomId('ticket_open_panel')
              .setLabel('📩 Open a Ticket')
              .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({ embeds: [panelEmbed], components: [row] });
      return;
    }

    // Domyślne tworzenie ticketu z komendy tekstowej (!ticket)
    const channel = await openTicket(message.guild, message.author, client);
    await message.reply({ content: `✅ Ticket created: ${channel}`, allowedMentions: { repliedUser: false } });
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need `ManageGuild` permission to send a ticket panel.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const customTitle = interaction.options.getString('title') || DEFAULT_TITLE;
      const rawDesc = interaction.options.getString('description');
      const customDesc = rawDesc ? rawDesc.replace(/\\n/g, '\n') : DEFAULT_DESC;

      const panelEmbed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle(customTitle)
          .setDescription(customDesc)
          .setFooter({ text: interaction.guild.name });

      const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
              .setCustomId('ticket_open_panel')
              .setLabel('📩 Open a Ticket')
              .setStyle(ButtonStyle.Primary)
      );

      await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
      await interaction.editReply({ content: '✅ Ticket panel sent!' });
      return;
    }

    if (sub === 'open') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const channel = await openTicket(interaction.guild, interaction.user, interaction.client);
      await interaction.editReply({ content: `✅ Your ticket has been created: ${channel}` });
    }
  },
};