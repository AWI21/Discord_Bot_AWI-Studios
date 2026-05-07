require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');

for (const category of fs.readdirSync(commandsPath)) {
  const categoryPath = path.join(commandsPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;
  for (const file of fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(categoryPath, file));
    if (cmd.slashData) commands.push(cmd.slashData.toJSON());
  }
}

const rest = new REST().setToken(process.env.BOT_TOKEN);

(async () => {
  console.log(`🔄 Registering ${commands.length} slash commands...`);
  try {
    if (process.env.GUILD_ID) {
      // Guild = instant (use for testing)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`✅ Registered ${commands.length} guild slash commands (instant)`);
    } else {
      // Global = up to 1 hour propagation
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ Registered ${commands.length} global slash commands`);
    }
  } catch (err) {
    console.error(err);
  }
})();
