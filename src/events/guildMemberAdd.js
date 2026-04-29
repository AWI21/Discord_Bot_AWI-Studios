const { EmbedBuilder } = require('discord.js');
const { getAutoRoles, getConfig } = require('../database/db');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // ── Auto Roles ───────────────────────────────────────────────────────────────
    const roleIds = getAutoRoles(member.guild.id);
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // ── Welcome message (optional) ───────────────────────────────────────────────
    const welcomeChannel = getConfig(member.guild.id, 'welcome_channel');
    if (!welcomeChannel) return;

    const channel = member.guild.channels.cache.get(welcomeChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle('🐺 New Pack Member!')
      .setDescription(`Welcome to **${member.guild.name}**, ${member}!\nYou are member **#${member.guild.memberCount}**.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  },
};
