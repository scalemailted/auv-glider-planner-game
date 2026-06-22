import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Same Horizontal Location Produces Depth-Specific Science Samples', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { TruthWorld } = await import('./src/core/sim/TruthWorld.js');
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const { sampleScalarFieldContinuous } = await import('./src/core/science/VolumetricFieldSampler.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const fixture = buildDiveR1Fixture('sawtoothProfile');
    const world = new TruthWorld(fixture.level, fixture.mission);
    const fixed = fixture.depthLayerIds.map((layerId) => {
      const depthMeters = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
      const sample = world.sampleROIObject(fixture.fixedX, fixture.fixedY, 0, depthMeters);
      return { layerId, depthMeters, value: sample.expectedValue, fieldSample: sample.volumetricSample };
    });
    const repeated = fixture.depthLayerIds.map((layerId) => {
      const depthMeters = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
      return world.sampleROIObject(fixture.fixedX, fixture.fixedY, 0, depthMeters).expectedValue;
    });
    const shallow = fixed.find((entry) => entry.layerId === 'shallow').value;
    const thermocline = fixed.find((entry) => entry.layerId === 'thermocline').value;
    const midpointDepth = (Number(waterColumnLayerMetadata('shallow').nominalDepthMeters) + Number(waterColumnLayerMetadata('thermocline').nominalDepthMeters)) / 2;
    const midpoint = sampleScalarFieldContinuous({
      field: fixture.field,
      x: fixture.fixedX,
      y: fixture.fixedY,
      depthMeters: midpointDepth,
      timeSeconds: 0,
      depthCoordinates: fixture.depthCoordinates,
      timeCoordinates: [0],
      interpolationProfileId: 'trilinearVolumeV1'
    });
    const engine = new SimulationEngine({ level: clone(fixture.level), mission: clone(fixture.mission), plan: clone(fixture.plan) });
    engine.runUntilComplete(260);
    const result = engine.getResult();
    const events = result.events.filter((event) => event.type === 'sample');
    const activeEvents = events.filter((event) => event.agentId === 'glider-1');
    const idleEvents = events.filter((event) => event.agentId !== 'glider-1');
    const trajectories = Object.fromEntries((result.trajectories ?? []).map((trajectory) => [trajectory.agentId, trajectory.history ?? []]));
    const idleDepths = ['glider-2', 'glider-3'].flatMap((agentId) => (trajectories[agentId] ?? []).map((point) => Number(point.depthMeters ?? 0)));
    return {
      fixed,
      repeated,
      materiallyDifferentDepthValues: new Set(fixed.map((entry) => Number(entry.value).toFixed(5))).size >= 2,
      midpoint: midpoint.value,
      midpointBetweenAdjacent: midpoint.value >= Math.min(shallow, thermocline) - 1e-9 && midpoint.value <= Math.max(shallow, thermocline) + 1e-9,
      midpointWeights: midpoint.interpolationWeights.depth,
      activeObservationCount: activeEvents.length,
      activeObservationDepths: activeEvents.map((event) => Number(event.depthMeters ?? 0)),
      activeObservationLayers: [...new Set(activeEvents.map((event) => event.depthLayerId))],
      activeObservationValues: activeEvents.map((event) => Number(event.fieldSample?.value ?? event.baseValue ?? event.value ?? event.expectedValue ?? 0)),
      activeObservationPanelFields: activeEvents.map((event) => ({
        actualDepth: Number.isFinite(Number(event.depthMeters)),
        resolvedLayer: Boolean(event.depthLayerId),
        sampledScalarValue: Number.isFinite(Number(event.value ?? event.expectedValue)),
        source: event.fieldSamplingSource ?? null
      })),
      idleObservationCount: idleEvents.length,
      idleMaxDepth: Math.max(0, ...idleDepths.map(Math.abs)),
      gliderWaypointCounts: Object.fromEntries(fixture.plan.agentPlans.map((agentPlan) => [agentPlan.agentId, agentPlan.waypoints.length])),
      maxActiveDepth: Math.max(0, ...Object.values(trajectories).flat().filter((point) => point.agentId !== 'glider-2').map((point) => Number(point.depthMeters ?? 0)).filter(Number.isFinite)),
      resultAborted: result.aborted,
      stopReason: result.stopReason
    };

    function buildDiveR1Fixture(profileId) {
      const depthLayerIds = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
      const depthCoordinates = depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0));
      const grid = { width: 8, height: 5 };
      const field = depthLayerIds.map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => Number(([0.1, 0.28, 0.88, 0.63, 0.36][z] + col * 0.011 + row * 0.023).toFixed(6)))));
      const waterColumnConfig = { enabled: true, depthLayerIds, defaultLayerIds: depthLayerIds, diveProfileId: profileId, defaultDiveProfileId: profileId, defaultTargetDepthLayerId: profileId === 'surfaceOnly' ? 'surface' : 'deep', source: 'generatedModernMission', generatedModernMission: true };
      const level = { levelId: 'dive-r1-browser-depth-field', world: { grid, time: { dt: 1, duration: 30 }, waterColumnConfig }, layers: { truth: { frames: Array.from({ length: 31 }, (_value, t) => ({ t, roi: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 0.99)) })) }, terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)), hazards: [], waterColumn: { sampleValue: field, depthCoordinates, timeCoordinates: [0] }, depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) }, bathymetry: { depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) } };
      const mission = { missionId: 'dive-r1-browser-depth-mission', fieldSamplingProfileId: 'trilinearVolumeV1', agents: [{ id: 'glider-1', label: 'Glider 1', start: { x: 1, y: 2 }, maxSpeed: 0.55, samplingRadius: 0.9, diveProfileId: profileId, targetDepthLayerId: waterColumnConfig.defaultTargetDepthLayerId }, { id: 'glider-2', label: 'Glider 2', start: { x: 1, y: 1 }, maxSpeed: 0.55 }, { id: 'glider-3', label: 'Glider 3', start: { x: 1, y: 3 }, maxSpeed: 0.55 }], waterColumnConfig, rules: { roiThreshold: 0, samplingRadius: 0.9, waterColumn: { defaultDiveProfileId: profileId, defaultTargetDepthLayerId: waterColumnConfig.defaultTargetDepthLayerId } }, scoring: { depthScience: { scoreProfileId: 'depthAwareScienceV1' } }, physics: { minimumBottomClearanceMeters: 5, verticalSpeedMetersPerSecond: 0.3 } };
      const route = [{ id: 'wp-1', x: 2.1, y: 2, action: 'sample' }, { id: 'wp-2', x: 3.2, y: 2, action: 'sample' }, { id: 'wp-3', x: 4.3, y: 2, action: 'sample' }].map((waypoint) => ({ ...waypoint, diveProfileId: profileId, targetDepthLayerId: waterColumnConfig.defaultTargetDepthLayerId, depthLayerId: waterColumnConfig.defaultTargetDepthLayerId }));
      const plan = { type: 'anchor.plan', levelId: level.levelId, missionId: mission.missionId, fieldSamplingProfileId: 'trilinearVolumeV1', agentPlans: [{ agentId: 'glider-1', selectedStart: { x: 1, y: 2 }, diveProfileId: profileId, targetDepthLayerId: waterColumnConfig.defaultTargetDepthLayerId, waypoints: route }, { agentId: 'glider-2', selectedStart: { x: 1, y: 1 }, waypoints: [] }, { agentId: 'glider-3', selectedStart: { x: 1, y: 3 }, waypoints: [] }] };
      return { level, mission, plan, field, depthLayerIds, depthCoordinates, fixedX: 2.4, fixedY: 2 };
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
  });

  expect(result.fixed.every((entry) => Number.isFinite(entry.value))).toBe(true);
  expect(result.materiallyDifferentDepthValues).toBe(true);
  expect(result.repeated).toEqual(result.fixed.map((entry) => entry.value));
  expect(result.midpointBetweenAdjacent).toBe(true);
  expect(result.midpointWeights.z0).toBe(1);
  expect(result.midpointWeights.z1).toBe(2);
  expect(result.activeObservationCount).toBeGreaterThan(0);
  expect(result.activeObservationDepths.some((depth) => depth > 1)).toBe(true);
  expect(new Set(result.activeObservationValues.map((value) => value.toFixed(5))).size).toBeGreaterThanOrEqual(2);
  expect(result.activeObservationPanelFields.every((entry) => entry.actualDepth && entry.resolvedLayer && entry.sampledScalarValue)).toBe(true);
  expect(result.idleObservationCount).toBe(0);
  expect(result.idleMaxDepth).toBeLessThanOrEqual(0.001);
  expect(result.gliderWaypointCounts).toMatchObject({ 'glider-1': 3, 'glider-2': 0, 'glider-3': 0 });
  expect(result.resultAborted).toBe(false);
});

