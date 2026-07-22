 const PACKAGE_VERSION = 'anchor-scalar-processes-process-pkg-r1';

 const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/scalar-processes',
  owns: [
    '4D scalar field contracts',
    'canonical scalar artifacts',
    'scalar source metadata',
    'continuous scalar sampling',
    'water-column scalar field helpers',
    'pure scalar diagnostics',
    'manufactured scalar regression fixtures',
    'depth-layer priority collapse diagnostics'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/currents'],
  doesNotOwn: ['rendering colors', 'route editing', 'vehicle physics', 'observation noise', 'score formulas', 'bathymetry generation', 'current generation', 'teaching-lab process engines']
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

const ScalarSourceMetadata = require('./ScalarSourceMetadata.js');
const ScalarFieldDiagnostics = require('./ScalarFieldDiagnostics.js');
const ScalarField4D = require('./ScalarField4D.js');
const ManufacturedScalarFieldCatalog = require('./ManufacturedScalarFieldCatalog.js');
const ScalarFieldGrid = require('./ScalarFieldGrid.js');
const VolumetricFieldSampler = require('./VolumetricFieldSampler.js');
const WaterColumnSchema = require('./WaterColumnSchema.js');
const WaterColumnFieldModel = require('./WaterColumnFieldModel.js');
const AtlasConditionedScalarBuilder = require('./generation/AtlasConditionedScalarBuilder.js');

module.exports = {PACKAGE_VERSION, PACKAGE_BOUNDARY, packageBoundarySummary,
...ScalarSourceMetadata,
...ScalarFieldDiagnostics,
...ScalarField4D,
...ManufacturedScalarFieldCatalog,
...ScalarFieldGrid,
...VolumetricFieldSampler,
...WaterColumnSchema,
...WaterColumnFieldModel,
...AtlasConditionedScalarBuilder
}