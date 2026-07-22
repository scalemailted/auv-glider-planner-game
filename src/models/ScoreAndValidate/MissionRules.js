// Compatibility forwarding module.
// Canonical implementation lives in packages/mission-simulator.
const MissionRules = require('./mission-simulator/src/MissionRules.js');

module.exports = {...MissionRules}