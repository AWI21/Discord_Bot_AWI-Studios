const { EmbedBuilder } = require('discord.js');
const { getUser, addXP, setLevel, getConfig, getAchievements, grantAchievement, hasAchievement } = require('../database/db');
const config = require('../config');
const { formatTemplate, resolveChannel } = require('../utils/helpers');

const LEVEL_ROLES = [5, 10, 20, 30, 40, 50, 100];
const XP_PER_MESSAGE = 4;

function calculateLevel(totalXp) {
  let level = 0;
  let xpNeededForNext = 120;
  let accumulatedXp = 0;

  while (totalXp >= accumulatedXp + xpNeededForNext) {
    accumulatedXp += xpNeededForNext;
    level++;
    xpNeededForNext += 60;
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
  let unlockedRoleId = null;

  if (LEVEL_ROLES.includes(newLevel)) {
    const roleId = await getConfig(guild.id, `level_role_${newLevel}`);
    if (roleId) {
      unlockedRoleId = roleId;
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
  const targetChannel = await resolveChannel(guild, levelChannelId, message.channel);

  const customMsg = await getConfig(guild.id, 'level_up_msg');
  const template = customMsg || config.levelUpMsg;

  const unlockedText = unlockedRoleId ? ` You unlocked <@&${unlockedRoleId}>! 🎖️` : '';

  const messageContent = formatTemplate(template, {
    user: message.author,
    level: newLevel,
    role: unlockedRoleId,
    unlockedText,
    guildName: guild.name,
  });

  await targetChannel.send({ content: messageContent }).catch(() => {});
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
  const customMsg = await getConfig(message.guild.id, 'achievement_notif_msg');
  const template = customMsg || config.achievementNotifMsg;

  const descriptionContent = formatTemplate(template, {
    user: message.author,
    name: achievement.name,
    description: achievement.description,
    guildName: message.guild.name,
  });

  const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('🏆 Achievement Unlocked!')
      .setDescription(descriptionContent)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

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
  const ch = await resolveChannel(message.guild, levelChannelId, message.channel);

  if (ch) await ch.send({ content: `🏆 ${message.author}`, embeds: [embed] }).catch(() => {});
}

function getRankStats(totalXp) {
  const level = calculateLevel(totalXp);
  const currentLevelStartXP = totalXpForLevel(level);
  const nextLevelStartXP = totalXpForLevel(level + 1);

  return {
    level: level,
    xpInCurrentLevel: totalXp - currentLevelStartXP,
    xpRequiredForLevelGap: nextLevelStartXP - currentLevelStartXP,
    totalNextLevelXP: nextLevelStartXP
  };
}

module.exports = {
  handleXP,
  calculateLevel,
  xpForNextLevel,
  totalXpForLevel,
  getRankStats
};