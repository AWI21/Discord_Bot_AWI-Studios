const { EmbedBuilder } = require('discord.js');
const { getUser, addXP, setLevel, getConfig, getAchievements, grantAchievement, hasAchievement } = require('../database/db');

const LEVEL_ROLES = [5, 10, 20, 30, 40, 50];
const XP_PER_MESSAGE = 4;

function calculateLevel(totalXp) {
  let level = 0;
  let xpNeededForNext = 120;
  let accumulatedXp = 0;

  while (totalXp >= accumulatedXp + xpNeededForNext) {
    accumulatedXp += xpNeededForNext;
    level++;
    xpNeededForNext += 60; // Scaling factor: +60 each time
  }
  return level;
}

function totalXpForLevel(level) {
  let total = 0;
  let currentLevelRequirement = 120;
  for (let i = 0; i < level; i++) {
    total += currentLevelRequirement;
    currentLevelRequirement += 60;
  }
  return total;
}

function xpForNextLevel(level) {
  return totalXpForLevel(level + 1);
}

async function handleXP(message, client) {
  const key = `${message.author.id}-${message.guild.id}`;
  if (client.xpCooldowns.has(key)) return;
  client.xpCooldowns.set(key, true);
  setTimeout(() => client.xpCooldowns.delete(key), 15_000);

  let userData = await getUser(message.author.id, message.guild.id);
  const oldLevel = userData ? calculateLevel(userData.xp) : 0;

  await addXP(message.author.id, message.guild.id, XP_PER_MESSAGE);

  // Get the UPDATED data to see the new stats
  userData = await getUser(message.author.id, message.guild.id);
  const newLevel = calculateLevel(userData.xp);

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

  const levelChannelId = await getConfig(guild.id, 'level_channel');
  let targetChannel = message.channel;

  if (levelChannelId) {
    const cleanId = levelChannelId.replace(/[<#>]/g, '');
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

  const levelChannelId = await getConfig(message.guild.id, 'level_channel');
  let ch = message.channel;

  if (levelChannelId) {
    const cleanId = levelChannelId.replace(/[<#>]/g, '');
    ch = message.guild.channels.cache.get(cleanId) ||
        await message.guild.channels.fetch(cleanId).catch(() => null) ||
        message.channel;
  }

  if (ch) await ch.send({ content: `🏆 ${message.author}`, embeds: [embed] }).catch(() => {});
}

// 🟩 Helper function for canvas rank cards
function getRankStats(totalXp) {
  const level = calculateLevel(totalXp);
  const currentLevelStartXP = totalXpForLevel(level);
  const nextLevelStartXP = totalXpForLevel(level + 1);

  return {
    level: level,
    xpInCurrentLevel: totalXp - currentLevelStartXP,                 // Progress inside the current level bar
    xpRequiredForLevelGap: nextLevelStartXP - currentLevelStartXP,   // Total width of the current level bar (120, 180, 240...)
    totalNextLevelXP: nextLevelStartXP                              // Cumulative XP needed for next level
  };
}

// 🟩 Updated exports containing the fixes
module.exports = {
  handleXP,
  calculateLevel,
  xpForNextLevel,
  totalXpForLevel,
  getRankStats
};