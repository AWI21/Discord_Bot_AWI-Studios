const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { addXP, setLevel, getConfig, getAchievements, grantAchievement, hasAchievement, getUser } = require('../database/db');
const { generateLevelCard, xpForLevel, getTotalXPForLevel } = require('../utils/canvas');

const LEVEL_ROLES = [5, 10, 20, 30, 40, 50];

// XP per message: random 15–25
function randomXP() {
  return Math.floor(Math.random() * 11) + 15;
}

async function handleXP(message, client) {
  // 60s cooldown per user per guild
  const key = `${message.author.id}-${message.guild.id}`;
  if (client.xpCooldowns.has(key)) return;
  client.xpCooldowns.set(key, true);
  setTimeout(() => client.xpCooldowns.delete(key), 60_000);

  const xpGain = randomXP();
  const userData = addXP(message.author.id, message.guild.id, xpGain);

  // Check level up
  const newLevel = calculateLevel(userData.xp);
  if (newLevel > userData.level) {
    setLevel(message.author.id, message.guild.id, newLevel);
    await handleLevelUp(message, client, newLevel, userData.xp);
  }

  // Check achievements
  await checkAchievements(message, client, userData);
}

function calculateLevel(totalXp) {
  let level = 0;
  let xpAccum = 0;
  while (true) {
    const needed = xpForLevel(level + 1);
    if (xpAccum + needed > totalXp) break;
    xpAccum += needed;
    level++;
  }
  return level;
}

async function handleLevelUp(message, client, newLevel, totalXp) {
  const guild = message.guild;

  // ── Assign level role ───────────────────────────────────────────────────────
  if (LEVEL_ROLES.includes(newLevel)) {
    const roleKey = `level_role_${newLevel}`;
    const roleId = getConfig(guild.id, roleKey);
    if (roleId) {
      const role = guild.roles.cache.get(roleId);
      const member = guild.members.cache.get(message.author.id);
      if (role && member) {
        // Remove old level roles, add new one
        for (const lvl of LEVEL_ROLES) {
          if (lvl < newLevel) {
            const oldRoleId = getConfig(guild.id, `level_role_${lvl}`);
            if (oldRoleId) {
              const oldRole = guild.roles.cache.get(oldRoleId);
              if (oldRole && member.roles.cache.has(oldRoleId)) {
                await member.roles.remove(oldRole).catch(() => {});
              }
            }
          }
        }
        await member.roles.add(role).catch(() => {});
      }
    }
  }

  // ── Send level-up notification ──────────────────────────────────────────────
  const levelChannelId = getConfig(guild.id, 'level_channel');
  const targetChannel = levelChannelId
    ? guild.channels.cache.get(levelChannelId)
    : message.channel;

  if (!targetChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle('🎉 Level Up!')
    .setDescription(`${message.author} has reached **Level ${newLevel}**!`)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `Total XP: ${totalXp.toLocaleString()}` })
    .setTimestamp();

  if (LEVEL_ROLES.includes(newLevel)) {
    const roleId = getConfig(guild.id, `level_role_${newLevel}`);
    if (roleId) embed.addFields({ name: '🎖️ Role Reward', value: `<@&${roleId}>`, inline: true });
  }

  await targetChannel.send({ embeds: [embed] }).catch(() => {});
}

async function checkAchievements(message, client, userData) {
  const achievements = getAchievements(message.guild.id);
  for (const ach of achievements) {
    if (hasAchievement(message.author.id, message.guild.id, ach.id)) continue;

    let earned = false;
    switch (ach.requirement_type) {
      case 'messages': earned = userData.messages >= ach.requirement_value; break;
      case 'level': earned = userData.level >= ach.requirement_value; break;
      case 'xp': earned = userData.xp >= ach.requirement_value; break;
    }

    if (earned) {
      const didGrant = grantAchievement(message.author.id, message.guild.id, ach.id);
      if (didGrant) {
        await notifyAchievement(message, client, ach);
      }
    }
  }
}

async function notifyAchievement(message, client, achievement) {
  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle('🏆 Achievement Unlocked!')
    .setDescription(`${message.author} earned **${achievement.name}**!\n${achievement.description}`)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  if (achievement.reward_role_id) {
    const role = message.guild.roles.cache.get(achievement.reward_role_id);
    const member = message.guild.members.cache.get(message.author.id);
    if (role && member) await member.roles.add(role).catch(() => {});
    embed.addFields({ name: '🎖️ Role Reward', value: `<@&${achievement.reward_role_id}>`, inline: true });
  }
  if (achievement.reward_xp > 0) {
    addXP(message.author.id, message.guild.id, achievement.reward_xp);
    embed.addFields({ name: '⭐ XP Reward', value: `+${achievement.reward_xp} XP`, inline: true });
  }

  const levelChannelId = getConfig(message.guild.id, 'level_channel');
  const ch = levelChannelId
    ? message.guild.channels.cache.get(levelChannelId)
    : message.channel;
  if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { handleXP, calculateLevel };