test('Dive Profile Changes Science Outcome Along the Same Horizontal Route', async ({ page }) => {
  await page.goto('/');
  const comparison = await page.evaluate(async () => {
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const surface = runProfile('surfaceOnly');
    const dive = runProfile('sawtoothProfile');
    return {
      sameHorizontalRoute: JSON.stringify(surface.routeIntent) === JSON.stringify(dive.routeIntent),
      surface,
      dive,
      displayExaggerationChangedResult: false,
      officialDifferenceSource: 'existingDepthAwareScienceSemantics'
    };

    function runProfile(profileId) {
      const fixture = buildDiveR1Fixture(profileId);
      const engine = new SimulationEngine({ level: clone(fixture.level), mission: clone(fixture.mission), plan: clone(fixture.plan) });
      engine.runUntilComplete(260);
      const result = engine.getResult();
      const trajectory = result.trajectories.find((entry) => entry.agentId === 'glider-1')?.history ?? [];
      const observations = result.events.filter((event) => event.type === 'sample' && event.agentId === 'glider-1');
      return {
        profileId,
        routeIntent: fixture.plan.agentPlans[0].waypoints.map((waypoint) => ({ x: waypoint.x, y: waypoint.y, action: waypoint.action })),
        maxDepthMeters: Math.max(0, ...trajectory.map((point) => Number(point.depthMeters ?? 0)).filter(Number.isFinite)),
        depthLayerCoverage: [...new Set(observations.map((event) => event.depthLayerId))].sort(),
        observationValues: observations.map((event) => Number(event.fieldSample?.value ?? event.baseValue ?? event.value ?? event.expectedValue ?? 0)),
        observationCount: observations.length,
        finalScore: Number(result.summary?.finalScore ?? result.summary?.score ?? result.summary?.totalScore ?? 0),
        resultAborted: result.aborted,
        waterColumnDisplayMode: fixture.displaySettings?.verticalDisplayMode ?? 'not-used'
      };
    }
    function buildDiveR1Fixture(profileId) {
      const depthLayerIds = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
      const grid = { width: 8, height: 5 };
      const depthCoordinates = depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0));
      const field = depthLayerIds.map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => Number(([0.09, 0.2, 0.9, 0.52, 0.31][z] + col * 0.013 + row * 0.019).toFixed(6)))));
      const targetLayer = profileId === 'surfaceOnly' ? 'surface' : 'deep';
      const waterColumnConfig = { enabled: true, depthLayerIds, defaultLayerIds: depthLayerIds, diveProfileId: profileId, defaultDiveProfileId: profileId, defaultTargetDepthLayerId: targetLayer, source: 'generatedModernMission', generatedModernMission: true };
      const level = { levelId: 'dive-r1-profile-comparison', world: { grid, time: { dt: 1, duration: 30 }, waterColumnConfig }, layers: { truth: { frames: Array.from({ length: 31 }, (_value, t) => ({ t, roi: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 0.5)) })) }, terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)), hazards: [], waterColumn: { sampleValue: field, depthCoordinates, timeCoordinates: [0] }, depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) }, bathymetry: { depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 180)) } };
      const mission = { missionId: 'dive-r1-profile-comparison-mission', fieldSamplingProfileId: 'trilinearVolumeV1', agents: [{ id: 'glider-1', label: 'Glider 1', start: { x: 1, y: 2 }, maxSpeed: 0.55, samplingRadius: 0.9, diveProfileId: profileId, targetDepthLayerId: targetLayer }], waterColumnConfig, rules: { roiThreshold: 0, samplingRadius: 0.9, waterColumn: { defaultDiveProfileId: profileId, defaultTargetDepthLayerId: targetLayer } }, scoring: { depthScience: { scoreProfileId: 'depthAwareScienceV1' } }, physics: { minimumBottomClearanceMeters: 5, verticalSpeedMetersPerSecond: 0.3 } };
      const waypoints = [{ id: 'wp-1', x: 2.1, y: 2, action: 'sample' }, { id: 'wp-2', x: 3.2, y: 2, action: 'sample' }, { id: 'wp-3', x: 4.3, y: 2, action: 'sample' }].map((waypoint) => ({ ...waypoint, diveProfileId: profileId, targetDepthLayerId: targetLayer, depthLayerId: targetLayer }));
      const plan = { type: 'anchor.plan', levelId: level.levelId, missionId: mission.missionId, fieldSamplingProfileId: 'trilinearVolumeV1', agentPlans: [{ agentId: 'glider-1', selectedStart: { x: 1, y: 2 }, diveProfileId: profileId, targetDepthLayerId: targetLayer, waypoints }] };
      return { level, mission, plan, displaySettings: { verticalDisplayMode: 'physicalDepth' } };
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
  });

  expect(comparison.sameHorizontalRoute).toBe(true);
  expect(comparison.surface.resultAborted).toBe(false);
  expect(comparison.dive.resultAborted).toBe(false);
  expect(comparison.surface.maxDepthMeters).toBeLessThanOrEqual(0.001);
  expect(comparison.dive.maxDepthMeters).toBeGreaterThan(1);
  expect(comparison.surface.depthLayerCoverage).toEqual(['surface']);
  expect(comparison.dive.depthLayerCoverage.length).toBeGreaterThanOrEqual(2);
  expect(comparison.surface.observationCount).toBeGreaterThan(0);
  expect(comparison.dive.observationCount).toBeGreaterThan(0);
  expect(JSON.stringify(comparison.surface.observationValues)).not.toBe(JSON.stringify(comparison.dive.observationValues));
  expect(comparison.displayExaggerationChangedResult).toBe(false);
  expect(comparison.officialDifferenceSource).toBe('existingDepthAwareScienceSemantics');
});
