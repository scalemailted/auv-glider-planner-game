// Compatibility forwarding module.
// Canonical implementation lives in packages/environment.

const environmentGeneratorBackendContract = require('./environment/src/EnvironmentGeneratorBackendContract.js');

module.exports = {...environmentGeneratorBackendContract}