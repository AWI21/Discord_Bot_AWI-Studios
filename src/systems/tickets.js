const config = require('../../config.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const { openTicket } = require('../../systems/tickets');
const { requirePerms, normalizeNewlines } = require('../../utils/helpers');
const { setConfig } = require('../../database/db');

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
            .setName('setup')
            .setDescription('Configure ticket category, mod role, and logs')
            .addChannelOption(opt =>
                opt
                    .setName('category')
                    .setDescription('Select the CATEGORY where ticket channels will be created')
                    .addChannelTypes(ChannelType.GuildCategory)
                    .setRequired(true)
            )
            .addRoleOption(opt =>
                opt
                    .setName('mod_role')
                    .setDescription('Staff/Mod role allowed to manage tickets')
                    .setRequired(false)
            )
            .addChannelOption(opt =>
                opt
                    .setName('log_channel')
                    .setDescription('Channel for deletion logs')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false)
            )
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

      const input = args.slice(1).join(' ');
      let title = DEFAULT_TITLE;
      let description = DEFAULT_DESC;

      if (input.includes('|')) {
        const parts = input.split('|');
        title = parts[0].trim() || DEFAULT_TITLE;
        description = normalizeNewlines(parts.slice(1).join('|').trim()) || DEFAULT_DESC;
      } else if (input.length > 0) {
        description = normalizeNewlines(input);
      }

      const panelEmbed = new EmbedBuilder()
          .setColor(config.color)
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

    const channel = await openTicket(message.guild, message.author, client);
    await message.reply({ content: `✅ Ticket created: ${channel}`, allowedMentions: { repliedUser: false } });
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need `ManageGuild` permission to configure tickets.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const category = interaction.options.getChannel('category');
      const modRole = interaction.options.getRole('mod_role');
      const logChannel = interaction.options.getChannel('log_channel');

      await setConfig(interaction.guild.id, 'ticket_category', category.id);
      if (modRole) await setConfig(interaction.guild.id, 'mod_role', modRole.id);
      if (logChannel) await setConfig(interaction.guild.id, 'log_channel', logChannel.id);

      let responseText = `✅ **Ticket system successfully configured!**\n📁 **Category:** ${category.name}`;
      if (modRole) responseText += `\n🛡️ **Staff Role:** ${modRole}`;
      if (logChannel) responseText += `\n📜 **Logs Channel:** ${logChannel}`;

      await interaction.editReply({ content: responseText });
      return;
    }

    if (sub === 'panel') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need `ManageGuild` permission to send a ticket panel.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const customTitle = interaction.options.getString('title') || DEFAULT_TITLE;
      const rawDesc = interaction.options.getString('description');
      const customDesc = rawDesc ? normalizeNewlines(rawDesc) : DEFAULT_DESC;

      const panelEmbed = new EmbedBuilder()
          .setColor(config.color)
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