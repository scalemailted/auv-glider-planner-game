export const PACKAGE_VERSION = 'anchor-currents-arch-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/currents',
  owns: ['4D current field contracts', 'current diagnostics contracts', 'field sampling boundaries'],
  dependsOn: ['@anchor/contracts', '@anchor/bathymetry'],
  doesNotOwn: ['rendering glyph density', 'mission scoring', 'browser controls'],
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
