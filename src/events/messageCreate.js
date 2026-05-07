const { getConfig, getCustomCommand, getCommandChannels } = require('../database/db');
const { handleXP } = require('../systems/leveling');
const { handleAutomod } = require('../systems/automod');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    await handleAutomod(message, client);
    await handleXP(message, client);

    const prefix = await getConfig(message.guild.id, 'prefix') || process.env.DEFAULT_PREFIX || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (command) {
      // Command channel restriction (built-in commands only)
      const allowedChannels = await getCommandChannels(message.guild.id);
      if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) {
        const modRoleId = await getConfig(message.guild.id, 'mod_role');
        const isMod = modRoleId ? message.member.roles.cache.has(modRoleId) : message.member.permissions.has(0x8n);
        if (!isMod) {
          const msg = await message.reply({ content: `⚠️ Commands can only be used in: ${allowedChannels.map(id => `<#${id}>`).join(', ')}`, allowedMentions: { repliedUser: false } });
          setTimeout(() => { message.delete().catch(() => {}); msg.delete().catch(() => {}); }, 5000);
          return;
        }
      }

      // Mod-only check
      if (command.modOnly) {
        const modRoleId = await getConfig(message.guild.id, 'mod_role');
        const isMod = modRoleId ? message.member.roles.cache.has(modRoleId) : message.member.permissions.has(0x8n);
        if (!isMod) return message.reply({ content: '❌ You need the **Moderator** role to use this command.', allowedMentions: { repliedUser: false } });
      }

      // Cooldown
      if (!client.cooldowns.has(commandName)) client.cooldowns.set(commandName, new Map());
      const timestamps = client.cooldowns.get(commandName);
      const cooldown = (command.cooldown || 3) * 1000;
      if (timestamps.has(message.author.id)) {
        const expiry = timestamps.get(message.author.id) + cooldown;
        if (Date.now() < expiry) {
          const remaining = ((expiry - Date.now()) / 1000).toFixed(1);
          return message.reply({ content: `⏳ Wait **${remaining}s** before using that again.`, allowedMentions: { repliedUser: false } });
        }
      }
      timestamps.set(message.author.id, Date.now());
      setTimeout(() => timestamps.delete(message.author.id), cooldown);

      try {
        await command.execute(message, args, client, prefix);
      } catch (err) {
        console.error(err);
        message.reply({ content: '❌ An error occurred.', allowedMentions: { repliedUser: false } });
      }
      return;
    }

    // Custom commands — always allowed in any channel
    const custom = await getCustomCommand(message.guild.id, commandName);
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
