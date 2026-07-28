const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setupStatChannel } = require('../../systems/serverStats');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
    name: 'stats-setup',
    slashData: new SlashCommandBuilder()
        .setName('stats-setup')
        .setDescription('Configure live server stat channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o =>
            o.setName('type')
                .setDescription('Select stat type to display')
                .setRequired(true)
                .addChoices(
                    { name: '📊 All 3 Channels (Members, Humans & Bots)', value: 'full' },
                    { name: '👥 Total Members Only', value: 'all' },
                    { name: '✅ Humans Only', value: 'human' },
                    { name: '🤖 Bots Only', value: 'bots' }
                )
        )
        .addStringOption(o =>
            o.setName('name')
                .setDescription('Custom template (use {count} placeholder, e.g. "Members: {count}")')
                .setRequired(false)
        ),

    async executeSlash(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        try {
            const type = interaction.options.getString('type');
            let nameTemplate = interaction.options.getString('name');

            if (nameTemplate && !nameTemplate.includes('{count}')) {
                nameTemplate += ': {count}';
            }

            await setupStatChannel(interaction.guild, type, nameTemplate);

            const displayMsg = type === 'full'
                ? 'All 3 server stats channels have been created/updated.'
                : `Server stat channel for **${type}** has been set up.`;

            await interaction.editReply({ embeds: [successEmbed(displayMsg)] });
        } catch (err) {
            console.error('Stats setup error:', err);
            await interaction.editReply({ embeds: [errorEmbed('Failed to create stats channels. Check my Manage Channels permission.')] });
        }
    },
};