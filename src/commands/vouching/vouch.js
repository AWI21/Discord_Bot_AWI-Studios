const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addVouch, getVouches, getVouchLeaderboard, getConfig } = require('../../database/db');
const { requirePerms, successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  name: 'vouch',
  async execute(message, args, client, prefix) {
    if (!requirePerms(message, PermissionFlagsBits.ModerateMembers)) return;

    const target = message.mentions.members.first();
    const points = parseInt(args[1]) || 1;

    if (!target) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}vouch @user [points]\``)] });
    if (target.id === message.author.id) return message.reply({ embeds: [errorEmbed('You cannot vouch for yourself.')] });
    if (points < 1 || points > 100) return message.reply({ embeds: [errorEmbed('Points must be between 1 and 100.')] });

    addVouch(target.id, message.guild.id, points, message.author.id);
    const userData = getVouches(target.id, message.guild.id);

    // Check trusted fan role threshold
    const trustedRoleId = getConfig(message.guild.id, 'trusted_fan_role');
    const trustedThreshold = parseInt(getConfig(message.guild.id, 'trusted_fan_threshold')) || 10;
    if (trustedRoleId && userData.points >= trustedThreshold) {
      const role = message.guild.roles.cache.get(trustedRoleId);
      const member = message.guild.members.cache.get(target.id);
      if (role && member && !member.roles.cache.has(trustedRoleId)) {
        await member.roles.add(role).catch(() => {});
        await message.channel.send({ embeds: [new EmbedBuilder().setColor(0xf59e0b).setDescription(`🌟 ${target} has earned the **${role.name}** role with ${userData.points} vouches!`)] });
      }
    }

    await message.reply({ embeds: [successEmbed(`Vouched **+${points}** point(s) for **${target.user.tag}**.\nThey now have **${userData.points}** total vouch points.`)] });
  },
};
