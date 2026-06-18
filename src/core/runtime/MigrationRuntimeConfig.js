export const MIGRATION_RUNTIME_CONFIG_VERSION = 'mig-r1-runtime-config';
export const MIGRATION_ARCHITECTURE_TARGET = 'threejs-first';

export function legacyPhaserMissionRendererEnabled(search = null) {
  const query = search ?? globalThis.location?.search ?? '';
  try {
    const params = new URLSearchParams(String(query).startsWith('?') ? String(query) : `?${String(query)}`);
    return params.get('legacyPhaser') === '1' || params.get('legacyPhaserRenderer') === '1';
  } catch {
    return false;
  }
}

export function preferredMissionRendererBackend({ requested = null, search = null } = {}) {
  const legacyEnabled = legacyPhaserMissionRendererEnabled(search);
  if (legacyEnabled && requested === 'legacyPhaser2d') return 'legacyPhaser2d';
  return 'threeMission3d';
}

export function buildMigrationDebug({ legacyFallbackEnabled = legacyPhaserMissionRendererEnabled(), planningBackend = 'threeMission3d', simulationBackend = 'threeMission3d', remainingPhaserSceneCount = null, remainingPhaserProductionRoutes = [] } = {}) {
  const productionMissionUsesPhaserDrawing = planningBackend !== 'threeMission3d';
  const productionSimulationUsesPhaserDrawing = simulationBackend !== 'threeMission3d';
  return {
    type: 'anchor.migration.debug',
    version: MIGRATION_RUNTIME_CONFIG_VERSION,
    architectureTarget: MIGRATION_ARCHITECTURE_TARGET,
    threePlanningDefault: true,
    threeSimulationDefault: true,
    phaserDeprecated: true,
    legacyPhaserFallbackAvailable: true,
    legacyPhaserFallbackEnabled: legacyFallbackEnabled === true,
    productionMissionUsesPhaserDrawing,
    productionSimulationUsesPhaserDrawing,
    remainingPhaserSceneCount,
    remainingPhaserProductionRoutes,
    noNewPhaserFeaturePolicy: true
  };
}

export function publishMigrationDebug(patch = {}) {
  const debug = buildMigrationDebug(patch);
  globalThis.ANCHOR_MIGRATION_DEBUG = debug;
  return debug;
}
