require('dotenv').config();
const { startBot } = require('./src/bot');
const { startWebServer } = require('./src/web/server');

async function init() {
    try {
        console.log("🐺 Starting Wolfy Bot...");

        // Start the web server first
        await startWebServer();

        // Now start the bot (this is where the DB call is failing)
        await startBot();

    } catch (error) {
        console.error("❌ Failed to start:", error);
    }
}

init();