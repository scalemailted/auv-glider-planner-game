export const CAPABILITY_MATRIX_VERSION = 'repo-clean-r2-capabilities-v1';

export const SMOKE_TEST_TITLES = Object.freeze([
  'Cold Repo Root Boot Reaches Main Menu Through Package Modules',
  'Cold Pages Subpath Boot Reaches Main Menu Through Package Modules',
  'learning labs static page is linked from the main menu',
  'Headless Bundle Viewer opens from Simulation Lab and exports browser summary',
  'deterministic challenge generates a fresh perfect-knowledge level',
  'Continuous Mission Planning Starts Without Overlay Errors',
  'Selected Waypoint Card Edits Its Incoming Segment Flight Profile',
  'Planning Timeline Updates Visible Current Vectors',
  'Execute Mission Through Three Simulation',
  'Same Horizontal Location Produces Depth-Specific Science Samples',
  'Surfacing Replan Can Change Future Segment Dive Profiles',
  'Simulation Play Pause and Step Control Current Evolution',
  'Three Debrief Opens Canonical Replay Review',
  'Three Mission Editor Opens Existing Mission Without Schema Drift',
  'Next Shell Product Hub Preserves Production Content and Styling'
]);

export const RELEASE_TEST_TITLES = Object.freeze([
  'Cold Repo Root Boot Reaches Main Menu Through Package Modules',
  'Cold Pages Subpath Boot Reaches Main Menu Through Package Modules',
  'Core Mission Tests Use the Production Readiness Contract',
  'Repeated App Boot and Teardown Leave No Runtime Processes',
  'learning labs static page is linked from the main menu',
  'Benchmark modes overview opens from Simulation Lab',
  'Headless Bundle Viewer opens from Simulation Lab and exports browser summary',
  'Planner Benchmark debrief exports benchmark records from synthetic result',
  'Continuous Mission Planning Starts Without Overlay Errors',
  'Continuous Mission Controls Are Visible and Functional',
  'Continuous Mission Plan Executes Through Canonical 3D Dive',
  'Surface Waypoints Produce a Predicted Three-Dimensional Dive',
  'Sampling Target Drives Predicted Dive Without Becoming a Navigation Point',
  'Predicted Multi-Yo Profile Executes Through Canonical Simulation',
  'Three Planning Pointer Interaction dispatches canonical workspace commands',
  'Three Waypoint Pipeline and Standard Camera Gestures',
  'challenge setup uses left navigator and selected briefing',
  'deterministic challenge generates a fresh perfect-knowledge level',
  'stochastic mode exposes ensemble and risk controls',
  'Bathymetry Package Powers Production Planning Terrain',
  'Bathymetry Package Powers Production Simulation Terrain',
  'Bathymetry Limits Predicted and Realized Dive Depth',
  'Current Package Powers Production Planning Currents',
  'Planning Timeline Updates Visible Current Vectors',
  'Current Vectors Differ Across Water Column Depths',
  'Current Vectors Change With Canonical Mission Time',
  'Same Horizontal Location Produces Depth-Specific Science Samples',
  'Selected Waypoint Card Edits Its Incoming Segment Flight Profile',
  'Right Panel Segment Profile Survives Export Import and Execute',
  'Execute Mission Through Three Simulation',
  'Simulation Play Pause and Step Control Current Evolution',
  'Three Depth-Aware Dive and Sampling',
  'Surfacing Replan Can Change Future Segment Dive Profiles',
  'Normal Production Currents Differ Across Physical Depths',
  'Normal Production Currents Evolve With Canonical Mission Time',
  'Three Debrief Opens Canonical Replay Review',
  'Three Replay Play Pause Step and Checkpoint Navigation',
  'Three Replay Rejects Tampered Checkpoint Digest',
  'Browser and Headless Replay Share Reducer Semantics',
  'Three Mission Editor Opens Existing Mission Without Schema Drift',
  'Three Mission Editor Export Reimport Roundtrip Is Lossless',
  'Three Mission Editor Preview Uses Production Mission Lifecycle',
  'Three Mission Editor Validation Blocks Invalid Export and Preview',
  'Next Shell Product Hub Preserves Production Content and Styling',
  'Next Shell Preserves Setup Briefing Planning Simulation and Debrief',
  'Next Shell Runs From GitHub Pages Subpath Without Phaser',
  'Next Shell Loads Legacy Learning Lab Only On Demand',
  'Next Shell Supports Keyboard Route and Mission Control'
]);

export const FULL_GROUP_LIMITS = Object.freeze({
  coreMission: 12,
  threePlanning: 8,
  workspaceScenario: 12,
  executionWaterColumn: 16,
  threeReplayReview: 9,
  threeMissionEditor: 9,
  productionShellR3A: 10,
  visualAcceptance: 0
});

