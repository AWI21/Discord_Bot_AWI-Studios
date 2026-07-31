const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { setConfig } = require('../../database/db');

const slashData = new SlashCommandBuilder()
    .setName('setaudit')
    .setDescription('Set the channel for advanced server audit logs')
    .addChannelOption(opt =>
        opt
            .setName('channel')
            .setDescription('Text channel where audit logs will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
    );

module.exports = {
    name: 'setaudit',
    slashData,

    async executeSlash(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: '❌ You need `ManageGuild` permission.', flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.options.getChannel('channel');
        await setConfig(interaction.guild.id, 'audit_log_channel', channel.id);

        await interaction.reply({ content: `✅ Audit logs channel set to ${channel}!`, flags: MessageFlags.Ephemeral });
    }
};