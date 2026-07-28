const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setupStatsChannels } = require('../../systems/serverStats');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    name: 'stats-setup',
    slashData: new SlashCommandBuilder()
        .setName('stats-setup')
        .setDescription('Create the live server stat voice channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async executeSlash(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            await setupStatsChannels(interaction.guild);
            await interaction.editReply({ embeds: [successEmbed('Server stats channels have been created.')] });
        } catch (err) {
            console.error('Stats setup error:', err);
            await interaction.editReply({ embeds: [errorEmbed('Failed to create stats channels. Check my Manage Channels permission.')] });
        }
    }, 
};