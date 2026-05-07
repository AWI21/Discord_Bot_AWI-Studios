const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getAchievements, createAchievement, getUserAchievements } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'achievements',
  aliases: ['ach'],
  slashData: new SlashCommandBuilder()
    .setName('achievements').setDescription('View or manage achievements')
    .addSubcommand(s => s.setName('list').setDescription('List all server achievements'))
    .addSubcommand(s => s.setName('view').setDescription("View a user's achievements").addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand(s => s.setName('add').setDescription('Add achievement (Admin)')
      .addStringOption(o => o.setName('name').setDescription('Name').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
      .addStringOption(o => o.setName('type').setDescription('Requirement type').setRequired(true).addChoices({ name: 'Messages', value: 'messages' }, { name: 'Level', value: 'level' }, { name: 'XP', value: 'xp' }))
      .addIntegerOption(o => o.setName('value').setDescription('Required value').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role reward').setRequired(false))
      .addIntegerOption(o => o.setName('xp_reward').setDescription('XP reward').setRequired(false))),

  async execute(message, args, client, prefix) {
    const sub = args[0]?.toLowerCase();
    if (sub === 'add') {
      if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
      const parts = message.content.match(/"([^"]+)"/g);
      if (!parts || parts.length < 2) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}achievements add "Name" "Description" <messages|level|xp> <value>\``)] });
      const [name, description] = parts.map(p => p.replace(/"/g, ''));
      const reqArgs = message.content.replace(/"[^"]+"/g, '').trim().split(/\s+/).slice(2);
      const reqType = reqArgs[0], reqValue = parseInt(reqArgs[1]);
      if (!['messages', 'level', 'xp'].includes(reqType) || isNaN(reqValue)) return message.reply({ embeds: [errorEmbed('Type must be: messages, level, or xp.')] });
      const rewardRole = message.mentions.roles.first();
      await createAchievement(message.guild.id, name, description, reqType, reqValue, rewardRole?.id || null, parseInt(reqArgs[reqArgs.length - 1]) || 0);
      return message.reply({ embeds: [successEmbed(`Achievement **${name}** created!`)] });
    }
    const targetUser = message.mentions.users.first();
    if (targetUser) return message.reply({ embeds: [await buildUserEmbed(targetUser, message.guild)] });
    return message.reply({ embeds: [await buildListEmbed(message.guild, prefix)] });
  },

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')], flags: MessageFlags.Ephemeral });
      await createAchievement(interaction.guild.id, interaction.options.getString('name'), interaction.options.getString('description'), interaction.options.getString('type'), interaction.options.getInteger('value'), interaction.options.getRole('role')?.id || null, interaction.options.getInteger('xp_reward') || 0);
      return interaction.reply({ embeds: [successEmbed(`Achievement **${interaction.options.getString('name')}** created!`)], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'view') {
      const target = interaction.options.getUser('user');
      return interaction.reply({ embeds: [await buildUserEmbed(target, interaction.guild)] });
    }
    return interaction.reply({ embeds: [await buildListEmbed(interaction.guild, '/')] });
  },
};

async function buildUserEmbed(user, guild) {
  const earned = await getUserAchievements(user.id, guild.id);
  return new EmbedBuilder().setColor(0xf59e0b).setTitle(`🏆 ${user.username}'s Achievements`).setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(earned.length ? earned.map(a => `🏆 **${a.name}**\n${a.description}\n<t:${Math.floor(a.earned_at / 1000)}:R>`).join('\n\n') : 'No achievements earned yet.');
}

async function buildListEmbed(guild, prefix) {
  const all = await getAchievements(guild.id);
  return new EmbedBuilder().setColor(0xf59e0b).setTitle(`🏆 ${guild.name} — Achievements`)
    .setDescription(all.length ? all.map(a => `**${a.name}** — ${a.description}\nRequires: **${a.requirement_value} ${a.requirement_type}**${a.reward_role_id ? ` | <@&${a.reward_role_id}>` : ''}${a.reward_xp ? ` | +${a.reward_xp} XP` : ''}`).join('\n\n') : `No achievements yet.`);
}
