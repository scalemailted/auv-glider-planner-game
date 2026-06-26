export const CAPABILITY_MATRIX_VERSION = 'repo-clean-r3-capabilities-v1';

export const SMOKE_TEST_TITLES = Object.freeze([
  'Cold Repo Root Boot Reaches Main Menu Through Package Modules',
  'Cold Pages Subpath Boot Reaches Main Menu Through Package Modules',
  'learning labs static page is linked from the main menu',
  'Headless Bundle Viewer opens from Simulation Lab and exports browser summary',
  'deterministic challenge generates a fresh perfect-knowledge level',
  'Continuous Mission Planning Starts Without Overlay Errors',
  'Selected Waypoint Card Edits Its Incoming Segment Flight Profile',
  'Planning Timeline Updates Visible Current Vectors',
  'Environment Package Powers Generated Planning World',
  'Execute Mission Through Three Simulation',
  'Same Horizontal Location Produces Depth-Specific Science Samples',
  'Surfacing Replan Can Change Future Segment Dive Profiles',
  'Simulation Play Pause and Step Control Current Evolution',
  'Three Debrief Opens Canonical Replay Review',
  'Three Mission Editor Opens Existing Mission Without Schema Drift',
  'Alpha Pages and Compact Layout',
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
  'Environment Package Powers Generated Planning World',
  'Browser Simulation Uses Package Kernel as Sole Authority',
  'Package Kernel Preserves Play Pause Step Finish and Reset',
  'Browser Headless and Pages Share the Authoritative Kernel',
  'Surfacing Replan Resumes the Same Package Simulation',
  'Planning Execute Simulation Preserve One Environment Identity',
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
  'Next Shell Supports Keyboard Route and Mission Control',
  'Alpha First-Run Guided Mission',
  'Alpha Researcher Quick Start',
  'Alpha Feedback Diagnostics and Error Recovery',
  'Alpha Pages and Compact Layout',
  'Alpha Browser Compatibility Critical Path'
]);

export const FULL_GROUP_LIMITS = Object.freeze({
  coreMission: 12,
  threePlanning: 8,
  workspaceScenario: 12,
  executionWaterColumn: 20,
  threeReplayReview: 9,
  threeMissionEditor: 9,
  productionShellR3A: 10,
  visualAcceptance: 0
});

export const SMOKE_SPEC_SPLIT_FILES = Object.freeze([
  "tests/e2e/product_hub_and_labs.spec.js",
  "tests/e2e/mission_planning.spec.js",
  "tests/e2e/environment_rendering.spec.js",
  "tests/e2e/env_pkg_r1_environment_package.spec.js",
  "tests/e2e/codec_r1_artifact_codecs.spec.js",
  "tests/e2e/colab_classical_benchmark.spec.js",
  "tests/e2e/alpha_r1_external_preview.spec.js",
  "tests/e2e/alpha_r1_1_acceptance.spec.js",
  "tests/e2e/environment_studio_r1.spec.js",
  "tests/e2e/workspace_and_challenge_setup.spec.js",
  "tests/e2e/simulation_and_terrain.spec.js",
  "tests/e2e/scientific_validation_methods.spec.js"
]);

