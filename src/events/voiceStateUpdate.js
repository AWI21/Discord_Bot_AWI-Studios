const { ChannelType } = require('discord.js');
const { getConfig } = require('../database/db');
const { addTempChannel, removeTempChannel, isTempChannel } = require('../systems/voiceTemp');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        if (oldState.channelId === newState.channelId) return;
        const guild = newState.guild;

        if (oldState.channelId && isTempChannel(oldState.channelId)) {
            const channel = oldState.channel;
            if (channel && channel.members.size === 0) {
                removeTempChannel(channel.id);
                await channel.delete().catch(() => {});
            }
        }

        if (newState.member?.user.bot) return;

        const jtcChannelId = await getConfig(guild.id, 'jtc_channel');
        if (!jtcChannelId || newState.channelId !== jtcChannelId) return;

        const source = newState.channel;
        if (!source) return;

        const template = (await getConfig(guild.id, 'jtc_name_template')) || "{user}'s Channel";
        const name = template.replace('{user}', newState.member.user.username).slice(0, 100);

        let created;
        try {
            created = await guild.channels.create({
                name,
                type: ChannelType.GuildVoice,
                parent: source.parentId || undefined,
                userLimit: source.userLimit,
                bitrate: source.bitrate,
                permissionOverwrites: source.permissionOverwrites.cache.map(o => ({ id: o.id, type: o.type, allow: o.allow, deny: o.deny })),
            });
            addTempChannel(created.id);
        } catch (err) {
            console.error('JTC channel creation failed:', err);
            return;
        }

        try {
            await newState.member.voice.setChannel(created);
        } catch (err) {
            console.error('JTC move failed:', err);
            removeTempChannel(created.id);
            await created.delete().catch(() => {});
        }
    },
};