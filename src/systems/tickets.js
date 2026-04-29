const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionFlagsBits, ChannelType,
} = require('discord.js');
const { createTicket, getTicket, updateTicketStatus, getConfig } = require('../database/db');

let ticketCounter = {};

async function openTicket(guild, user, client) {
  const count = (ticketCounter[guild.id] || 0) + 1;
  ticketCounter[guild.id] = count;

  const supportCategory = getConfig(guild.id, 'ticket_category');

  // ── Create private channel ───────────────────────────────────────────────────
  const channel = await guild.channels.create({
    name: `ticket-${count.toString().padStart(4, '0')}-${user.username}`,
    type: ChannelType.GuildText,
    parent: supportCategory || undefined,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ],
  });

  // Add mod role permissions
  const modRoleId = getConfig(guild.id, 'mod_role');
  if (modRoleId) {
    await channel.permissionOverwrites.create(modRoleId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageMessages: true,
    });
  }

  createTicket(channel.id, guild.id, user.id);

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('🎫 Support Ticket')
    .setDescription(`Hello ${user}, welcome to your support ticket!\nPlease describe your issue and a staff member will assist you shortly.`)
    .addFields(
      { name: '📋 Instructions', value: 'Be clear and detailed about your issue.\nDo not ping staff unnecessarily.' },
    )
    .setFooter({ text: `Ticket #${count.toString().padStart(4, '0')}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket_delete')
      .setLabel('🗑️ Delete Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await channel.send({ content: `${user}`, embeds: [embed], components: [row] });

  return channel;
}

async function handleTicketInteraction(interaction, client) {
  const { customId, guild, channel, member } = interaction;
  const ticket = getTicket(channel.id);
  if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });

  const modRoleId = getConfig(guild.id, 'mod_role');
  const isStaff = modRoleId
    ? member.roles.cache.has(modRoleId)
    : member.permissions.has(PermissionFlagsBits.ManageMessages);

  const isOwner = ticket.user_id === member.id;

  if (customId === 'ticket_close') {
    if (!isStaff && !isOwner) return interaction.reply({ content: '❌ You cannot close this ticket.', ephemeral: true });

    updateTicketStatus(channel.id, 'closed');
    const user = await guild.members.fetch(ticket.user_id).catch(() => null);
    if (user) {
      await channel.permissionOverwrites.edit(user, { SendMessages: false });
    }

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Closed by ${member}\n\nOnly staff can now send messages.`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_reopen')
        .setLabel('🔓 Reopen')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('🗑️ Delete')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.update({ embeds: [embed], components: [row] });

  } else if (customId === 'ticket_reopen') {
    if (!isStaff) return interaction.reply({ content: '❌ Only staff can reopen tickets.', ephemeral: true });

    updateTicketStatus(channel.id, 'open');
    const user = await guild.members.fetch(ticket.user_id).catch(() => null);
    if (user) {
      await channel.permissionOverwrites.edit(user, { SendMessages: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`Reopened by ${member}`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Close').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_delete').setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger),
    );

    await interaction.update({ embeds: [embed], components: [row] });

  } else if (customId === 'ticket_delete') {
    if (!isStaff) return interaction.reply({ content: '❌ Only staff can delete tickets.', ephemeral: true });

    await interaction.reply({ content: '🗑️ Deleting ticket in 5 seconds...', ephemeral: false });
    await logTicketDelete(guild, channel, member, ticket, client);
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  }
}

async function logTicketDelete(guild, channel, closer, ticket, client) {
  const logChannelId = getConfig(guild.id, 'log_channel');
  if (!logChannelId) return;
  const logCh = guild.channels.cache.get(logChannelId);
  if (!logCh) return;

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle('🗑️ Ticket Deleted')
    .addFields(
      { name: 'Channel', value: channel.name, inline: true },
      { name: 'Opened By', value: `<@${ticket.user_id}>`, inline: true },
      { name: 'Deleted By', value: `${closer}`, inline: true },
    )
    .setTimestamp();

  await logCh.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { openTicket, handleTicketInteraction };
