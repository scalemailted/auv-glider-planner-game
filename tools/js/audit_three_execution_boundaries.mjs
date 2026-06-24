import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = [
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/ThreeMissionInteractionController.js',
  'src/game/three/layers/ThreeRealizedTrajectoryLayer.js',
  'src/game/three/layers/ThreeObservationLayer.js',
  'src/game/three/layers/ThreeRouteStatusLayer.js',
  'src/game/three/layers/ThreeSimulationStatusLayer.js',
  'src/game/three/layers/ThreePlannedDiveTrajectoryLayer.js',
  'src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js',
  'src/game/three/ThreeMissionPerformanceMonitor.js',
  'src/game/three/ThreeSimulationPresentationScheduler.js',
  'src/game/three/ThreeRenderCostPolicy.js',
  'src/game/three/ThreeWebGLGpuTimer.js'
];
for (const file of files) {
  const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  assert(!/new\s+SimulationEngine/.test(source), `${file} must not create a SimulationEngine`);
  assert(!/summarizeScore|score\s*=|finalScore\s*=/.test(source), `${file} must not calculate score`);
  assert(!/updateSampling|sampleROI|generateObservation/.test(source), `${file} must not generate observations`);
  assert(!/engine\.step|stepOnce\(/.test(source), `${file} must not step the engine`);
  assert(!/hiddenTruth|T_hiddenTruth/.test(source), `${file} must not reference hidden truth`);
}
const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const missionWorkspaceScene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const continuousUiState = fs.readFileSync('src/core/rendering/ContinuousMissionUiState.js', 'utf8');
assert(scene.includes('new SimulationEngine'), 'SimulationScene/core must remain engine owner');
assert(scene.includes('createThreeSimulationPresentationScheduler'), 'SimulationScene owns scheduler wiring while engine remains canonical');
assert(scene.includes('rendererOwnsSimulationState: false'), 'debug must state renderer does not own simulation state');
assert(scene.includes('rendererOwnsScoring: false'), 'debug must state renderer does not own scoring');
assert(scene.includes('ANCHOR_THREE_PERFORMANCE_DEBUG'), 'SimulationScene publishes renderer performance debug without owning simulation');
assert(missionWorkspaceScene.includes('usesCanonical3DDiveState: true'), 'Planning debug must state canonical 3D dive state ownership');
assert(missionWorkspaceScene.includes('setWaterColumnVolumeRenderMode'), 'Planning scene must own volume render mode control');
assert(missionWorkspaceScene.includes('setWaterColumnDiveProfile'), 'Planning scene must own dive profile control');
assert(missionWorkspaceScene.includes('setWaterColumnMaximumDepth'), 'Planning scene must own requested-depth control');
assert(missionWorkspaceScene.includes('setWaterColumnCycleCount'), 'Planning scene must own cycle-count control');
assert(missionWorkspaceScene.includes('setWaypointSnapMode'), 'Planning scene must own waypoint snap mode control');
assert(continuousUiState.includes('rendererOwnsPlanning: false'), 'Continuous UI contract must deny renderer planning ownership');
assert(continuousUiState.includes('rendererOwnsSimulation: false'), 'Continuous UI contract must deny renderer simulation ownership');
assert(continuousUiState.includes('rendererOwnsScoring: false'), 'Continuous UI contract must deny renderer scoring ownership');
assert(continuousUiState.includes('usesArbitraryXYZRoutePlanning: false'), 'Continuous UI contract must deny arbitrary XYZ planning');
assert(continuousUiState.includes('qualityProfile'), 'Continuous UI contract must carry render quality as presentation state');
assert(continuousUiState.includes('fieldDisplayMode'), 'Continuous UI contract must carry active/all-layer field display mode');
const rightWaypointPanel = fs.readFileSync('src/ui/RightWaypointPanel.js', 'utf8');
const segmentCommands = fs.readFileSync('src/core/planning/SegmentFlightPlanCommands.js', 'utf8');
assert(rightWaypointPanel.includes('Draft changes are excluded from export, scoring, and Execute until Apply.'), 'DIVE-UX-R1 UI must state draft exclusion from Execute/export/scoring');
assert(!/selectedSegmentFlightPlanDraft/.test(segmentCommands), 'canonical segment command module must not depend on UI draft state');
assert(missionWorkspaceScene.includes('ANCHOR_SEGMENT_FLIGHT_PLAN_DEBUG'), 'Planning scene must publish DIVE-UX-R1 segment flight plan debug');
assert(missionWorkspaceScene.includes('selectedSegmentFlightPlanDraft'), 'Planning scene owns transient DIVE-UX-R1 draft state');
assert(missionWorkspaceScene.includes('updateSegmentFlightPlan'), 'Planning scene applies DIVE-UX-R1 edits through canonical command');
const currentGlyphLayer = fs.readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
assert(/rendererOwnsCurrent:\s*false/.test(currentGlyphLayer), 'Current glyph layer must not own current authority');
assert(/changesOfficialScoring:\s*false/.test(currentGlyphLayer), 'Current glyph layer must not change scoring');
const nextBootstrap = fs.readFileSync('src/app/production/AnchorProductionBootstrap.js', 'utf8');
const nextViews = fs.readFileSync('src/app/production/views/RouteViewFactory.js', 'utf8');
assert(/usesCanonicalPlanning:\s*true/.test(nextBootstrap), 'R3A next shell debug must state canonical Planning reuse');
assert(/usesCanonicalSimulation:\s*true/.test(nextBootstrap), 'R3A next shell debug must state canonical Simulation reuse');
assert(/usesCanonicalReplayReducer:\s*true/.test(nextBootstrap), 'R3A next shell debug must state canonical Replay reducer reuse');
assert(/createThreeMissionWorldRenderer/.test(nextViews), 'R3A next shell must reuse Three mission world renderer');
assert(!/new\s+SimulationEngine/.test(nextViews), 'R3A next shell views must not create SimulationEngine');
console.log('audit_three_execution_boundaries passed');
