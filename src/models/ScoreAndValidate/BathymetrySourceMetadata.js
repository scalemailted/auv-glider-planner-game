// Compatibility forwarding module.
// Canonical implementation lives in packages/bathymetry.
 const BathymetrySourceMetadata = require('./bathymetry/src/BathymetrySourceMetadata.js');
module.exports = {...BathymetrySourceMetadata}