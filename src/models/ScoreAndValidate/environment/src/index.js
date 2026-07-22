 const PACKAGE_VERSION = 'anchor-environment-env-pkg-r1';

 const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/environment',
  owns: [
    'canonical environment manifests',
    'environment artifact composition',
    'environment identity and digests',
    'field registry and epistemic role metadata',
    'cross-artifact validation',
    'provenance aggregation',
    'unified physical-coordinate sampling'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry', '@anchor/currents', '@anchor/scalar-processes'],
  doesNotOwn: [
    'scientific generation equations',
    'truth/forecast visibility policy',
    'observation noise',
    'belief updates',
    'mission execution',
    'scoring',
    'renderer state',
    'player UI'
  ]
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

const EnvironmentUtil = require('./EnvironmentUtil.js');
const EnvironmentGeneratorBackendContract = require('./EnvironmentGeneratorBackendContract.js');
const EnvironmentManifest = require('./EnvironmentManifest.js');
const EnvironmentFieldRegistry = require('./EnvironmentFieldRegistry.js');
const EnvironmentArtifact = require('./EnvironmentArtifact.js');
const EnvironmentValidation = require('./EnvironmentValidation.js');
const EnvironmentSampler = require('./EnvironmentSampler.js');

module.exports = {PACKAGE_VERSION, PACKAGE_BOUNDARY, packageBoundarySummary,
...EnvironmentUtil,
...EnvironmentGeneratorBackendContract,
...EnvironmentManifest,
...EnvironmentFieldRegistry,
...EnvironmentArtifact,
...EnvironmentValidation,
...EnvironmentSampler
}