const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getTodayBirthdays, getConfig } = require('../database/db');

function startBirthdayChecker(client) {
  // Checks every day at midnight
  cron.schedule('0 0 * * *', () => checkBirthdays(client));

  // Also runs once on startup
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

    const channel = guild.channels.cache.get(channelId) ||
        await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    let member;
    try {
      member = await guild.members.fetch(bday.user_id);
    } catch {
      continue;
    }

    // Modern, punchy embed layout
    const embed = new EmbedBuilder()
        .setColor(0xf472b6)
        .setTitle(`🎂 Happy Birthday ${member}!`)
        .setDescription(`Attention pack! Today is ${member}'s birthday! Go drop some Ws in chat! 🥳🎉`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Leveling up in real life • From ${guild.name}` })
        .setTimestamp();

    // ✅ Pings the member directly outside the embed so they get notified
    await channel.send({
      content: `🎂 Happy Birthday ${member}!`,
      embeds: [embed]
    }).catch(() => {});

    const birthdayRoleId = await getConfig(bday.guild_id, 'birthday_role');
    if (birthdayRoleId) {
      const role = guild.roles.cache.get(birthdayRoleId);
      if (role) {
        await member.roles.add(role).catch(() => {});
        // Removes the role after 24 hours
        setTimeout(async () => {
          await member.roles.remove(role).catch(() => {});
        }, 24 * 60 * 60 * 1000);
      }
    }
  }
}

module.exports = { startBirthdayChecker };