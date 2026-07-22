 const PACKAGE_VERSION = 'anchor-mission-simulator-sim-pkg-r1';
 const MISSION_SIMULATOR_AUTHORITATIVE_RUNTIME_VERSION = 'mission-simulator-authoritative-runtime-sim-pkg-r2';

 const PACKAGE_BOUNDARY = Object.freeze({
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

 function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}

const MissionSimulationUtil = require('./MissionSimulationUtil.js');
const WaterColumnProfileRuntime = require('./WaterColumnProfileRuntime.js');
const ContinuousGliderState = require('./ContinuousGliderState.js');
const MissionRules = require('./MissionRules.js');
const EndConditions = require('./EndConditions.js');
const GliderDiveStateMachine = require('./GliderDiveStateMachine.js');
const MissionSimulationContracts = require('./MissionSimulationContracts.js');
const MissionSimulationKernel = require('./MissionSimulationKernel.js');
const SeededRng = require('./SeededRng.js');
const StochasticDrift = require('./StochasticDrift.js');
const RuntimeMath = require('./RuntimeMath.js');
const CurrentAwareRouteCost = require('./CurrentAwareRouteCost.js');
const ShorelineRisk = require('./ShorelineRisk.js');
const WaypointSemantics = require('./WaypointSemantics.js');
const Agent = require('./Agent.js');
const PlanExecutor = require('./PlanExecutor.js');
const WaterColumnFieldModel = require('./WaterColumnFieldModel.js');
const DepthScoringProfiles = require('./DepthScoringProfiles.js');
const DepthAwareScienceValue = require('./DepthAwareScienceValue.js');
const Sampling = require('./Sampling.js');
const Physics = require('./Physics.js');
const TerrainSimulationDiagnostics = require('./TerrainSimulationDiagnostics.js');

module.exports = {PACKAGE_VERSION, MISSION_SIMULATOR_AUTHORITATIVE_RUNTIME_VERSION, PACKAGE_BOUNDARY, packageBoundarySummary,
  ...MissionSimulationUtil,
  ...WaterColumnProfileRuntime,
  ...ContinuousGliderState,
  ...MissionRules,
  ...EndConditions,
  ...MissionSimulationContracts,
  ...MissionSimulationKernel,
  ...SeededRng,
  ...StochasticDrift,
  ...RuntimeMath,
  ...CurrentAwareRouteCost,
  ...ShorelineRisk,
  ...WaypointSemantics,
  ...Agent,
  ...PlanExecutor,
  ...WaterColumnFieldModel,
  ...DepthScoringProfiles,
  ...DepthAwareScienceValue,
  ...Sampling,
  ...Physics,
  ...TerrainSimulationDiagnostics
}