const NODE_COVERAGE = Object.freeze({
  APP_BOOT: ['node tools/maintenance/repo_declutter.mjs verify', 'node tools/js/audit_playwright_group_coverage.mjs'],
  CHALLENGE_GENERATION: ['npm.cmd run test:science'],
  CURRENT_TIMELINE: ['node tools/js/smoke_visible_planning_timeline_current_binding.mjs'],
  DEPTH_STRUCTURED_CURRENTS: ['npm.cmd run test:science'],
  DIVE_PREDICTION: ['node tools/js/smoke_current_dive_profile_consequence.mjs'],
  SIMULATION_PHYSICS: ['node tools/js/smoke_environment_mission_coupling.mjs'],
  IMPORT_EXPORT: ['npm.cmd run test:packages'],
  RESOURCE_LIFECYCLE: ['node tools/js/audit_three_vendor_git_tracking.mjs']
});

export const CAPABILITIES = Object.freeze([
  capability('APP-BOOT', 'Application boot, root/Pages subpath, production readiness, and cleanup', true, true, false, [
    'Cold Repo Root Boot Reaches Main Menu Through Package Modules',
    'Cold Pages Subpath Boot Reaches Main Menu Through Package Modules',
    'Core Mission Tests Use the Production Readiness Contract',
    'Repeated App Boot and Teardown Leave No Runtime Processes'
  ], NODE_COVERAGE.APP_BOOT),
  capability('PRODUCT-HUB', 'Main route and mode selection', true, false, true, [
    'Next Shell Product Hub Preserves Production Content and Styling',
    'learning labs static page is linked from the main menu',
    'Benchmark modes overview opens from Simulation Lab'
  ]),
  capability('CHALLENGE-GENERATION', 'Deterministic and stochastic challenge setup', true, true, true, [
    'challenge setup uses left navigator and selected briefing',
    'deterministic challenge generates a fresh perfect-knowledge level',
    'stochastic mode exposes ensemble and risk controls'
  ], NODE_COVERAGE.CHALLENGE_GENERATION),
  capability('PLANNING-DEPLOYMENT', 'Select glider, choose deployment, and place route intent', true, false, true, [
    'Continuous Mission Controls Are Visible and Functional',
    'Three Waypoint Pipeline and Standard Camera Gestures'
  ]),
  capability('PLANNING-CONTINUOUS-WAYPOINTS', 'Free placement and canonical route mutation', true, false, true, [
    'Continuous Mission Planning Starts Without Overlay Errors',
    'Three Planning Pointer Interaction dispatches canonical workspace commands',
    'Three Waypoint Pipeline and Standard Camera Gestures'
  ]),
  capability('SEGMENT-FLIGHT-PROFILE', 'Right-panel incoming-segment editing and launch parity', true, true, true, [
    'Selected Waypoint Card Edits Its Incoming Segment Flight Profile',
    'Right Panel Segment Profile Survives Export Import and Execute'
  ]),
  capability('CURRENT-TIMELINE', 'Visible current timeline controls and time-unit bridge', true, true, true, [
    'Planning Timeline Updates Visible Current Vectors',
    'Current Vectors Change With Canonical Mission Time',
    'Normal Production Currents Evolve With Canonical Mission Time'
  ], NODE_COVERAGE.CURRENT_TIMELINE),
  capability('DEPTH-STRUCTURED-CURRENTS', 'Physical depth distinction and canonical/render current parity', true, false, true, [
    'Current Vectors Differ Across Water Column Depths',
    'Normal Production Currents Differ Across Physical Depths'
  ], NODE_COVERAGE.DEPTH_STRUCTURED_CURRENTS),
  capability('DIVE-PREDICTION', 'Planned dive, sampling target, and clearance', true, false, true, [
    'Surface Waypoints Produce a Predicted Three-Dimensional Dive',
    'Sampling Target Drives Predicted Dive Without Becoming a Navigation Point',
    'Predicted Multi-Yo Profile Executes Through Canonical Simulation'
  ], NODE_COVERAGE.DIVE_PREDICTION),
  capability('EXECUTE', 'Launch snapshot and simulation initialization', true, true, true, [
    'Execute Mission Through Three Simulation',
    'Continuous Mission Plan Executes Through Canonical 3D Dive'
  ]),
  capability('SIMULATION-CONTROLS', 'Play, pause, step, and finish controls', true, true, true, [
    'Simulation Play Pause and Step Control Current Evolution',
    'Three Depth-Aware Dive and Sampling'
  ]),
  capability('SIMULATION-PHYSICS', 'Dive execution, current drift, and depth-aware sampling', true, false, true, [
    'Same Horizontal Location Produces Depth-Specific Science Samples',
    'Three Depth-Aware Dive and Sampling',
    'Simulation Play Pause and Step Control Current Evolution'
  ], NODE_COVERAGE.SIMULATION_PHYSICS),
  capability('SURFACING-REPLAN', 'Surfacing decision modal and replan/resume flow', true, true, true, [
    'Surfacing Replan Can Change Future Segment Dive Profiles'
  ]),
  capability('DEBRIEF', 'Score/result and terrain/depth summary', true, true, true, [
    'Three Debrief Opens Canonical Replay Review',
    'Next Shell Preserves Setup Briefing Planning Simulation and Debrief'
  ]),
  capability('REPLAY', 'Replay integrity, playback, and review', true, true, true, [
    'Three Debrief Opens Canonical Replay Review',
    'Three Replay Play Pause Step and Checkpoint Navigation',
    'Three Replay Rejects Tampered Checkpoint Digest',
    'Browser and Headless Replay Share Reducer Semantics'
  ]),
  capability('MISSION-EDITOR', 'Mission editor edit, validate, preview, export, and import', true, true, true, [
    'Three Mission Editor Opens Existing Mission Without Schema Drift',
    'Three Mission Editor Export Reimport Roundtrip Is Lossless',
    'Three Mission Editor Preview Uses Production Mission Lifecycle',
    'Three Mission Editor Validation Blocks Invalid Export and Preview'
  ]),
  capability('IMPORT-EXPORT', 'Mission, plan, result, solver, and headless bundle import/export', true, true, true, [
    'Headless Bundle Viewer opens from Simulation Lab and exports browser summary',
    'Right Panel Segment Profile Survives Export Import and Execute',
    'Three Mission Editor Export Reimport Roundtrip Is Lossless'
  ], NODE_COVERAGE.IMPORT_EXPORT),
  capability('BENCHMARK', 'At least one production benchmark workflow', true, false, true, [
    'Planner Benchmark debrief exports benchmark records from synthetic result',
    'Benchmark modes overview opens from Simulation Lab'
  ]),
  capability('LEARNING-LAB', 'At least one active lab route', true, true, true, [
    'learning labs static page is linked from the main menu',
    'Next Shell Loads Legacy Learning Lab Only On Demand'
  ]),
  capability('RESOURCE-LIFECYCLE', 'One renderer, one RAF, and cleanup invariants', true, false, true, [
    'Repeated App Boot and Teardown Leave No Runtime Processes',
    'Three Replay Resources Dispose Across Scene Transitions',
    'Next Shell Route Transitions Dispose Previous View'
  ], NODE_COVERAGE.RESOURCE_LIFECYCLE),
  capability('ACCESSIBILITY', 'Keyboard/focus/labels for critical workflow', true, false, true, [
    'Next Shell Supports Keyboard Route and Mission Control',
    'Compact Viewport Keeps Selected Segment Editor Usable'
  ])
]);

