const { MessageFlags } = require('discord.js');
const { logAction } = require('../utils/logger');

async function handleRoleButtonToggle(interaction) {
    const roleId = interaction.customId.slice('wf_role_btn_'.length);
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ That role no longer exists.', flags: MessageFlags.Ephemeral });

    const member = interaction.member;
    const has = member.roles.cache.has(roleId);

    try {
        if (has) {
            await member.roles.remove(role);
            await logAction(interaction.guild, 'role_remove', { moderator: interaction.user, target: interaction.user, reason: 'Self-role button', extra: { Role: role.name } });
            return interaction.reply({ content: `➖ Removed **${role.name}**.`, flags: MessageFlags.Ephemeral });
        }
        await member.roles.add(role);
        await logAction(interaction.guild, 'role_add', { moderator: interaction.user, target: interaction.user, reason: 'Self-role button', extra: { Role: role.name } });
        return interaction.reply({ content: `➕ Added **${role.name}**.`, flags: MessageFlags.Ephemeral });
    } catch {
        return interaction.reply({ content: '❌ Could not update your roles. Check my role position and permissions.', flags: MessageFlags.Ephemeral });
    }
}

async function handleRoleSelectToggle(interaction) {
    const offeredIds = interaction.component.options.map(o => o.value);
    const selectedIds = interaction.values;
    const member = interaction.member;

    const toAdd = selectedIds.filter(id => !member.roles.cache.has(id));
    const toRemove = offeredIds.filter(id => !selectedIds.includes(id) && member.roles.cache.has(id));

    try {
        for (const id of toAdd) {
            const role = interaction.guild.roles.cache.get(id);
            if (role) {
                await member.roles.add(role);
                await logAction(interaction.guild, 'role_add', { moderator: interaction.user, target: interaction.user, reason: 'Self-role dropdown', extra: { Role: role.name } });
            }
        }
        for (const id of toRemove) {
            const role = interaction.guild.roles.cache.get(id);
            if (role) {
                await member.roles.remove(role);
                await logAction(interaction.guild, 'role_remove', { moderator: interaction.user, target: interaction.user, reason: 'Self-role dropdown', extra: { Role: role.name } });
            }
        }

        const addedNames = toAdd.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);
        const removedNames = toRemove.map(id => interaction.guild.roles.cache.get(id)?.name).filter(Boolean);
        const parts = [];
        if (addedNames.length) parts.push(`➕ ${addedNames.join(', ')}`);
        if (removedNames.length) parts.push(`➖ ${removedNames.join(', ')}`);

        return interaction.reply({ content: parts.length ? parts.join('\n') : 'No changes made.', flags: MessageFlags.Ephemeral });
    } catch {
        return interaction.reply({ content: '❌ Could not update your roles. Check my role position and permissions.', flags: MessageFlags.Ephemeral });
    }
}

module.exports = { handleRoleButtonToggle, handleRoleSelectToggle };