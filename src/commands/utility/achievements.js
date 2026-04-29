const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAchievements, createAchievement, getUserAchievements } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'achievements',
  aliases: ['ach'],
  async execute(message, args, client, prefix) {
    const sub = args[0]?.toLowerCase();

    // ── !achievements add ────────────────────────────────────────────────────────
    if (sub === 'add') {
      if (!requirePerms(message, PermissionFlagsBits.ManageGuild)) return;
      // !achievements add "Name" "Description" messages|level|xp <value> [@role] [xp_reward]
      const parts = message.content.match(/"([^"]+)"/g);
      if (!parts || parts.length < 2) {
        return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}achievements add "Name" "Description" <messages|level|xp> <value> [@role] [xp_reward]\``)] });
      }
      const [name, description] = parts.map(p => p.replace(/"/g, ''));
      const type = args[parts.length * 2 - 1] || args[3];
      const reqArgs = message.content.replace(/"[^"]+"/g, '').trim().split(/\s+/).slice(2);
      const reqType = reqArgs[0];
      const reqValue = parseInt(reqArgs[1]);
      const rewardRole = message.mentions.roles.first();
      const rewardXP = parseInt(reqArgs[reqArgs.length - 1]) || 0;

      if (!['messages', 'level', 'xp'].includes(reqType) || isNaN(reqValue)) {
        return message.reply({ embeds: [errorEmbed('Requirement type must be: `messages`, `level`, or `xp`.')] });
      }

      createAchievement(message.guild.id, name, description, reqType, reqValue, rewardRole?.id || null, rewardXP);
      return message.reply({ embeds: [successEmbed(`Achievement **${name}** created!\nRequirement: **${reqValue} ${reqType}**`)] });
    }

    // ── !achievements @user — view specific user ──────────────────────────────────
    const targetUser = message.mentions.users.first();
    if (targetUser) {
      const earned = getUserAchievements(targetUser.id, message.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`🏆 ${targetUser.username}'s Achievements`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

      if (!earned.length) {
        embed.setDescription('No achievements earned yet.');
      } else {
        embed.setDescription(earned.map(a => `🏆 **${a.name}**\n${a.description}\n<t:${Math.floor(a.earned_at / 1000)}:R>`).join('\n\n'));
      }
      return message.reply({ embeds: [embed] });
    }

    // ── !achievements — list all server achievements ──────────────────────────────
    const all = getAchievements(message.guild.id);
    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle(`🏆 ${message.guild.name} — Achievements`);

    if (!all.length) {
      embed.setDescription(`No achievements set up yet.\nUse \`${prefix}achievements add "Name" "Description" <messages|level|xp> <value>\` to add one.`);
    } else {
      embed.setDescription(all.map(a => {
        const reward = a.reward_role_id ? ` | Role: <@&${a.reward_role_id}>` : '';
        const xpReward = a.reward_xp ? ` | +${a.reward_xp} XP` : '';
        return `**${a.name}** — ${a.description}\nRequires: **${a.requirement_value} ${a.requirement_type}**${reward}${xpReward}`;
      }).join('\n\n'));
    }

    message.reply({ embeds: [embed] });
  },
};