export const TEST_FILE_OWNERSHIP = Object.freeze({
  "learning labs static page is linked from the main menu": "tests/e2e/product_hub_and_labs.spec.js",
  "Benchmark modes overview opens from Simulation Lab": "tests/e2e/product_hub_and_labs.spec.js",
  "Motion Planning Demo opens from Simulation Lab and preserves benchmark/headless routes": "tests/e2e/product_hub_and_labs.spec.js",
  "Bathymetric World View opens from Simulation Lab and preserves adjacent routes": "tests/e2e/product_hub_and_labs.spec.js",
  "Renderer Architecture Preview opens from Simulation Lab": "tests/e2e/product_hub_and_labs.spec.js",
  "Headless Bundle Viewer opens from Simulation Lab and exports browser summary": "tests/e2e/product_hub_and_labs.spec.js",
  "Planner Benchmark debrief exports benchmark records from synthetic result": "tests/e2e/product_hub_and_labs.spec.js",
  "Codec Package Runs From GitHub Pages Subpath": "tests/e2e/codec_r1_artifact_codecs.spec.js",
  "Adaptive Benchmark synthetic debrief shows surfacing review and exports P8 session records": "tests/e2e/product_hub_and_labs.spec.js",
  "campaign planning smoke flow reaches debrief": "tests/e2e/product_hub_and_labs.spec.js",
  "Continuous Mission Planning Starts Without Overlay Errors": "tests/e2e/mission_planning.spec.js",
  "Continuous Mission Controls Are Visible and Functional": "tests/e2e/mission_planning.spec.js",
  "Continuous Mission Plan Executes Through Canonical 3D Dive": "tests/e2e/mission_planning.spec.js",
  "Surface Waypoints Produce a Predicted Three-Dimensional Dive": "tests/e2e/mission_planning.spec.js",
  "Three Camera Reveals Full Water-Column Dive": "tests/e2e/mission_planning.spec.js",
  "Surface Waypoints and Sampling Targets Have Distinct Semantics": "tests/e2e/mission_planning.spec.js",
  "Sampling Target Drives Predicted Dive Without Becoming a Navigation Point": "tests/e2e/mission_planning.spec.js",
  "Predicted Multi-Yo Profile Executes Through Canonical Simulation": "tests/e2e/mission_planning.spec.js",
  "Three Camera Interaction Does Not Rebuild Mission Models": "tests/e2e/mission_planning.spec.js",
  "Three Mission Renderer Resources Remain Stable": "tests/e2e/mission_planning.spec.js",
  "Three Mission Interaction Performance Invariants": "tests/e2e/mission_planning.spec.js",
  "Three Sampling Target and Dive Planning Headed Workflow": "tests/e2e/mission_planning.spec.js",
  "Environment Package Powers Generated Planning World": "tests/e2e/env_pkg_r1_environment_package.spec.js",
  "Planning Execute Simulation Preserve One Environment Identity": "tests/e2e/env_pkg_r1_environment_package.spec.js",
  "Browser and Headless Share Environment Artifact Samples": "tests/e2e/env_pkg_r1_environment_package.spec.js",
  "Environment Package Runs From GitHub Pages Subpath": "tests/e2e/env_pkg_r1_environment_package.spec.js",
  "Browser Simulation Uses Package Kernel as Sole Authority": "tests/e2e/sim_pkg_r1_mission_simulator_package.spec.js",
  "Package Kernel Preserves Play Pause Step Finish and Reset": "tests/e2e/sim_pkg_r1_mission_simulator_package.spec.js",
  "Browser Headless and Pages Share the Authoritative Kernel": "tests/e2e/sim_pkg_r1_mission_simulator_package.spec.js",
  "Surfacing Replan Resumes the Same Package Simulation": "tests/e2e/sim_pkg_r1_mission_simulator_package.spec.js",
  "Three Simulation Uses Incremental Presentation Updates": "tests/e2e/environment_rendering.spec.js",
  "Finish Instantly Avoids Per-Step Three Rebuilds": "tests/e2e/environment_rendering.spec.js",
  "Three Quality Profiles Preserve Canonical Simulation Result": "tests/e2e/environment_rendering.spec.js",
  "Three Context Slabs Reduce Cost Without Losing Dive Context": "tests/e2e/environment_rendering.spec.js",
  "Three Mission Uses Continuous Bathymetric Terrain": "tests/e2e/environment_rendering.spec.js",
  "Three Terrain Camera Gestures Do Not Rebuild Bathymetry Mesh": "tests/e2e/environment_rendering.spec.js",
  "Bathymetry Limits Predicted and Realized Dive Depth": "tests/e2e/environment_rendering.spec.js",
  "Continuous Coastline Blocks Invalid Surface Waypoints": "tests/e2e/environment_rendering.spec.js",
  "Water-Column Layers Respect Continuous Seabed": "tests/e2e/environment_rendering.spec.js",
  "Bathymetric Demo and Mission Renderer Share Terrain Geometry": "tests/e2e/environment_rendering.spec.js",
  "All Production Mission Phases Share One Bathymetry Contract": "tests/e2e/environment_rendering.spec.js",
  "Three Bathymetry Resources Dispose Across Scene Transitions": "tests/e2e/environment_rendering.spec.js",
  "Three Bathymetric Terrain Preserves Render-Cost Gate": "tests/e2e/environment_rendering.spec.js",
  "Three Camera Remains Responsive Under Live Simulation Load": "tests/e2e/environment_rendering.spec.js",
  "Segment Distance Changes Predicted Dive Geometry": "tests/e2e/environment_rendering.spec.js",
  "Predicted and Realized Dive Paths Remain Distinct": "tests/e2e/environment_rendering.spec.js",
  "Bathymetry Demo and Mission Dive Paths Share Coordinates": "tests/e2e/environment_rendering.spec.js",
  "Three Mission Workspace Stabilization": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "Three Mission renderer preserves live Mission Planning state": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "Three Planning Pointer Interaction dispatches canonical workspace commands": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "Three Waypoint Pipeline and Standard Camera Gestures": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "Three Mission Planning Tools and Camera Controls": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "Three Simulation Selection inspects canonical public simulation objects": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "scenario setup stays inside the center viewport": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "challenge setup uses left navigator and selected briefing": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "level generator opens from main menu": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "deterministic challenge generates a fresh perfect-knowledge level": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "load level json imports a level and offers play/edit actions": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "stochastic mode exposes ensemble and risk controls": "tests/e2e/workspace_and_challenge_setup.spec.js",
  "Execute Mission Through Three Simulation": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Volumetric Water Column Planning": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Depth-Aware Dive and Sampling": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Mission Scene Isolation": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Scene Cleanup Is Null-Safe and Idempotent": "tests/e2e/simulation_and_terrain.spec.js",
  "Generated Mission Opens a Visible Volumetric Water Column": "tests/e2e/simulation_and_terrain.spec.js",
  "Legacy Mission Uses Explicit Surface Compatibility Mode": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Vehicle Pose Guidance and Grid Alignment": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Waypoint Validation and Mission Window Semantics": "tests/e2e/simulation_and_terrain.spec.js",
  "Terrain-Aware Placement Preview Prevents Invalid Mission Mutation": "tests/e2e/simulation_and_terrain.spec.js",
  "Continuous Route Validation Detects Coastline and Clearance Risks": "tests/e2e/simulation_and_terrain.spec.js",
  "Sampling Targets Respect Canonical Seabed and Reachability": "tests/e2e/simulation_and_terrain.spec.js",
  "Mission Readiness Separates Errors Warnings and Advisories": "tests/e2e/simulation_and_terrain.spec.js",
  "Planned and Realized Paths Share Terrain Validation": "tests/e2e/simulation_and_terrain.spec.js",
  "Terrain Validation Persists Through Export Headless and Replay": "tests/e2e/simulation_and_terrain.spec.js",
  "Three Terrain Presentation Clearly Distinguishes Mission Semantics": "tests/e2e/simulation_and_terrain.spec.js",
  "Legacy and Three Simulation Produce Identical Canonical Result": "tests/e2e/simulation_and_terrain.spec.js",
  "legacy saved level registry scene still opens": "tests/e2e/simulation_and_terrain.spec.js",
  "Product Hub Opens Methods and Validation": "tests/e2e/scientific_validation_methods.spec.js",
  "Component Claims Metrics and Limitations Are Inspectable": "tests/e2e/scientific_validation_methods.spec.js",
  "Official Baseline and Exploratory Rerun Stay Distinct": "tests/e2e/scientific_validation_methods.spec.js",
  "Methods and Validation Runs From Pages Subpath": "tests/e2e/scientific_validation_methods.spec.js",
  "Notebook and Fixtures Load From Pages Subpath": "tests/e2e/colab_classical_benchmark.spec.js"
  ,
  "Alpha First-Run Guided Mission": "tests/e2e/alpha_r1_external_preview.spec.js",
  "Alpha Researcher Quick Start": "tests/e2e/alpha_r1_external_preview.spec.js",
  "Alpha Feedback Diagnostics and Error Recovery": "tests/e2e/alpha_r1_external_preview.spec.js",
  "Alpha Pages and Compact Layout": "tests/e2e/alpha_r1_external_preview.spec.js",
  "Alpha Browser Compatibility Critical Path": "tests/e2e/alpha_r1_1_acceptance.spec.js",
  "ALPHA-R1 Full External Pilot Walkthrough": "tests/e2e/alpha_r1_1_acceptance.spec.js",
  "Synthetic Atlas Window Selection": "tests/e2e/environment_studio_r1.spec.js",
  "Atlas Window Generates Regional Detail": "tests/e2e/environment_studio_r1.spec.js"
});

