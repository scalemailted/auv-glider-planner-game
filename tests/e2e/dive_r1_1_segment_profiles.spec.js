import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;
const DIVE_R1_1_BASE_URL = 'http://127.0.0.1:9325';

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9325 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function runCase(page, caseId, path = '/') {
  await page.goto(DIVE_R1_1_BASE_URL + path);
  return page.evaluate(async (selectedCaseId) => {
    const { buildMissionRouteSegments } = await import('./src/core/planning/MissionRouteSegment.js');
    const { updateWaypoint, normalizePlan } = await import('./src/core/planning/WaypointPlan.js');
    const { buildPlannedDiveSegmentsForRoutes } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const { buildWaterColumnLayerExplorerViewModel } = await import('./src/core/rendering/WaterColumnLayerExplorerViewModel.js');
    const { createSurfacingReplanHandoff, normalizeSurfacingReplanHandoff } = await import('./src/core/planning/SurfacingReplanHandoff.js');
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');

    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function depthLayerIds() { return ['surface', 'shallow', 'thermocline', 'midwater', 'deep']; }
    function depthCoordinates() { return depthLayerIds().map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0)); }
    function field(grid = { width: 8, height: 5 }) {
      return depthLayerIds().map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => Number(([0.09, 0.25, 0.88, 0.57, 0.32][z] + row * 0.017 + col * 0.011).toFixed(6)))));
    }
    function fixture(profileId = 'sawtoothProfile', targetLayer = profileId === 'surfaceOnly' ? 'surface' : 'deep') {
      const grid = { width: 8, height: 5 };
      const layers = depthLayerIds();
      const waterColumnConfig = { enabled: true, depthLayerIds: layers, defaultLayerIds: layers, diveProfileId: profileId, defaultDiveProfileId: profileId, defaultTargetDepthLayerId: targetLayer, source: 'generatedModernMission', generatedModernMission: true };
      const depthMeters = Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180));
      const level = {
        levelId: 'dive-r1-1-segment-profile-e2e',
        world: { grid, time: { dt: 1, duration: 30 }, waterColumnConfig },
        layers: {
          truth: { frames: Array.from({ length: 31 }, (_value, t) => ({ t, roi: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 0.8)) })) },
          terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)),
          hazards: [],
          waterColumn: { sampleValue: field(grid), depthCoordinates: depthCoordinates(), timeCoordinates: [0] },
          depthMeters
        },
        bathymetry: { depthMeters }
      };
      const mission = {
        missionId: 'dive-r1-1-segment-profile-mission',
        fieldSamplingProfileId: 'trilinearVolumeV1',
        agents: [
          { id: 'glider-1', label: 'Glider 1', start: { x: 1, y: 2 }, maxSpeed: 0.55, samplingRadius: 0.9, diveProfileId: profileId, targetDepthLayerId: targetLayer },
          { id: 'glider-2', label: 'Glider 2', start: { x: 1, y: 1 }, maxSpeed: 0.55, diveProfileId: 'surfaceOnly' },
          { id: 'glider-3', label: 'Glider 3', start: { x: 1, y: 3 }, maxSpeed: 0.55, diveProfileId: 'surfaceOnly' }
        ],
        waterColumnConfig,
        rules: { roiThreshold: 0, samplingRadius: 0.9, waterColumn: { defaultDiveProfileId: profileId, defaultTargetDepthLayerId: targetLayer } },
        scoring: { depthScience: { scoreProfileId: 'depthAwareScienceV1' } },
        physics: { minimumBottomClearanceMeters: 5, verticalSpeedMetersPerSecond: 0.3 }
      };
      const waypoints = [
        { id: 'wp-1', x: 2.1, y: 2, action: 'sample', diveProfileId: profileId, targetDepthLayerId: targetLayer, depthLayerId: targetLayer },
        { id: 'wp-2', x: 3.2, y: 2, action: 'sample', diveProfileId: profileId, targetDepthLayerId: targetLayer, depthLayerId: targetLayer },
        { id: 'wp-3', x: 4.3, y: 2, action: 'sample', diveProfileId: profileId, targetDepthLayerId: targetLayer, depthLayerId: targetLayer }
      ];
      const plan = {
        type: 'anchor.plan',
        levelId: level.levelId,
        missionId: mission.missionId,
        coordinateProfileId: 'continuousGridV1',
        fieldSamplingProfileId: 'trilinearVolumeV1',
        agentPlans: [
          { agentId: 'glider-1', selectedStart: { x: 1, y: 2 }, diveProfileId: profileId, targetDepthLayerId: targetLayer, waypoints },
          { agentId: 'glider-2', selectedStart: { x: 1, y: 1 }, waypoints: [] },
          { agentId: 'glider-3', selectedStart: { x: 1, y: 3 }, waypoints: [] }
        ]
      };
      return { level, mission, plan, waterColumnConfig, grid };
    }
    function routeFromPlan(plan) {
      const agentPlan = plan.agentPlans.find((entry) => entry.agentId === 'glider-1');
      return [{ id: 'route-glider-1', agentId: 'glider-1', points: [{ id: 'glider-1-surface-start', x: agentPlan.selectedStart.x, y: agentPlan.selectedStart.y }, ...agentPlan.waypoints] }];
    }
    function assert(condition, message) { if (!condition) throw new Error(message); }

    if (selectedCaseId === 'incoming-segment-edit') {
      const fx = fixture();
      updateWaypoint(fx.plan, 'glider-1', 1, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', maximumDiveDepthMeters: 120, samplingPhase: 'both' });
      const segments = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
      const edited = segments.find((segment) => segment.target.id === 'wp-2');
      assert(edited.flightProfile.profileId === 'deepDive', 'selected target edits incoming segment profile');
      assert(edited.flightProfile.targetDepthLayerId === 'deep', 'selected target edits incoming segment target layer');
      assert(edited.flightProfile.samplingPhase === 'both', 'selected target edits sampling phase');
      assert(fx.plan.agentPlans[0].diveProfileId === 'sawtoothProfile', 'editing selected segment does not mutate glider default');
      return { profileId: edited.flightProfile.profileId, targetDepthLayerId: edited.flightProfile.targetDepthLayerId, samplingPhase: edited.flightProfile.samplingPhase };
    }

    if (selectedCaseId === 'inheritance-visible-editable') {
      const fx = fixture('shallowDive', 'shallow');
      fx.plan.agentPlans[0].waypoints[0] = { id: 'wp-1', x: 2.1, y: 2, action: 'sample' };
      const inherited = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission })[0];
      updateWaypoint(fx.plan, 'glider-1', 0, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep' });
      const edited = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission })[0];
      return { inheritedProfile: inherited.flightProfile.profileId, editedProfile: edited.flightProfile.profileId, inheritedSource: inherited.flightProfile.profileSource, editedTarget: edited.flightProfile.targetDepthLayerId };
    }

    if (selectedCaseId === 'different-segments') {
      const fx = fixture();
      updateWaypoint(fx.plan, 'glider-1', 0, { diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow', cycleCount: 1 });
      updateWaypoint(fx.plan, 'glider-1', 1, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', cycleCount: 2 });
      const routeSegments = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission });
      const planned = buildPlannedDiveSegmentsForRoutes({ routes: routeFromPlan(fx.plan), routeSegments, level: fx.level, waterColumnConfig: fx.waterColumnConfig, bottomBoundary: { bottomDepthField: fx.level.bathymetry.depthMeters } });
      return planned.map((segment) => ({ id: segment.segmentId, profileId: segment.diveProfileId, targetDepthLayerId: segment.targetDepthLayerId, maxDepth: segment.achievableMaximumDepthMeters, cycles: segment.cycleCount }));
    }

    if (selectedCaseId === 'surface-arrival') {
      const fx = fixture();
      updateWaypoint(fx.plan, 'glider-1', 0, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', surfaceAtEnd: true, communicationWaitSeconds: 240 });
      const segment = buildMissionRouteSegments(fx.plan, { level: fx.level, mission: fx.mission })[0];
      return { profileId: segment.flightProfile.profileId, targetDepthLayerId: segment.flightProfile.targetDepthLayerId, surfaceAtEnd: segment.flightProfile.surfaceAtEnd, communicationWaitSeconds: segment.flightProfile.communicationWaitSeconds };
    }

    if (selectedCaseId === 'layer-values') {
      const fx = fixture();
      const explorer = buildWaterColumnLayerExplorerViewModel({ level: fx.level, grid: fx.grid, selectedLocation: { x: 2.4, y: 2, depthLayerId: 'thermocline' }, displayMode: 'stackedSlabs', activeLayerId: 'thermocline' });
      return { values: explorer.selectedVerticalProfile.map((entry) => Number(entry.scienceValue)), layers: explorer.selectedVerticalProfile.map((entry) => entry.layerId), activeLayerId: explorer.activeLayerId };
    }

    if (selectedCaseId === 'stacked-integrated') {
      const fx = fixture();
      const stacked = buildWaterColumnLayerExplorerViewModel({ level: fx.level, grid: fx.grid, displayMode: 'stackedSlabs' });
      const integrated = buildWaterColumnLayerExplorerViewModel({ level: fx.level, grid: fx.grid, displayMode: 'integratedWaterColumn' });
      return { stackedMode: stacked.displayMode, integratedMode: integrated.displayMode, layerCount: stacked.layers.length, integratedDerived: integrated.integratedSummary.derived, integratedPhysical: integrated.integratedSummary.physicalDepthPlane };
    }

    if (selectedCaseId === 'actual-observation-layer') {
      const fx = fixture('sawtoothProfile', 'deep');
      const engine = new SimulationEngine({ level: clone(fx.level), mission: clone(fx.mission), plan: clone(fx.plan) });
      engine.runUntilComplete(260);
      const result = engine.getResult();
      const events = result.events.filter((event) => event.type === 'sample' && event.agentId === 'glider-1');
      const idleEvents = result.events.filter((event) => event.type === 'sample' && event.agentId !== 'glider-1');
      return { count: events.length, layers: [...new Set(events.map((event) => event.depthLayerId))], depths: events.map((event) => Number(event.depthMeters ?? 0)), valuesFinite: events.every((event) => Number.isFinite(Number(event.value ?? event.expectedValue))), idleCount: idleEvents.length, aborted: result.aborted };
    }

    if (selectedCaseId === 'surfacing-replan') {
      const fx = fixture();
      const handoff = createSurfacingReplanHandoff({ level: fx.level, mission: fx.mission, plan: fx.plan, surfacedAgentId: 'glider-1', decisionState: { id: 'decision-1', agentId: 'glider-1', time: 120, actualPosition: { x: 2.1, y: 2 }, completedWaypoints: ['wp-1'], pendingWaypoints: ['wp-2', 'wp-3'] }, resumeState: { t: 120, awaitingSurfaceDecision: { id: 'decision-1', agentId: 'glider-1' }, agents: [{ id: 'glider-1', x: 2.1, y: 2 }] } });
      const replanned = normalizeSurfacingReplanHandoff(handoff);
      const sourcePlan = replanned.sourcePlan;
      updateWaypoint(sourcePlan, 'glider-1', 1, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep' });
      const segments = buildMissionRouteSegments(sourcePlan, { level: fx.level, mission: fx.mission });
      return { completedProfile: segments.find((segment) => segment.target.id === 'wp-1').flightProfile.profileId, futureProfile: segments.find((segment) => segment.target.id === 'wp-2').flightProfile.profileId, resetsClock: replanned.boundaryFlags.resetsSimulationClock, usesNewPlanner: replanned.boundaryFlags.usesNewPlanner };
    }

    if (selectedCaseId === 'roundtrip-plan') {
      const fx = fixture();
      updateWaypoint(fx.plan, 'glider-1', 0, { diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow', samplingPhase: 'descent' });
      updateWaypoint(fx.plan, 'glider-1', 1, { diveProfileId: 'deepDive', targetDepthLayerId: 'deep', samplingPhase: 'ascent' });
      const normalized = normalizePlan(JSON.parse(JSON.stringify(fx.plan)), fx.level, fx.mission);
      const parsed = JSON.parse(JSON.stringify(normalized));
      const segments = buildMissionRouteSegments(parsed, { level: fx.level, mission: fx.mission });
      return { profiles: segments.map((segment) => segment.flightProfile.profileId), phases: segments.map((segment) => segment.flightProfile.samplingPhase), ids: segments.map((segment) => segment.id), waypointCount: parsed.agentPlans[0].waypoints.length };
    }

    if (selectedCaseId === 'subpath-explorer') {
      const fx = fixture();
      const explorer = buildWaterColumnLayerExplorerViewModel({ level: fx.level, grid: fx.grid, selectedLocation: { x: 2, y: 2, depthLayerId: 'deep' }, displayMode: 'stackedSlabs' });
      return { path: location.pathname, layerCount: explorer.layers.length, activeVariable: explorer.activeVariable, displayOwnsScience: explorer.boundaryFlags.displayOwnsScience };
    }

    throw new Error('Unknown DIVE-R1.1 browser case: ' + selectedCaseId);
  }, caseId);
}

test('Waypoint Panel Edits the Incoming Segment Flight Profile', async ({ page }) => {
  const result = await runCase(page, 'incoming-segment-edit');
  expect(result).toMatchObject({ profileId: 'deepDive', targetDepthLayerId: 'deep', samplingPhase: 'both' });
});

test('Segment Profile Inheritance Is Visible and Editable', async ({ page }) => {
  const result = await runCase(page, 'inheritance-visible-editable');
  expect(result.inheritedProfile).toBe('shallowDive');
  expect(result.editedProfile).toBe('deepDive');
  expect(result.editedTarget).toBe('deep');
});

test('Different Segments Use Different Dive Strategies', async ({ page }) => {
  const result = await runCase(page, 'different-segments');
  expect(result.length).toBeGreaterThanOrEqual(2);
  expect(result[0]).toMatchObject({ profileId: 'shallowDive', targetDepthLayerId: 'shallow' });
  expect(result[1]).toMatchObject({ profileId: 'deepDive', targetDepthLayerId: 'deep' });
  expect(result[1].maxDepth).toBeGreaterThanOrEqual(result[0].maxDepth);
});

test('Surface Arrival Behavior Is Separate From Dive Profile', async ({ page }) => {
  const result = await runCase(page, 'surface-arrival');
  expect(result.profileId).toBe('deepDive');
  expect(result.targetDepthLayerId).toBe('deep');
  expect(result.surfaceAtEnd).toBe(true);
  expect(result.communicationWaitSeconds).toBe(240);
});

test('Water Column Explorer Shows Depth-Specific Layer Values', async ({ page }) => {
  const result = await runCase(page, 'layer-values');
  expect(result.layers).toContain('surface');
  expect(result.layers).toContain('deep');
  expect(result.values.every((value) => Number.isFinite(value))).toBe(true);
  expect(new Set(result.values.map((value) => value.toFixed(5))).size).toBeGreaterThanOrEqual(2);
});

test('Water Column Explorer Supports Stacked and Integrated Views', async ({ page }) => {
  const result = await runCase(page, 'stacked-integrated');
  expect(result.stackedMode).toBe('stackedSlabs');
  expect(result.integratedMode).toBe('integratedWaterColumn');
  expect(result.layerCount).toBeGreaterThanOrEqual(3);
  expect(result.integratedDerived).toBe(true);
  expect(result.integratedPhysical).toBe(false);
});

test('Actual Observation Appears on Its Sampled Depth Layer', async ({ page }) => {
  const result = await runCase(page, 'actual-observation-layer');
  expect(result.aborted).toBe(false);
  expect(result.count).toBeGreaterThan(0);
  expect(result.valuesFinite).toBe(true);
  expect(result.depths.some((depth) => depth > 1)).toBe(true);
  expect(result.layers.length).toBeGreaterThanOrEqual(1);
  expect(result.idleCount).toBe(0);
});

test('Surfacing Replan Can Change Future Segment Dive Profiles', async ({ page }) => {
  const result = await runCase(page, 'surfacing-replan');
  expect(result.completedProfile).toBe('sawtoothProfile');
  expect(result.futureProfile).toBe('deepDive');
  expect(result.resetsClock).toBe(false);
  expect(result.usesNewPlanner).toBe(false);
});

test('Segment Flight Profiles Roundtrip Through Plan and Replay', async ({ page }) => {
  const result = await runCase(page, 'roundtrip-plan');
  expect(result.waypointCount).toBe(3);
  expect(result.profiles.slice(0, 2)).toEqual(['shallowDive', 'deepDive']);
  expect(result.phases.slice(0, 2)).toEqual(['descent', 'ascent']);
  expect(new Set(result.ids).size).toBe(result.ids.length);
});

test('Layer Explorer Runs From GitHub Pages Subpath', async ({ page }) => {
  const result = await runCase(page, 'subpath-explorer', '/auv-glider-planner-game/');
  expect(result.path).toBe('/auv-glider-planner-game/');
  expect(result.layerCount).toBeGreaterThanOrEqual(3);
  expect(result.displayOwnsScience).toBe(false);
});
