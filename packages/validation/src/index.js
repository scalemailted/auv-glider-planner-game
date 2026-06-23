export const PACKAGE_VERSION = 'anchor-validation-arch-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/validation',
  owns: ['scientific validation suites', 'contract compatibility checks', 'artifact sanity reports'],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry', '@anchor/currents', '@anchor/scalar-processes', '@anchor/environment', '@anchor/mission-simulator', '@anchor/codecs'],
  doesNotOwn: ['game UI assertions', 'visual screenshot ownership', 'runtime rendering loops'],
});

export function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice(),
  };
}
