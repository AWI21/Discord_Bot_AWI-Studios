const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { requirePerms, requireBotPerms, successEmbed, errorEmbed } = require('../../utils/helpers');
const { logAction } = require('../../utils/logger');

module.exports = {
  name: 'role',
  modOnly: true,
  slashData: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('add').setDescription('Add a role to a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a role from a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))),

  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ManageRoles)) return;
    if (!requireBotPerms(message, PermissionFlagsBits.ManageRoles)) return;
    const action = args[0]?.toLowerCase();
    if (!['add', 'remove'].includes(action)) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}role add/remove @user @role [reason]\``)] });
    const target = message.mentions.members.first();
    const role = message.mentions.roles.first();
    if (!target || !role) return message.reply({ embeds: [errorEmbed('Please mention a member and a role.')] });
    if (role.managed) return message.reply({ embeds: [errorEmbed('That role is managed by an integration.')] });
    if (role.position >= message.guild.members.me.roles.highest.position) return message.reply({ embeds: [errorEmbed('That role is higher than my highest role.')] });
    const reason = args.slice(3).join(' ') || 'No reason provided';
    const result = await _doRole(message.guild, target, role, action, message.author, reason);
    if (result) await message.reply({ embeds: [successEmbed(result)] });
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const action = interaction.options.getSubcommand();
    const target = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (role.managed) return interaction.editReply({ embeds: [errorEmbed('That role is managed by an integration.')] });
    if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ embeds: [errorEmbed('That role is higher than my highest role.')] });
    const result = await _doRole(interaction.guild, target, role, action, interaction.user, reason);
    if (result) await interaction.editReply({ embeds: [successEmbed(result)] });
  },
};

async function _doRole(guild, target, role, action, moderator, reason) {
  if (action === 'add') {
    if (target.roles.cache.has(role.id)) return errorEmbed('That member already has that role.');
    await target.roles.add(role, `${moderator.tag}: ${reason}`);
    await logAction(guild, 'role_add', { moderator, target: target.user, reason, extra: { Role: role.name } });
    return `Added **${role.name}** to **${target.user.tag}**.\n**Reason:** ${reason}`;
  } else {
    if (!target.roles.cache.has(role.id)) return errorEmbed("That member doesn't have that role.");
    await target.roles.remove(role, `${moderator.tag}: ${reason}`);
    await logAction(guild, 'role_remove', { moderator, target: target.user, reason, extra: { Role: role.name } });
    return `Removed **${role.name}** from **${target.user.tag}**.\n**Reason:** ${reason}`;
  }
}
