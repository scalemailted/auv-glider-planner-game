// Compatibility forwarding module.
// Canonical implementation lives in packages/scalar-processes.
const VolumetricFieldSampler = require('./scalar-processes/src/VolumetricFieldSampler.js');

module.exports = {...VolumetricFieldSampler}