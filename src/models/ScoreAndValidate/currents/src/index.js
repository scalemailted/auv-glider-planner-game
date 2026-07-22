 const PACKAGE_VERSION = 'anchor-currents-flow-pkg-r1';

 const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/currents',
  owns: [
    '4D current field contracts',
    'canonical current artifacts',
    'current source metadata',
    'current temporal boundary resolution',
    'current sampling',
    'pure current diagnostics',
    'deterministic synthetic current generation backends',
    'declared vertical current profile contracts'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry'],
  doesNotOwn: ['external ocean data import', 'rendering glyph density', 'mission scoring', 'browser controls', 'Three.js presentation']
});

 function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

const CurrentFieldManifest = require('./CurrentFieldManifest.js');
const OceanCurrentField4D = require('./OceanCurrentField4D.js');
const OceanCurrentFieldSampler = require('./OceanCurrentFieldSampler.js');
const OceanCurrentSourceMetadata = require('./OceanCurrentSourceMetadata.js');
const CurrentFieldScientificDiagnostics = require('./CurrentFieldScientificDiagnostics.js');
const CurrentTerrainBoundaryCondition = require('./CurrentTerrainBoundaryCondition.js');
const ManufacturedCurrentFieldCatalog = require('./ManufacturedCurrentFieldCatalog.js');
const BathymetryConditionedCurrentBuilder = require('./generation/BathymetryConditionedCurrentBuilder.js');
const AtlasConditionedCurrentBuilder = require('./generation/AtlasConditionedCurrentBuilder.js');
const CurrentVerticalProfileContract = require('./generation/CurrentVerticalProfileContract.js');

module.exports = {PACKAGE_VERSION, PACKAGE_BOUNDARY, packageBoundarySummary,
...CurrentFieldManifest,
...OceanCurrentField4D,
...OceanCurrentFieldSampler,
...OceanCurrentSourceMetadata,
...CurrentFieldScientificDiagnostics,
...CurrentTerrainBoundaryCondition,
...ManufacturedCurrentFieldCatalog,
...BathymetryConditionedCurrentBuilder,
...AtlasConditionedCurrentBuilder,
...CurrentVerticalProfileContract
}