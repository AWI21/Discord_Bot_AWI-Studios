require('dotenv').config();
require('./deploy-commands.js');
const { startBot } = require('./src/bot');
const { startWebServer } = require('./src/web/server');
const registerAdvancedLogs = require('src/utils/advancedLogs.js');

let client = null;

async function init() {
    try {
        console.log("Starting AWI Bot...");

        await startWebServer();

        client = await startBot();
        registerAdvancedLogs(client);

    } catch (error) {
        console.error("❌ Failed to start:", error);
    }
}

const handleShutdown = async (signal) => {
    console.log(`Received ${signal}. Powering down instance...`);
    if (client) {
        try {
            await client.destroy();
        } catch (err) {
            console.error('Error destroying client:', err);
        }
    }
    process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

init();