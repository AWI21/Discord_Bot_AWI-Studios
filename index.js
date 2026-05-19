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

// Add this to the very bottom of your index.js file
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Powering down old instance...');
    client.destroy();
    process.exit(0);
});

init();