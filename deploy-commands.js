require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 1. Setup paths
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

// 2. Read folders and files
console.log('🔍 Scanning for commands in:', commandsPath);

if (!fs.existsSync(commandsPath)) {
  console.error('❌ Error: src/commands folder not found!');
  process.exit(1);
}

for (const category of fs.readdirSync(commandsPath)) {
  const categoryPath = path.join(commandsPath, category);

  // Make sure it's a folder (moderation, utility, etc.)
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(categoryPath, file);
    const cmd = require(filePath);

    // Check if the command has 'slashData'
    if (cmd.slashData) {
      console.log(`  -> Found Slash Command: ${cmd.name || file}`);
      commands.push(cmd.slashData.toJSON());
    } else {
      console.log(`  -> Skipping: ${file} (No slashData found)`);
    }
  }
}

// 3. Setup REST
// Use DISCORD_TOKEN as that's what you mentioned earlier
const token = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Missing credentials! Ensure DISCORD_TOKEN and CLIENT_ID are in your .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

// 4. Register with Discord
(async () => {
  console.log(`\n🔄 Registering ${commands.length} slash commands...`);
  try {
    if (process.env.GUILD_ID) {
      // Guild deployment (Immediate - best for testing)
      await rest.put(
          Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
          { body: commands },
      );
      console.log(`✅ Successfully registered ${commands.length} GUILD slash commands.`);
    } else {
      // Global deployment (Can take up to an hour to show up)
      await rest.put(
          Routes.applicationCommands(clientId),
          { body: commands },
      );
      console.log(`✅ Successfully registered ${commands.length} GLOBAL slash commands.`);
    }
  } catch (err) {
    console.error('❌ Discord API Error:');
    console.error(err);
  }
})();