const { updateStatsChannels } = require('../systems/serverStats');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        await updateStatsChannels(member.guild);
    },
};