const { EmbedBuilder } = require('discord.js');
const { getAutoRoles, getConfig } = require('../database/db');
const { logAction } = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const roleIds = await getAutoRoles(member.guild.id);
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    const welcomeChannel = await getConfig(member.guild.id, 'welcome_channel');
    if (welcomeChannel) {
      const channel = member.guild.channels.cache.get(welcomeChannel);
      if (channel) {
        const embed = new EmbedBuilder().setColor(0x7c3aed).setTitle('🐺 New Pack Member!')
          .setDescription(`Welcome to **${member.guild.name}**, ${member}!\nYou are member **#${member.guild.memberCount}**.`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true })).setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    await logAction(member.guild, 'member_join', {
      moderator: null, target: member.user, reason: null,
      extra: { 'Account Age': `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, 'Member Count': String(member.guild.memberCount) },
    });
  },
};
