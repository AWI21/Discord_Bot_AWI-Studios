const { updateStatsChannels } = require('../systems/serverStats');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        await updateStatsChannels(member.guild);
    },
};