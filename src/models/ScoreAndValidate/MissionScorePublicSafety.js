// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionScorePublicSafety = require('./scoring/src/MissionScorePublicSafety.js');

module.exports = {...MissionScorePublicSafety}