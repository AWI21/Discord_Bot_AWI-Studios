const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTempChannelInfo, setTempChannelOwner } = require('../../systems/voiceTemp');

const slashData = new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Manage your temporary voice & text channel')
    .addSubcommand(s => s.setName('lock').setDescription('Lock the voice channel'))
    .addSubcommand(s => s.setName('unlock').setDescription('Unlock the voice channel'))
    .addSubcommand(s => s.setName('hide').setDescription('Hide the voice channel'))
    .addSubcommand(s => s.setName('reveal').setDescription('Reveal the voice channel'))
    .addSubcommand(s => s.setName('claim').setDescription('Claim ownership if owner left'))
    .addSubcommand(s => s.setName('owner').setDescription('Check who owns this channel'))
    .addSubcommand(s =>
        s.setName('rename')
            .setDescription('Rename temporary channel')
            .addStringOption(o => o.setName('name').setDescription('New channel name').setRequired(true))
    )
    .addSubcommand(s =>
        s.setName('limit')
            .setDescription('Change user limit (0 for unlimited)')
            .addIntegerOption(o => o.setName('user_limit').setDescription('Limit (0-99)').setRequired(true).setMinValue(0).setMaxValue(99))
    )
    .addSubcommand(s =>
        s.setName('kick')
            .setDescription('Kick a member from voice')
            .addUserOption(o => o.setName('member').setDescription('Member to kick').setRequired(true))
    )
    .addSubcommand(s =>
        s.setName('ban')
            .setDescription('Ban a member from voice & text')
            .addUserOption(o => o.setName('member').setDescription('Member to ban').setRequired(true))
    )
    .addSubcommand(s =>
        s.setName('unban')
            .setDescription('Unban a member')
            .addUserOption(o => o.setName('member').setDescription('Member to unban').setRequired(true))
    )
    .addSubcommand(s =>
        s.setName('transfer')
            .setDescription('Transfer ownership to another member')
            .addUserOption(o => o.setName('member').setDescription('New owner').setRequired(true))
    );

async function handleVoiceCommand(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (err) {
        return;
    }

    const member = interaction.member;
    const voiceChan = member?.voice?.channel;

    if (!voiceChan) {
        return interaction.editReply({ content: '❌ You must be in a temporary voice channel to use this command.' });
    }

    const info = getTempChannelInfo(voiceChan.id);
    if (!info) {
        return interaction.editReply({ content: '❌ This is not a managed temporary voice channel.' });
    }

    const sub = interaction.options.getSubcommand();
    const isOwner = info.ownerId === member.id;
    const isAdmin = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!['claim', 'owner'].includes(sub) && !isOwner && !isAdmin) {
        return interaction.editReply({ content: '🔒 Only the channel owner can manage this channel.' });
    }

    const textChan = info.textId ? interaction.guild.channels.cache.get(info.textId) : null;

    try {
        switch (sub) {
            case 'owner':
                return interaction.editReply({ content: `👑 Current channel owner is <@${info.ownerId}>.` });

            case 'claim':
                if (voiceChan.members.has(info.ownerId)) {
                    return interaction.editReply({ content: '❌ The owner is still present in the voice channel.' });
                }
                setTempChannelOwner(voiceChan.id, member.id);
                if (textChan) {
                    await textChan.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
                }
                return interaction.editReply({ content: `👑 You are now the owner of **${voiceChan.name}**!` });

            case 'lock':
                await voiceChan.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
                if (!voiceChan.name.startsWith('🔒 ')) {
                    await voiceChan.setName(`🔒 ${voiceChan.name.replace(/^🔓\s*/, '')}`).catch(() => {});
                }
                return interaction.editReply({ content: `🔒 Locked **${voiceChan.name}**.` });

            case 'unlock':
                await voiceChan.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
                if (voiceChan.name.startsWith('🔒 ')) {
                    await voiceChan.setName(voiceChan.name.replace(/^🔒\s*/, '')).catch(() => {});
                }
                return interaction.editReply({ content: `🔓 Unlocked **${voiceChan.name}**.` });

            case 'hide':
                await voiceChan.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
                return interaction.editReply({ content: `🙈 Hidden **${voiceChan.name}**.` });

            case 'reveal':
                await voiceChan.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: null });
                return interaction.editReply({ content: `👁️ Revealed **${voiceChan.name}**.` });

            case 'rename': {
                const newName = interaction.options.getString('name');
                await voiceChan.setName(newName);
                if (textChan) {
                    const cleanName = newName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                    await textChan.setName(`💬-${cleanName}`).catch(() => {});
                }
                return interaction.editReply({ content: `✏️ Renamed channel to **${newName}**.` });
            }

            case 'limit': {
                const limit = interaction.options.getInteger('user_limit');
                await voiceChan.setUserLimit(limit);
                return interaction.editReply({ content: `👥 Set user limit to **${limit === 0 ? 'Unlimited' : limit}**.` });
            }

            case 'kick': {
                const target = interaction.options.getMember('member');
                if (!target || target.voice.channelId !== voiceChan.id) {
                    return interaction.editReply({ content: '❌ That user is not in your channel.' });
                }
                await target.voice.disconnect();
                return interaction.editReply({ content: `👢 Kicked **${target.user.username}** from voice.` });
            }

            case 'ban': {
                const target = interaction.options.getMember('member');
                if (!target) return interaction.editReply({ content: '❌ Member not found.' });

                await voiceChan.permissionOverwrites.edit(target.id, { Connect: false });
                if (textChan) {
                    await textChan.permissionOverwrites.edit(target.id, { ViewChannel: false }).catch(() => {});
                }
                if (target.voice.channelId === voiceChan.id) {
                    await target.voice.disconnect().catch(() => {});
                }
                return interaction.editReply({ content: `🚫 Banned **${target.user.username}** from joining voice & text.` });
            }

            case 'unban': {
                const target = interaction.options.getMember('member');
                if (!target) return interaction.editReply({ content: '❌ Member not found.' });

                await voiceChan.permissionOverwrites.delete(target.id).catch(() => {});
                if (textChan) {
                    await textChan.permissionOverwrites.delete(target.id).catch(() => {});
                }
                return interaction.editReply({ content: `✅ Unbanned **${target.user.username}**.` });
            }

            case 'transfer': {
                const target = interaction.options.getMember('member');
                if (!target || !voiceChan.members.has(target.id)) {
                    return interaction.editReply({ content: '❌ New owner must be inside the voice channel.' });
                }
                setTempChannelOwner(voiceChan.id, target.id);
                return interaction.editReply({ content: `👑 Transferred ownership of **${voiceChan.name}** to ${target}.` });
            }
        }
    } catch (err) {
        console.error('Error in /voice subcommand execution:', err);
        return interaction.editReply({ content: '❌ Failed to update channel permissions. Check bot permissions.' });
    }
}

module.exports = {
    data: slashData,
    slashData,
    execute: handleVoiceCommand,
    executeSlash: handleVoiceCommand,
};