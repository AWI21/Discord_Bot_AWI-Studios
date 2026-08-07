const config = require('../config.js');
const { EmbedBuilder } = require('discord.js');
const { getAutoRoles, getConfig } = require('../database/db');
const { logAction } = require('../utils/logger');
const { formatTemplate, resolveChannel } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const roleIds = await getAutoRoles(member.guild.id);
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(() => {});
    }

    const welcomeChannelId = await getConfig(member.guild.id, 'welcome_channel');
    const channel = await resolveChannel(member.guild, welcomeChannelId);
    if (channel) {
      const customMsg = await getConfig(member.guild.id, 'welcome_msg');
      const template = customMsg || config.welcomeMsg;

      const messageContent = formatTemplate(template, {
        user: member,
        guildName: member.guild.name,
        memberCount: member.guild.memberCount,
      });

      const embed = new EmbedBuilder()
          .setColor(config.color)
          .setTitle('New Member!')
          .setDescription(messageContent)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    await logAction(member.guild, 'member_join', {
      moderator: null, target: member.user, reason: null,
      extra: { 'Account Age': `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, 'Member Count': String(member.guild.memberCount) },
    });
  },
};