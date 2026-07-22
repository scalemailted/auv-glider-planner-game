// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionScoreNormalizer = require('./scoring/src/MissionScoreNormalizer.js');

module.exports = {...MissionScoreNormalizer}