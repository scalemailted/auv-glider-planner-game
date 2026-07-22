// Compatibility forwarding module.
// Canonical implementation lives in packages/currents.
const OceanCurrentFieldSampler = require('./currents/src/OceanCurrentFieldSampler.js');

module.exports = {...OceanCurrentFieldSampler}