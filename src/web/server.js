const express = require('express');
const chalk = require('chalk');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: 'Wolfy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ping', (req, res) => res.send('Pong! 🐺'));

app.get('/health', (req, res) => {
  res.json({ healthy: true, memory: process.memoryUsage() });
});

function startWebServer() {
  app.listen(PORT, () => {
    console.log(chalk.yellow(`🌐 Web server running on port ${PORT}`));
    console.log(chalk.gray(`   → Add this URL to UptimeRobot to keep the bot alive 24/7`));
  });
}

module.exports = { startWebServer };
