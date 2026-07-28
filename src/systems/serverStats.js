const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getConfig, setConfig } = require('../database/db');

const COOLDOWN_MS = 10 * 60 * 1000;
const state = new Map();

async function setupStatsChannels(guild) {
    const category = await guild.channels.create({ name: '📊 Server Stats', type: ChannelType.GuildCategory });
    const overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] }];

    const total = await guild.channels.create({ name: '👥 Members: 0', type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: overwrites });
    const humans = await guild.channels.create({ name: '✅ Humans: 0', type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: overwrites });
    const bots = await guild.channels.create({ name: '🤖 Bots: 0', type: ChannelType.GuildVoice, parent: category.id, permissionOverwrites: overwrites });

    await setConfig(guild.id, 'stats_category', category.id);
    await setConfig(guild.id, 'stats_total_channel', total.id);
    await setConfig(guild.id, 'stats_humans_channel', humans.id);
    await setConfig(guild.id, 'stats_bots_channel', bots.id);

    await updateStatsChannels(guild, true);
}

async function updateStatsChannels(guild, force = false) {
    const entry = state.get(guild.id) || { lastUpdate: 0, timeout: null, pending: false };
    const now = Date.now();

    if (!force && now - entry.lastUpdate < COOLDOWN_MS) {
        entry.pending = true;
        if (!entry.timeout) {
            entry.timeout = setTimeout(async () => {
                entry.timeout = null;
                if (entry.pending) {
                    entry.pending = false;
                    entry.lastUpdate = Date.now();
                    await applyStatsUpdate(guild);
                }
            }, COOLDOWN_MS - (now - entry.lastUpdate));
        }
        state.set(guild.id, entry);
        return;
    }

    entry.lastUpdate = now;
    entry.pending = false;
    state.set(guild.id, entry);
    await applyStatsUpdate(guild);
}

async function applyStatsUpdate(guild) {
    const totalId = await getConfig(guild.id, 'stats_total_channel');
    const humansId = await getConfig(guild.id, 'stats_humans_channel');
    const botsId = await getConfig(guild.id, 'stats_bots_channel');
    if (!totalId && !humansId && !botsId) return;

    await guild.members.fetch().catch(() => {});
    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;

    const totalChannel = totalId && guild.channels.cache.get(totalId);
    const humansChannel = humansId && guild.channels.cache.get(humansId);
    const botsChannel = botsId && guild.channels.cache.get(botsId);

    if (totalChannel) await totalChannel.setName(`👥┃Members: ${total}`).catch(() => {});
    if (humansChannel) await humansChannel.setName(`✅┃Humans: ${humans}`).catch(() => {});
    if (botsChannel) await botsChannel.setName(`🤖┃Bots: ${bots}`).catch(() => {});
}

module.exports = { setupStatsChannels, updateStatsChannels };