// Compatibility forwarding module.
// Canonical implementation lives in packages/mission-simulator.
const Physics = require('./mission-simulator/src/Physics.js');

module.exports = {...Physics}