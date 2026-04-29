require('dotenv').config();
const { startBot } = require('./src/bot');
const { startWebServer } = require('./src/web/server');

startWebServer();
startBot();
