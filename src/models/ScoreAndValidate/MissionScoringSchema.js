// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionScoringSchema = require('./scoring/src/MissionScoringSchema.js');

module.exports = {...MissionScoringSchema}