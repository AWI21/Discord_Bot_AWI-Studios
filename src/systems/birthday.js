const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { getTodayBirthdays, getConfig } = require('../database/db');

function startBirthdayChecker(client) {
  // Run every day at midnight UTC
  cron.schedule('0 0 * * *', () => checkBirthdays(client));
  // Also run on startup to catch any missed
  checkBirthdays(client);
  console.log('🎂 Birthday checker started');
}

async function checkBirthdays(client) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const birthdays = getTodayBirthdays(month, day);
  if (!birthdays.length) return;

  for (const bday of birthdays) {
    const guild = client.guilds.cache.get(bday.guild_id);
    if (!guild) continue;

    const channelId = getConfig(bday.guild_id, 'birthday_channel');
    if (!channelId) continue;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) continue;

    let member;
    try {
      member = await guild.members.fetch(bday.user_id);
    } catch { continue; }

    // ── Send birthday embed ─────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0xf472b6)
      .setTitle('🎂 Happy Birthday!')
      .setDescription(`It's ${member}'s birthday today! Wish them well! 🥳🎉`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `From everyone in ${guild.name}` })
      .setTimestamp();

    await channel.send({ content: `🎂 @everyone`, embeds: [embed] }).catch(() => {});

    // ── Birthday role (24h) ────────────────────────────────────────────────────
    const birthdayRoleId = getConfig(bday.guild_id, 'birthday_role');
    if (birthdayRoleId) {
      const role = guild.roles.cache.get(birthdayRoleId);
      if (role) {
        await member.roles.add(role).catch(() => {});
        // Remove after 24 hours
        setTimeout(async () => {
          await member.roles.remove(role).catch(() => {});
        }, 24 * 60 * 60 * 1000);
      }
    }
  }
}

module.exports = { startBirthdayChecker };
