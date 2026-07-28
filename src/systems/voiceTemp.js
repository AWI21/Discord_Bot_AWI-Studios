const { ChannelType } = require('discord.js');
const { getConfig } = require('../database/db');

// Mapuje channelId -> { ownerId }
const tempChannels = new Map();

// Helpery z zachowaniem kompatybilności
function addTempChannel(id, ownerId) { tempChannels.set(id, { ownerId }); }
function removeTempChannel(id) { tempChannels.delete(id); }
function isTempChannel(id) { return tempChannels.has(id); }

// Nowe helpery do komend /voice
function getTempChannelInfo(id) { return tempChannels.get(id); }
function setTempChannelOwner(id, newOwnerId) {
    const data = tempChannels.get(id);
    if (data) {
        data.ownerId = newOwnerId;
        tempChannels.set(id, data);
    }
}

async function handleVoiceStateUpdate(oldState, newState) {
    const { guild, member } = newState;
    if (!guild) return;

    const jtcChannelId = await getConfig(guild.id, 'jtc_channel_id');
    const nameTemplate = (await getConfig(guild.id, 'jtc_name_template')) || "{user}'s Channel";

    // Wejście na kanał wyzwalający (JTC)
    if (newState.channelId && newState.channelId === jtcChannelId) {
        const triggerChannel = newState.channel;
        const channelName = nameTemplate.replace('{user}', member.displayName || member.user.username);

        try {
            const tempChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: triggerChannel.parentId,
                bitrate: triggerChannel.bitrate,
                userLimit: triggerChannel.userLimit,
                permissionOverwrites: triggerChannel.permissionOverwrites.cache.map(p => p.toJSON()),
            });

            // Zapisujemy kanał wraz z właścicielem
            addTempChannel(tempChannel.id, member.id);
            await member.voice.setChannel(tempChannel);
        } catch (err) {
            console.error('Failed to create temp voice channel:', err);
        }
    }

    // Wyjście z tymczasowego kanału
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const oldChannel = oldState.channel;
        if (oldChannel && isTempChannel(oldChannel.id)) {
            if (oldChannel.members.size === 0) {
                removeTempChannel(oldChannel.id);
                await oldChannel.delete().catch(() => {});
            }
        }
    }
}

module.exports = {
    handleVoiceStateUpdate,
    addTempChannel,
    removeTempChannel,
    isTempChannel,
    getTempChannelInfo,
    setTempChannelOwner,
};