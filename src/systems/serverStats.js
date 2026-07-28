const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getConfig, setConfig } = require('../database/db');

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minut cooldownu na renamy kanałów
const state = new Map();

const DEFAULT_TEMPLATES = {
    all: '👥┃Members: {count}',
    human: '✅┃Humans: {count}',
    bots: '🤖┃Bots: {count}'
};

async function setupStatChannel(guild, type, customTemplate = null) {
    // 1. Sprawdzenie / Tworzenie kategorii
    let categoryId = await getConfig(guild.id, 'stats_category');
    let category = categoryId ? guild.channels.cache.get(categoryId) : null;

    if (!category) {
        category = await guild.channels.create({
            name: '📊 Server Stats',
            type: ChannelType.GuildCategory
        });
        await setConfig(guild.id, 'stats_category', category.id);
    }

    const overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect], allow: [PermissionFlagsBits.ViewChannel] }];

    // Jeśli podano 'full' - tworzymy wszystkie 3 kanały
    const typesToSetup = type === 'full' ? ['all', 'human', 'bots'] : [type];

    for (const t of typesToSetup) {
        const template = customTemplate || DEFAULT_TEMPLATES[t];
        await setConfig(guild.id, `stats_${t}_template`, template);

        const existingId = await getConfig(guild.id, `stats_${t}_channel`);
        let channel = existingId ? guild.channels.cache.get(existingId) : null;

        if (!channel) {
            channel = await guild.channels.create({
                name: template.replace('{count}', '0'),
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: overwrites
            });
            await setConfig(guild.id, `stats_${t}_channel`, channel.id);
        }
    }

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
    const types = ['all', 'human', 'bots'];
    let hasAnyChannel = false;

    for (const t of types) {
        const channelId = await getConfig(guild.id, `stats_${t}_channel`);
        if (channelId) {
            hasAnyChannel = true;
            break;
        }
    }

    if (!hasAnyChannel) return;

    await guild.members.fetch().catch(() => {});
    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;
    const counts = { all: total, human: humans, bots: bots };

    for (const t of types) {
        const channelId = await getConfig(guild.id, `stats_${t}_channel`);
        if (!channelId) continue;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) continue;

        const template = await getConfig(guild.id, `stats_${t}_template`) || DEFAULT_TEMPLATES[t];
        const newName = template.includes('{count}') ? template.replace('{count}', counts[t]) : `${template}: ${counts[t]}`;

        if (channel.name !== newName) {
            await channel.setName(newName).catch(() => {});
        }
    }
}

module.exports = { setupStatChannel, updateStatsChannels };