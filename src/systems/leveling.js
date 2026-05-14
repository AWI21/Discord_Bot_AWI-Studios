const { EmbedBuilder } = require('discord.js');
const { getUser, addXP, setLevel, getConfig, getAchievements, grantAchievement, hasAchievement } = require('../database/db');

const LEVEL_ROLES = [5, 10, 20, 30, 40, 50];
const XP_PER_MESSAGE = 4;
const XP_PER_LEVEL = 80;

function calculateLevel(totalXp) { return Math.floor(totalXp / XP_PER_LEVEL); }
function xpForNextLevel(level) { return (level + 1) * XP_PER_LEVEL; }

async function handleXP(message, client) {
  const key = `${message.author.id}-${message.guild.id}`;
  if (client.xpCooldowns.has(key)) return;
  client.xpCooldowns.set(key, true);
  setTimeout(() => client.xpCooldowns.delete(key), 15_000);

  // 1. Get current data
  let userData = await getUser(message.author.id, message.guild.id);
  const oldLevel = userData ? calculateLevel(userData.xp) : 0;

  // 2. Update the XP in DB
  await addXP(message.author.id, message.guild.id, XP_PER_MESSAGE);

  // 3. Get the UPDATED data to see the new stats
  userData = await getUser(message.author.id, message.guild.id);
  const newLevel = calculateLevel(userData.xp);

  // 4. Compare
  if (newLevel > oldLevel) {
    await setLevel(message.author.id, message.guild.id, newLevel);
    await handleLevelUp(message, client, newLevel, userData.xp);
  }

  await checkAchievements(message, client, userData);
}

async function handleLevelUp(message, client, newLevel, totalXp) {
  const guild = message.guild;

  if (LEVEL_ROLES.includes(newLevel)) {
    const roleId = await getConfig(guild.id, `level_role_${newLevel}`);
    if (roleId) {
      const role = guild.roles.cache.get(roleId);
      const member = guild.members.cache.get(message.author.id);
      if (role && member) {
        for (const lvl of LEVEL_ROLES) {
          if (lvl < newLevel) {
            const oldRoleId = await getConfig(guild.id, `level_role_${lvl}`);
            if (oldRoleId) {
              const oldRole = guild.roles.cache.get(oldRoleId);
              if (oldRole && member.roles.cache.has(oldRoleId)) await member.roles.remove(oldRole).catch(() => {});
            }
          }
        }
        await member.roles.add(role).catch(() => {});
      }
    }
  }

// Replace the old channel lookup with this:
  const levelChannelId = await getConfig(guild.id, 'level_channel');
  let targetChannel = message.channel; // Default to current channel

  if (levelChannelId) {
    // Clean the ID just in case it has <# > symbols
    const cleanId = levelChannelId.replace(/[<#>]/g, '');

    // Try cache first, then fetch from Discord API
    targetChannel = guild.channels.cache.get(cleanId) ||
        await guild.channels.fetch(cleanId).catch(() => null) ||
        message.channel;
  }

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed).setTitle('🎉 Level Up!')
    .setDescription(`Level UP! ${message.author}, you just ranked up and reached Level ${newLevel}! 🐺`)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Total XP: ${totalXp.toLocaleString()}` }).setTimestamp();

  if (LEVEL_ROLES.includes(newLevel)) {
    const roleId = await getConfig(guild.id, `level_role_${newLevel}`);
    if (roleId) embed.addFields({ name: '🎖️ Role Reward', value: `<@&${roleId}>`, inline: true });
  }

  await targetChannel.send({ content: `🎉 ${message.author}`, embeds: [embed] }).catch(() => {});
}

async function checkAchievements(message, client, userData) {
  const achievements = await getAchievements(message.guild.id);
  for (const ach of achievements) {
    if (await hasAchievement(message.author.id, message.guild.id, ach.id)) continue;
    let earned = false;
    const currentLevel = calculateLevel(userData.xp);
    switch (ach.requirement_type) {
      case 'messages': earned = userData.messages >= ach.requirement_value; break;
      case 'level': earned = currentLevel >= ach.requirement_value; break;
      case 'xp': earned = userData.xp >= ach.requirement_value; break;
    }
    if (earned) {
      const granted = await grantAchievement(message.author.id, message.guild.id, ach.id);
      if (granted) await notifyAchievement(message, client, ach);
    }
  }
}

async function notifyAchievement(message, client, achievement) {
  const embed = new EmbedBuilder()
      .setColor(0xf59e0b).setTitle('🏆 Achievement Unlocked!')
      .setDescription(`Milestone reached! ${message.author}, you just unlocked the ${achievement.name} achievement! 🏆\n> ${achievement.description}`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true })).setTimestamp();

  if (achievement.reward_role_id) {
    const role = message.guild.roles.cache.get(achievement.reward_role_id);
    const member = message.guild.members.cache.get(message.author.id);
    if (role && member) await member.roles.add(role).catch(() => {});
    embed.addFields({ name: '🎖️ Role Reward', value: `<@&${achievement.reward_role_id}>`, inline: true });
  }

  if (achievement.reward_xp > 0) {
    await addXP(message.author.id, message.guild.id, achievement.reward_xp);
    embed.addFields({ name: '⭐ XP Reward', value: `+${achievement.reward_xp} XP`, inline: true });
  }

  // --- ROBUST CHANNEL LOOKUP ---
  const levelChannelId = await getConfig(message.guild.id, 'level_channel');
  let ch = message.channel;

  if (levelChannelId) {
    const cleanId = levelChannelId.replace(/[<#>]/g, '');
    ch = message.guild.channels.cache.get(cleanId) ||
        await message.guild.channels.fetch(cleanId).catch(() => null) ||
        message.channel;
  }
  // -----------------------------

  if (ch) await ch.send({ content: `🏆 ${message.author}`, embeds: [embed] }).catch(() => {});
}

module.exports = { handleXP, calculateLevel, xpForNextLevel, XP_PER_LEVEL };
