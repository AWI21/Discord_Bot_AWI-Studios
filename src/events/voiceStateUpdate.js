const { handleVoiceStateUpdate } = require('../systems/voiceTemp');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        await handleVoiceStateUpdate(oldState, newState);
    },
};