const NODE_COVERAGE = Object.freeze({
  APP_BOOT: ['node tools/maintenance/repo_declutter.mjs verify', 'node tools/js/audit_playwright_group_coverage.mjs'],
  CHALLENGE_GENERATION: ['npm.cmd run test:science'],
  CURRENT_TIMELINE: ['node tools/js/smoke_visible_planning_timeline_current_binding.mjs'],
  DEPTH_STRUCTURED_CURRENTS: ['npm.cmd run test:science'],
  DIVE_PREDICTION: ['node tools/js/smoke_current_dive_profile_consequence.mjs'],
  SIMULATION_PHYSICS: ['node tools/js/smoke_environment_mission_coupling.mjs'],
  IMPORT_EXPORT: ['npm.cmd run test:packages'],
  METHODS_VALIDATION: ['node tools/tests/scientific_validation.test.mjs'],
  CLASSICAL_PLANNER_NOTEBOOK: ['node tools/js/audit_colab_classical_benchmark.mjs'],
  EXTERNAL_ALPHA_PREVIEW: ['node tools/js/validate_alpha_release_manifest.mjs', 'node tools/js/audit_alpha_release_readiness.mjs', 'node tools/js/audit_alpha_r1_1_acceptance.mjs'],
  ENVIRONMENT_STUDIO: ['node tools/js/smoke_environment_studio_contracts.mjs', 'node tools/js/smoke_environment_studio_project.mjs', 'node tools/js/smoke_environment_studio_regional_preview.mjs', 'node tools/js/smoke_environment_atlas_r1.mjs'],
  ENVIRONMENT_PACKAGE: ['npm.cmd run test:packages'],
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
  capability('ENVIRONMENT-PACKAGE', 'Canonical environment artifact composition, identity, validation, and sampling', true, true, true, [
    'Environment Package Powers Generated Planning World',
    'Planning Execute Simulation Preserve One Environment Identity'
  ], NODE_COVERAGE.ENVIRONMENT_PACKAGE),
  capability('ENVIRONMENT-STUDIO', 'Browser-side synthetic environment authoring, validation, and project import/export', false, false, true, [
    'Synthetic Atlas Window Selection',
    'Atlas Window Generates Regional Detail'
  ], NODE_COVERAGE.ENVIRONMENT_STUDIO),
  capability('DIVE-PREDICTION', 'Planned dive, sampling target, and clearance', true, false, true, [
    'Surface Waypoints Produce a Predicted Three-Dimensional Dive',
    'Sampling Target Drives Predicted Dive Without Becoming a Navigation Point',
    'Predicted Multi-Yo Profile Executes Through Canonical Simulation'
  ], NODE_COVERAGE.DIVE_PREDICTION),
  capability('EXECUTE', 'Launch snapshot and simulation initialization', true, true, true, [
    'Execute Mission Through Three Simulation',
    'Browser Simulation Uses Package Kernel as Sole Authority',
    'Continuous Mission Plan Executes Through Canonical 3D Dive'
  ]),
  capability('SIMULATION-CONTROLS', 'Play, pause, step, and finish controls', true, true, true, [
    'Simulation Play Pause and Step Control Current Evolution',
    'Package Kernel Preserves Play Pause Step Finish and Reset',
    'Three Depth-Aware Dive and Sampling'
  ]),
  capability('SIMULATION-PHYSICS', 'Dive execution, current drift, and depth-aware sampling', true, false, true, [
    'Same Horizontal Location Produces Depth-Specific Science Samples',
    'Three Depth-Aware Dive and Sampling',
    'Simulation Play Pause and Step Control Current Evolution'
  ], NODE_COVERAGE.SIMULATION_PHYSICS),
  capability('SURFACING-REPLAN', 'Surfacing decision modal and replan/resume flow', true, true, true, [
    'Surfacing Replan Can Change Future Segment Dive Profiles',
    'Surfacing Replan Resumes the Same Package Simulation'
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
    'Browser Headless and Pages Share the Authoritative Kernel',
    'Right Panel Segment Profile Survives Export Import and Execute',
    'Three Mission Editor Export Reimport Roundtrip Is Lossless',
    'Codec Package Runs From GitHub Pages Subpath'
  ], NODE_COVERAGE.IMPORT_EXPORT),
  capability('BENCHMARK', 'At least one production benchmark workflow', true, false, true, [
    'Planner Benchmark debrief exports benchmark records from synthetic result',
    'Benchmark modes overview opens from Simulation Lab'
  ]),
  capability('LEARNING-LAB', 'At least one active lab route', true, true, true, [
    'learning labs static page is linked from the main menu',
    'Next Shell Loads Legacy Learning Lab Only On Demand'
  ]),
  capability('METHODS-VALIDATION', 'Public scientific validation evidence baseline and Methods route', true, false, true, [
    'Product Hub Opens Methods and Validation',
    'Component Claims Metrics and Limitations Are Inspectable',
    'Official Baseline and Exploratory Rerun Stay Distinct',
    'Methods and Validation Runs From Pages Subpath'
  ], NODE_COVERAGE.METHODS_VALIDATION),
  capability('CLASSICAL-PLANNER-NOTEBOOK', 'External Colab classical-planner benchmark notebook, fixtures, plans, and authoritative ANCHOR round trip', false, false, true, [
    'Notebook and Fixtures Load From Pages Subpath'
  ], NODE_COVERAGE.CLASSICAL_PLANNER_NOTEBOOK),
  capability('EXTERNAL-ALPHA-PREVIEW', 'Alpha identity, onboarding, researcher quick start, feedback diagnostics, error recovery, and Pages subpath', true, true, true, [
    'Alpha First-Run Guided Mission',
    'Alpha Researcher Quick Start',
    'Alpha Feedback Diagnostics and Error Recovery',
    'Alpha Pages and Compact Layout',
    'Alpha Browser Compatibility Critical Path'
  ], NODE_COVERAGE.EXTERNAL_ALPHA_PREVIEW),
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
