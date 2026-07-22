// Compatibility forwarding module.
// Canonical implementation lives in packages/scoring.

const MissionOutcomeMetricAdapter = require('./scoring/src/MissionOutcomeMetricAdapter.js');

module.exports = {...MissionOutcomeMetricAdapter}