const { EmbedBuilder } = require('discord.js');
const { getConfig, getCustomCommand } = require('../database/db');
const { handleXP } = require('../systems/leveling');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ── XP System ───────────────────────────────────────────────────────────────
    await handleXP(message, client);

    // ── Determine prefix ────────────────────────────────────────────────────────
    const prefix = getConfig(message.guild.id, 'prefix') || process.env.DEFAULT_PREFIX || '!';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // ── Built-in commands ────────────────────────────────────────────────────────
    const command = client.commands.get(commandName);
    if (command) {
      // Cooldown check
      if (!client.cooldowns.has(commandName)) client.cooldowns.set(commandName, new Map());
      const timestamps = client.cooldowns.get(commandName);
      const cooldown = (command.cooldown || 3) * 1000;
      if (timestamps.has(message.author.id)) {
        const expiry = timestamps.get(message.author.id) + cooldown;
        if (Date.now() < expiry) {
          const remaining = ((expiry - Date.now()) / 1000).toFixed(1);
          return message.reply({ content: `⏳ Wait **${remaining}s** before using \`${prefix}${commandName}\` again.`, allowedMentions: { repliedUser: false } });
        }
      }
      timestamps.set(message.author.id, Date.now());
      setTimeout(() => timestamps.delete(message.author.id), cooldown);

      try {
        await command.execute(message, args, client, prefix);
      } catch (err) {
        console.error(err);
        message.reply({ content: '❌ An error occurred executing that command.', allowedMentions: { repliedUser: false } });
      }
      return;
    }

    // ── Custom commands fallback ─────────────────────────────────────────────────
    const custom = getCustomCommand(message.guild.id, commandName);
    if (custom) {
      const response = custom.response
        .replace('{user}', `<@${message.author.id}>`)
        .replace('{username}', message.author.username)
        .replace('{server}', message.guild.name)
        .replace('{membercount}', message.guild.memberCount);
      await message.channel.send(response);
    }
  },
};
