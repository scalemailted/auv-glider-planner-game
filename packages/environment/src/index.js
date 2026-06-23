export const PACKAGE_VERSION = 'anchor-environment-arch-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/environment',
  owns: ['composed synthetic environment manifests', 'environment artifact assembly contracts'],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry', '@anchor/currents', '@anchor/scalar-processes'],
  doesNotOwn: ['player UI', 'mission execution', 'renderer state'],
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
