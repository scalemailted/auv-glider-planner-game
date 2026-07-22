// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionScoreProfiles = require('./scoring/src/MissionScoreProfiles.js');

module.exports = {...MissionScoreProfiles}