export const PACKAGE_VERSION = 'anchor-mission-simulator-sim-pkg-r1';
export const MISSION_SIMULATOR_AUTHORITATIVE_RUNTIME_VERSION = 'mission-simulator-authoritative-runtime-sim-pkg-r2';

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/mission-simulator',
  owns: [
    'portable mission execution contracts',
    'canonical mission input identity',
    'mission command and state contracts',
    'event and observation contracts',
    'raw outcome metrics',
    'clone-safe simulation snapshots',
    'educational glider dive state transitions',
    'agent initialization',
    'vehicle motion integration',
    'current drift integration',
    'route progress and waypoint execution',
    'science sampling event production',
    'terrain runtime diagnostics',
    'mission rule normalization',
    'terminal condition evaluation'
  ],
  dependsOn: ['@anchor/contracts', '@anchor/environment'],
  doesNotOwn: [
    'scientific environment generation',
    'route planning',
    'route editing',
    'official score aggregation',
    'DOM input',
    'camera controls',
    'scene graph rendering',
    'replay playback'
  ]
});

export function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

export * from './MissionSimulationUtil.js';
export * from './WaterColumnProfileRuntime.js';
export * from './ContinuousGliderState.js';
export * from './MissionRules.js';
export * from './EndConditions.js';
export * from './GliderDiveStateMachine.js';
export * from './MissionSimulationContracts.js';
export * from './MissionSimulationKernel.js';
export * from './SeededRng.js';
export * from './StochasticDrift.js';
export * from './RuntimeMath.js';
export * from './CurrentAwareRouteCost.js';
export * from './ShorelineRisk.js';
export * from './WaypointSemantics.js';
export * from './Agent.js';
export * from './PlanExecutor.js';
export * from './WaterColumnFieldModel.js';
export * from './DepthScoringProfiles.js';
export * from './DepthAwareScienceValue.js';
export * from './Sampling.js';
export * from './Physics.js';
export * from './TerrainSimulationDiagnostics.js';
