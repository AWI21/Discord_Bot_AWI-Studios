const { EmbedBuilder, AuditLogEvent, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig } = require('../database/db');

async function getExecutor(guild, auditLogType, targetId) {
    try {
        const logs = await guild.fetchAuditLogs({ limit: 1, type: auditLogType });
        const entry = logs.entries.first();
        if (entry && entry.target?.id === targetId && (Date.now() - entry.createdTimestamp < 5000)) {
            return entry.executor;
        }
    } catch (err) {
        return null;
    }
    return null;
}

async function sendLog(guild, embed) {
    const logChannelId = await getConfig(guild.id, 'audit_log_channel');
    if (!logChannelId) return;
    const channel = guild.channels.cache.get(logChannelId);
    if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = (client) => {

    client.on('channelUpdate', async (oldChannel, newChannel) => {
        if (!oldChannel.guild) return;
        const executor = await getExecutor(oldChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
        const executorText = executor ? `**User:** ${executor.tag} (${executor.id})\n` : '';

        if (oldChannel.name !== newChannel.name) {
            const embed = new EmbedBuilder()
                .setColor(0x38b6ff)
                .setTitle('📝 Channel Updated')
                .setDescription(`${executorText}**Channel:** <#${newChannel.id}>\n**Name Changed:** \`#${oldChannel.name}\` ➔ \`#${newChannel.name}\``)
                .setFooter({ text: `ID: ${newChannel.id}` })
                .setTimestamp();
            return sendLog(oldChannel.guild, embed);
        }

        const oldOverwrites = oldChannel.permissionOverwrites.cache;
        const newOverwrites = newChannel.permissionOverwrites.cache;

        newOverwrites.forEach(async (newPerm, id) => {
            const oldPerm = oldOverwrites.get(id);
            const target = newChannel.guild.roles.cache.get(id) || newChannel.guild.members.cache.get(id);
            const targetName = target ? (target.name || target.user.tag) : id;

            if (!oldPerm) {
                const embed = new EmbedBuilder()
                    .setColor(0xf59e0b)
                    .setTitle('⚙️ Channel Permissions Added')
                    .setDescription(`${executorText}**Channel:** <#${newChannel.id}>\n**Permissions added for:** \`@${targetName}\``)
                    .setFooter({ text: `ID: ${newChannel.id}` })
                    .setTimestamp();
                return sendLog(oldChannel.guild, embed);
            }

            const allowDiff = newPerm.allow.missing(oldPerm.allow);
            const denyDiff = newPerm.deny.missing(oldPerm.deny);

            if (allowDiff.length > 0 || denyDiff.length > 0) {
                const changedPerms = [...allowDiff, ...denyDiff].join(', ');
                const embed = new EmbedBuilder()
                    .setColor(0x38b6ff)
                    .setTitle('⚙️ Channel Permissions Changed')
                    .setDescription(`${executorText}**Channel:** <#${newChannel.id}>\n**Permissions changed for:** \`@${targetName}\`\n**Modified:** \`${changedPerms}\``)
                    .setFooter({ text: `ID: ${newChannel.id}` })
                    .setTimestamp();
                sendLog(oldChannel.guild, embed);
            }
        });
    });

    client.on('roleUpdate', async (oldRole, newRole) => {
        const executor = await getExecutor(oldRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
        const executorText = executor ? `**User:** ${executor.tag}\n` : '';

        if (oldRole.hexColor !== newRole.hexColor) {
            const embed = new EmbedBuilder()
                .setColor(newRole.color || 0x38b6ff)
                .setTitle('🎨 Role Color Changed')
                .setDescription(`${executorText}**Role:** \`${newRole.name}\`\n**Color:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``)
                .setFooter({ text: `ID: ${newRole.id}` })
                .setTimestamp();
            return sendLog(oldRole.guild, embed);
        }

        if (oldRole.name !== newRole.name) {
            const embed = new EmbedBuilder()
                .setColor(0x38b6ff)
                .setTitle('✏️ Role Name Changed')
                .setDescription(`${executorText}**Name:** \`${oldRole.name}\` ➔ \`${newRole.name}\``)
                .setFooter({ text: `ID: ${newRole.id}` })
                .setTimestamp();
            return sendLog(oldRole.guild, embed);
        }
    });

    client.on('roleCreate', async (role) => {
        const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
        const executorText = executor ? `**Created By:** ${executor.tag}\n` : '';

        const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('➕ Role Created')
            .setDescription(`${executorText}**Role Name:** \`${role.name}\``)
            .setFooter({ text: `ID: ${role.id}` })
            .setTimestamp();

        sendLog(role.guild, embed);
    });

    client.on('channelCreate', async (channel) => {
        if (!channel.guild) return;
        const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
        const executorText = executor ? `**Created By:** ${executor.tag}\n` : '';

        const embed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('➕ Channel Created')
            .setDescription(`${executorText}**Channel:** <#${channel.id}> (\`#${channel.name}\`)`)
            .setFooter({ text: `ID: ${channel.id}` })
            .setTimestamp();

        sendLog(channel.guild, embed);
    });

};