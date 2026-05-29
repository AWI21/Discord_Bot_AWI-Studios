const { getConfig, getCustomCommand, getCommandChannels } = require('../database/db');
const { handleXP } = require('../systems/leveling');
const { handleAutomod } = require('../systems/automod');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ⚡ OPTIMIZATION: Do NOT 'await' these.
    // Let them run in the background while we check for the command.
    handleAutomod(message, client).catch(err => console.error("Automod Error:", err));
    handleXP(message, client).catch(err => console.error("XP Error:", err));

    // ⚡ OPTIMIZATION: Check prefix (Ideally this would be cached, but let's start here)
    const prefix = await getConfig(message.guild.id, 'prefix') || process.env.DEFAULT_PREFIX || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (command) {
      // ⚡ OPTIMIZATION: Run these checks in parallel (Promise.all)
      const [allowedChannels, modRoleId] = await Promise.all([
        getCommandChannels(message.guild.id),
        getConfig(message.guild.id, 'mod_role')
      ]);

      if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) {
        const isMod = message.member.roles.cache.has(modRoleId) || message.member.permissions.has(8n);
        if (!isMod) {
          const msg = await message.reply({ content: `⚠️ Commands can only be used in: ${allowedChannels.map(id => `<#${id}>`).join(', ')}`, allowedMentions: { repliedUser: false } });
          setTimeout(() => { message.delete().catch(() => {}); msg.delete().catch(() => {}); }, 5000);
          return;
        }
      }

      if (command.modOnly) {
        const isMod = message.member.roles.cache.has(modRoleId) || message.member.permissions.has(8n);
        if (!isMod) return message.reply({ content: '❌ You need the **Moderator** role to use this command.', allowedMentions: { repliedUser: false } });
      }

      // ... (Cooldown logic stays the same) ...
      if (!client.cooldowns.has(commandName)) client.cooldowns.set(commandName, new Map());
      const timestamps = client.cooldowns.get(commandName);
      const cooldown = (command.cooldown || 3) * 1000;
      if (timestamps.has(message.author.id)) {
        const expiry = timestamps.get(message.author.id) + cooldown;
        if (Date.now() < expiry) return; // Silent return for speed
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

    // 🔥 UPGRADED: Custom commands dynamic placeholders logic
    const custom = await getCustomCommand(message.guild.id, commandName);
    if (custom) {
      const savedResponse = custom.response;

      // 1. Grab the first mentioned user in the command execution string
      const target = message.mentions.users.first();

      // 2. Safety Check: If the command requires a target, but no one was tagged
      if (savedResponse.includes('{target}') && !target) {
        return message.reply({
          content: `⚠️ This command requires you to tag a user! Example: \`!${commandName} @user\``,
          allowedMentions: { repliedUser: false }
        }).catch(() => {});
      }

      // 3. Replace all instances of your variables globally
      const finalResponse = savedResponse
          .replace(/{author}/g, message.author.toString())
          .replace(/{user}/g, message.author.toString()) // Backward compatibility for old cmds
          .replace(/{target}/g, target ? target.toString() : '');

      // 4. Fire it off to the channel
      await message.channel.send(finalResponse).catch(() => {});
    }
  }
};