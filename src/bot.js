const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initDatabase } = require('./database/db');
const { startBirthdayChecker } = require('./systems/birthday');
const { startNotificationPoller } = require('./systems/notifications');
const chalk = require('chalk');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.xpCooldowns = new Collection();

async function startBot() {
  console.log(chalk.cyan('\n🐺 Starting Wolfy Bot...\n'));

  initDatabase();
  await loadCommands(client);
  loadEvents(client);

  client.once('ready', () => {
    startBirthdayChecker(client);
    startNotificationPoller(client);
  });

  await client.login(process.env.BOT_TOKEN);
}

module.exports = { startBot, client };