export const CAPABILITY_BY_ID = Object.freeze(Object.fromEntries(CAPABILITIES.map((item) => [item.id, item])));

export function exactTitlePattern(title) {
  return new RegExp(`^${escapeRegExp(title)}$`, 'i');
}

export function exactTitlePatterns(titles) {
  return titles.map((title) => exactTitlePattern(title));
}

export function capabilityCoverageSummary(allTitles = [], options = {}) {
  const titleSet = new Set(allTitles);
  const releaseSet = new Set(options.releaseTitles ?? RELEASE_TEST_TITLES);
  const smokeSet = new Set(options.smokeTitles ?? SMOKE_TEST_TITLES);
  const rows = CAPABILITIES.map((capability) => {
    const browserCoverage = capability.browserCoverage.filter((title) => titleSet.has(title));
    const releaseBrowserCoverage = browserCoverage.filter((title) => releaseSet.has(title));
    const smokeBrowserCoverage = browserCoverage.filter((title) => smokeSet.has(title));
    const nodeCoverage = capability.nodeCoverage ?? [];
    const missing = [];
    if (capability.supported && browserCoverage.length === 0 && nodeCoverage.length === 0) missing.push('no coverage');
    if (capability.releaseCritical && releaseBrowserCoverage.length === 0 && nodeCoverage.length === 0) missing.push('no release evidence');
    if (capability.smokeCritical && smokeBrowserCoverage.length === 0) missing.push('no smoke browser evidence');
    return {
      id: capability.id,
      label: capability.label,
      releaseCritical: capability.releaseCritical,
      smokeCritical: capability.smokeCritical,
      browserRequired: capability.browserRequired,
      browserCoverage,
      releaseBrowserCoverage,
      smokeBrowserCoverage,
      nodeCoverage,
      valid: missing.length === 0,
      missing
    };
  });
  return {
    version: CAPABILITY_MATRIX_VERSION,
    total: rows.length,
    rows,
    missing: rows.filter((row) => !row.valid),
    valid: rows.every((row) => row.valid)
  };
}

function capability(id, label, releaseCritical, smokeCritical, browserRequired, browserCoverage, nodeCoverage = [], extendedCoverage = [], replacementFor = []) {
  return Object.freeze({
    id,
    label,
    supported: true,
    releaseCritical,
    smokeCritical,
    browserRequired,
    nodeCoverage,
    browserCoverage,
    extendedCoverage,
    replacementFor
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
