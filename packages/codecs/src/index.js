export const PACKAGE_VERSION = 'anchor-codecs-arch-r1';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/codecs',
  owns: ['artifact serialization contracts', 'bundle import/export compatibility', 'visibility-safe codec boundaries'],
  dependsOn: ['@anchor/contracts'],
  doesNotOwn: ['scientific generation', 'mission scoring', 'renderer presentation'],
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
