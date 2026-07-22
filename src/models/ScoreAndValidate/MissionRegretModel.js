// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionRegretModel = require('./scoring/src/MissionRegretModel.js');

module.exports = {...MissionRegretModel}