const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { setConfig } = require('../../database/db');
const { successEmbed } = require('../../utils/helpers');

module.exports = {
    name: 'jtc-setup',
    slashData: new SlashCommandBuilder()
        .setName('jtc-setup')
        .setDescription('Configure the Join to Create voice channel system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('channel').setDescription('The trigger voice channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        .addStringOption(o => o.setName('name-template').setDescription("Name template for created channels, use {user}").setRequired(false)),

    async executeSlash(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const channel = interaction.options.getChannel('channel');
        const template = interaction.options.getString('name-template');

        await setConfig(interaction.guild.id, 'jtc_channel', channel.id);
        if (template) await setConfig(interaction.guild.id, 'jtc_name_template', template);

        await interaction.editReply({ embeds: [successEmbed(`Join to Create is now active on ${channel}.`)] });
    },
};