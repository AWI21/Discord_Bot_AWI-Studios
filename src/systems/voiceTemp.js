const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../database/db');

const tempChannels = new Map();

function addTempChannel(voiceId, textId, ownerId) {
    tempChannels.set(voiceId, { voiceId, textId, ownerId });
}

function removeTempChannel(voiceId) {
    tempChannels.delete(voiceId);
}

function isTempChannel(voiceId) {
    return tempChannels.has(voiceId);
}

function getTempChannelInfo(voiceId) {
    return tempChannels.get(voiceId);
}

function setTempChannelOwner(voiceId, newOwnerId) {
    const data = tempChannels.get(voiceId);
    if (data) {
        data.ownerId = newOwnerId;
        tempChannels.set(voiceId, data);
    }
}

async function handleVoiceStateUpdate(oldState, newState) {
    const { guild, member } = newState;
    if (!guild) return;

    const jtcChannelId = await getConfig(guild.id, 'jtc_channel_id');
    const nameTemplate = (await getConfig(guild.id, 'jtc_name_template')) || "{user}'s Channel";

    if (newState.channelId && newState.channelId === jtcChannelId) {
        const triggerChannel = newState.channel;
        const rawName = nameTemplate.replace('{user}', member.displayName || member.user.username);
        const cleanTextName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

        try {
            const tempVoice = await guild.channels.create({
                name: `🔒 ${rawName}`,
                type: ChannelType.GuildVoice,
                parent: triggerChannel.parentId,
                bitrate: triggerChannel.bitrate,
                userLimit: triggerChannel.userLimit,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.Connect],
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels],
                    },
                ],
            });

            const tempText = await guild.channels.create({
                name: `💬-${cleanTextName}`,
                type: ChannelType.GuildText,
                parent: triggerChannel.parentId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                    },
                ],
            });

            addTempChannel(tempVoice.id, tempText.id, member.id);
            await member.voice.setChannel(tempVoice);
        } catch (err) {
            console.error('Failed to create temp voice/text channels:', err);
        }
    }

    if (newState.channelId && isTempChannel(newState.channelId) && newState.channelId !== oldState.channelId) {
        const info = getTempChannelInfo(newState.channelId);
        if (info?.textId) {
            const textChan = guild.channels.cache.get(info.textId);
            if (textChan) {
                await textChan.permissionOverwrites.edit(member.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                }).catch(() => {});
            }
        }
    }

    if (oldState.channelId && isTempChannel(oldState.channelId) && oldState.channelId !== newState.channelId) {
        const oldVoice = oldState.channel;
        const info = getTempChannelInfo(oldVoice.id);

        if (oldVoice && info) {
            if (info.textId && member.id !== info.ownerId) {
                const textChan = guild.channels.cache.get(info.textId);
                if (textChan) {
                    await textChan.permissionOverwrites.delete(member.id).catch(() => {});
                }
            }

            if (oldVoice.members.size === 0) {
                removeTempChannel(oldVoice.id);

                if (info.textId) {
                    const textChan = guild.channels.cache.get(info.textId);
                    if (textChan) await textChan.delete().catch(() => {});
                }
                await oldVoice.delete().catch(() => {});
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