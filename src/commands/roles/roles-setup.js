const {
    SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, MessageFlags,
} = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
    name: 'roles-setup',
    slashData: new SlashCommandBuilder()
        .setName('roles-setup')
        .setDescription('Send a self-assignable role menu')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s => s.setName('buttons').setDescription('Self-role buttons (max 5 roles)')
            .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
            .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
            .addRoleOption(o => o.setName('role2').setDescription('Role 2').setRequired(false))
            .addRoleOption(o => o.setName('role3').setDescription('Role 3').setRequired(false))
            .addRoleOption(o => o.setName('role4').setDescription('Role 4').setRequired(false))
            .addRoleOption(o => o.setName('role5').setDescription('Role 5').setRequired(false))
            .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(false))
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(false)))
        .addSubcommand(s => s.setName('dropdown').setDescription('Self-role dropdown (max 10 roles)')
            .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
            .addStringOption(o => o.setName('placeholder').setDescription('Dropdown placeholder text').setRequired(true))
            .addRoleOption(o => o.setName('role1').setDescription('Role 1').setRequired(true))
            .addRoleOption(o => o.setName('role2').setDescription('Role 2').setRequired(false))
            .addRoleOption(o => o.setName('role3').setDescription('Role 3').setRequired(false))
            .addRoleOption(o => o.setName('role4').setDescription('Role 4').setRequired(false))
            .addRoleOption(o => o.setName('role5').setDescription('Role 5').setRequired(false))
            .addRoleOption(o => o.setName('role6').setDescription('Role 6').setRequired(false))
            .addRoleOption(o => o.setName('role7').setDescription('Role 7').setRequired(false))
            .addRoleOption(o => o.setName('role8').setDescription('Role 8').setRequired(false))
            .addRoleOption(o => o.setName('role9').setDescription('Role 9').setRequired(false))
            .addRoleOption(o => o.setName('role10').setDescription('Role 10').setRequired(false))
            .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(false))
            .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(false))),

    async executeSlash(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const roles = [];
        for (let i = 1; i <= 10; i++) {
            const role = interaction.options.getRole(`role${i}`);
            if (role) roles.push(role);
        }

        const invalid = roles.find(r => r.managed || r.id === interaction.guild.id);
        if (invalid) return interaction.editReply({ embeds: [errorEmbed(`**${invalid.name}** can't be assigned (managed role or @everyone).`)] });

        const me = interaction.guild.members.me;
        const tooHigh = roles.find(r => r.position >= me.roles.highest.position);
        if (tooHigh) return interaction.editReply({ embeds: [errorEmbed(`**${tooHigh.name}** is higher than or equal to my highest role.`)] });

        const embed = new EmbedBuilder().setColor(0x7c3aed).setTitle(title);
        if (description) embed.setDescription(description);

        if (sub === 'buttons') {
            const row = new ActionRowBuilder().addComponents(
                roles.map(role => new ButtonBuilder().setCustomId(`wf_role_btn_${role.id}`).setLabel(role.name).setStyle(ButtonStyle.Secondary)),
            );
            await targetChannel.send({ embeds: [embed], components: [row] });
        } else {
            const placeholder = interaction.options.getString('placeholder');
            const menu = new StringSelectMenuBuilder()
                .setCustomId('wf_role_select')
                .setPlaceholder(placeholder)
                .setMinValues(0)
                .setMaxValues(roles.length)
                .addOptions(roles.map(role => ({ label: role.name, value: role.id })));
            await targetChannel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
        }

        await interaction.editReply({ embeds: [successEmbed(`Role menu sent to ${targetChannel}.`)] });
    },
};