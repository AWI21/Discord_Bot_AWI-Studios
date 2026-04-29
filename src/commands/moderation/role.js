const { PermissionFlagsBits } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'role',
  description: 'Add or remove a role from a member',
  usage: '!role add/remove @user @role [reason]',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageRoles)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ManageRoles)) return;

    const action = args[0]?.toLowerCase();
    if (!['add', 'remove'].includes(action)) {
      return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}role add/remove @user @role [reason]\``)] });
    }

    const target = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!target || !role) return message.reply({ embeds: [errorEmbed('Please mention a member and a role.')] });
    if (role.managed) return message.reply({ embeds: [errorEmbed('That role is managed by an integration and cannot be assigned manually.')] });
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({ embeds: [errorEmbed('That role is higher than my highest role.')] });
    }

    const reason = args.slice(3).join(' ') || 'No reason provided';

    if (action === 'add') {
      if (target.roles.cache.has(role.id)) return message.reply({ embeds: [errorEmbed('That member already has that role.')] });
      await target.roles.add(role, `${message.author.tag}: ${reason}`);
      await message.reply({ embeds: [successEmbed(`Added **${role.name}** to **${target.user.tag}**.\n**Reason:** ${reason}`)] });
      await logAction(message.guild, 'role_add', { moderator: message.author, target: target.user, reason, extra: { Role: role.name } });
    } else {
      if (!target.roles.cache.has(role.id)) return message.reply({ embeds: [errorEmbed("That member doesn't have that role.")] });
      await target.roles.remove(role, `${message.author.tag}: ${reason}`);
      await message.reply({ embeds: [successEmbed(`Removed **${role.name}** from **${target.user.tag}**.\n**Reason:** ${reason}`)] });
      await logAction(message.guild, 'role_remove', { moderator: message.author, target: target.user, reason, extra: { Role: role.name } });
    }
  },
};
