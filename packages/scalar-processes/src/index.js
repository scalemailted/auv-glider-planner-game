export const PACKAGE_VERSION = 'anchor-scalar-processes-arch-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/scalar-processes',
  owns: ['scalar process manifests', 'volumetric scalar fields', 'forecast and belief field contracts'],
  dependsOn: ['@anchor/contracts', '@anchor/currents'],
  doesNotOwn: ['rendering colors', 'route editing', 'score formulas'],
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
