export const PACKAGE_VERSION = 'anchor-mission-simulator-arch-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/mission-simulator',
  owns: ['portable mission execution contracts', 'observation and episode result contracts'],
  dependsOn: ['@anchor/contracts', '@anchor/environment'],
  doesNotOwn: ['DOM input', 'camera controls', 'scene graph rendering'],
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
