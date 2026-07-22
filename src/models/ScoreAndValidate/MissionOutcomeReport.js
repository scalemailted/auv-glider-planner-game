// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionOutcomeReport = require('./scoring/src/MissionOutcomeReport.js');

module.exports = {...MissionOutcomeReport}