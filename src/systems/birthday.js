const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getTodayBirthdays, getConfig } = require('../database/db');
const config = require('../config');

function startBirthdayChecker(client) {
  cron.schedule('0 0 * * *', () => checkBirthdays(client));
  checkBirthdays(client);
}

async function checkBirthdays(client) {
  const now = new Date();
  const birthdays = await getTodayBirthdays(now.getMonth() + 1, now.getDate());
  if (!birthdays.length) return;

  for (const bday of birthdays) {
    const guild = client.guilds.cache.get(bday.guild_id);
    if (!guild) continue;

    const channelId = await getConfig(bday.guild_id, 'birthday_channel');
    if (!channelId) continue;

    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    let member;
    try {
      member = await guild.members.fetch(bday.user_id);
    } catch {
      continue;
    }

    const customMsg = await getConfig(bday.guild_id, 'bday_notif_msg');
    const template = customMsg || config.bdayNotifMsg || "🎂 Happy Birthday {user}! Wish you the best! 🥳🎉";

    const messageContent = config.formatMsg(template, {
      user: member.toString(),
      username: member.user.username,
      guildName: guild.name
    });

    await channel.send({ content: messageContent }).catch(() => {});

    const birthdayRoleId = await getConfig(bday.guild_id, 'birthday_role');
    if (birthdayRoleId) {
      const role = guild.roles.cache.get(birthdayRoleId);
      if (role) {
        await member.roles.add(role).catch(() => {});
        setTimeout(async () => {
          await member.roles.remove(role).catch(() => {});
        }, 24 * 60 * 60 * 1000);
      }
    }
  }
}

module.exports = { startBirthdayChecker };