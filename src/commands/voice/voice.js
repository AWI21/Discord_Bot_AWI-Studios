const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getTempChannelInfo, setTempChannelOwner } = require('../../systems/voiceTemp');

module.exports = {
    slashData: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Manage your temporary voice channel')
        .addSubcommand(s => s.setName('lock').setDescription('Lock the temporary voice channel'))
        .addSubcommand(s => s.setName('unlock').setDescription('Unlock the temporary voice channel'))
        .addSubcommand(s => s.setName('hide').setDescription('Hide the temporary voice channel'))
        .addSubcommand(s => s.setName('reveal').setDescription('Reveal the temporary voice channel'))
        .addSubcommand(s => s.setName('claim').setDescription('Claim ownership of the channel if owner left'))
        .addSubcommand(s => s.setName('owner').setDescription('Check who owns the temporary voice channel'))
        .addSubcommand(s =>
            s.setName('rename')
                .setDescription('Rename the temporary channel')
                .addStringOption(o => o.setName('name').setDescription('New channel name').setRequired(true))
        )
        .addSubcommand(s =>
            s.setName('limit')
                .setDescription('Change user limit (0 for unlimited)')
                .addIntegerOption(o => o.setName('user_limit').setDescription('Limit (0-99)').setRequired(true).setMinValue(0).setMaxValue(99))
        )
        .addSubcommand(s =>
            s.setName('kick')
                .setDescription('Kick a member from the voice channel')
                .addUserOption(o => o.setName('member').setDescription('Member to kick').setRequired(true))
        )
        .addSubcommand(s =>
            s.setName('ban')
                .setDescription('Ban a member from joining the channel')
                .addUserOption(o => o.setName('member').setDescription('Member to ban').setRequired(true))
        )
        .addSubcommand(s =>
            s.setName('unban')
                .setDescription('Unban a member from joining the channel')
                .addUserOption(o => o.setName('member').setDescription('Member to unban').setRequired(true))
        )
        .addSubcommand(s =>
            s.setName('transfer')
                .setDescription('Transfer channel ownership to another member')
                .addUserOption(o => o.setName('member').setDescription('New owner').setRequired(true))
        ),

    async executeSlash(interaction) {
        const member = interaction.member;
        const channel = member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: '❌ You must be in a temporary voice channel to use this.', flags: MessageFlags.Ephemeral });
        }

        const info = getTempChannelInfo(channel.id);
        if (!info) {
            return interaction.reply({ content: '❌ This is not a temporary voice channel.', flags: MessageFlags.Ephemeral });
        }

        const sub = interaction.options.getSubcommand();
        const isOwner = info.ownerId === member.id;
        const isAdmin = member.permissions.has(PermissionFlagsBits.ManageChannels);

        // Ownership check for management commands
        if (!['claim', 'owner'].includes(sub) && !isOwner && !isAdmin) {
            return interaction.reply({ content: '🔒 Only the channel owner can manage this channel.', flags: MessageFlags.Ephemeral });
        }

        switch (sub) {
            case 'owner':
                return interaction.reply({ content: `👑 Current channel owner is <@${info.ownerId}>.`, flags: MessageFlags.Ephemeral });

            case 'claim':
                if (channel.members.has(info.ownerId)) {
                    return interaction.reply({ content: '❌ The owner is still present in the voice channel.', flags: MessageFlags.Ephemeral });
                }
                setTempChannelOwner(channel.id, member.id);
                return interaction.reply({ content: `👑 You are now the owner of **${channel.name}**!` });

            case 'lock':
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
                return interaction.reply({ content: `🔒 Locked **${channel.name}**.` });

            case 'unlock':
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
                return interaction.reply({ content: `🔓 Unlocked **${channel.name}**.` });

            case 'hide':
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
                return interaction.reply({ content: `🙈 Hidden **${channel.name}**.` });

            case 'reveal':
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: null });
                return interaction.reply({ content: `👁️ Revealed **${channel.name}**.` });

            case 'rename': {
                const newName = interaction.options.getString('name');
                await channel.setName(newName);
                return interaction.reply({ content: `✏️ Renamed channel to **${newName}**.` });
            }

            case 'limit': {
                const limit = interaction.options.getInteger('user_limit');
                await channel.setUserLimit(limit);
                return interaction.reply({ content: `👥 Set user limit to **${limit === 0 ? 'Unlimited' : limit}**.` });
            }

            case 'kick': {
                const target = interaction.options.getMember('member');
                if (!target || target.voice.channelId !== channel.id) {
                    return interaction.reply({ content: '❌ That user is not in your channel.', flags: MessageFlags.Ephemeral });
                }
                await target.voice.disconnect();
                return interaction.reply({ content: `👢 Kicked **${target.user.username}** from the channel.` });
            }

            case 'ban': {
                const target = interaction.options.getMember('member');
                if (!target) return interaction.reply({ content: '❌ Member not found.', flags: MessageFlags.Ephemeral });

                await channel.permissionOverwrites.edit(target.id, { Connect: false });
                if (target.voice.channelId === channel.id) {
                    await target.voice.disconnect();
                }
                return interaction.reply({ content: `🚫 Banned **${target.user.username}** from joining this channel.` });
            }

            case 'unban': {
                const target = interaction.options.getMember('member');
                if (!target) return interaction.reply({ content: '❌ Member not found.', flags: MessageFlags.Ephemeral });

                await channel.permissionOverwrites.delete(target.id);
                return interaction.reply({ content: `✅ Unbanned **${target.user.username}**.` });
            }

            case 'transfer': {
                const target = interaction.options.getMember('member');
                if (!target || !channel.members.has(target.id)) {
                    return interaction.reply({ content: '❌ New owner must be inside the voice channel.', flags: MessageFlags.Ephemeral });
                }
                setTempChannelOwner(channel.id, target.id);
                return interaction.reply({ content: `👑 Transferred ownership of **${channel.name}** to ${target}.` });
            }
        }
    }
};