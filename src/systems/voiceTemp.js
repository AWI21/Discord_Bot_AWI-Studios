const tempChannels = new Set();

function addTempChannel(id) { tempChannels.add(id); }
function removeTempChannel(id) { tempChannels.delete(id); }
function isTempChannel(id) { return tempChannels.has(id); }

module.exports = { addTempChannel, removeTempChannel, isTempChannel };