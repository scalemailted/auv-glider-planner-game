// Compatibility forwarding module.
// Canonical implementation lives in packages/currents.
// Coordinate frame preserved: localEastNorthDown. Time unit: seconds.
const OceanCurrentField4D = require('./currents/src/OceanCurrentField4D.js');

module.exports = {...OceanCurrentField4D}