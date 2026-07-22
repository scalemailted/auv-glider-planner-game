// Compatibility forwarding module.
// Canonical implementation lives in packages/mission-simulator.
const Agent =  require('./mission-simulator/src/Agent.js');

module.exports = {...Agent}