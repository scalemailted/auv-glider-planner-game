import assert from 'node:assert/strict';

export { assert };

export function createTerrainValidationFixture() {
  const width = 21;
  const height = 21;
  const terrain = Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => (
    x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0
  )));
  terrain[10][15] = 1;
  const depthMeters = terrain.map((row, y) => row.map((land, x) => land ? 0 : (x >= 16 || y >= 16 ? 45 : 180)));
  const hazards = terrain.map((row) => row.map(() => 0));
  hazards[12][12] = 1;
  const vector = terrain.map((row) => row.map(() => [0, 0]));
  const roi = terrain.map((row) => row.map((land) => land ? 0 : 0.2));
  const level = {
    levelId: 'terrain-validation-fixture',
    instanceId: 'terrain-validation-fixture-instance',
    world: { grid: { width, height }, time: { duration: 600, dt: 1 }, waterColumnConfig: { maxDepthMeters: 200 } },
    layers: { terrain, depthMeters, hazards, truth: { frames: [{ t: 0, vector, roi }] } },
    bathymetry: {
      depthMeters,
      landMask: terrain.map((row) => row.map(Boolean)),
      sourceDigest: 'fixture-terrain-validation-v1'
    },
    meta: { calibrated: false, synthetic: true }
  };
  const mission = {
    missionId: 'terrain-validation-mission',
    agents: [{ id: 'glider-1', label: 'Glider 1', start: { x: 10, y: 10 }, battery: 500 }],
    rules: { requireExecutableRoute: false, routeCorridorHalfWidthCells: 0.5, energyBudget: 500 },
    scoring: { official: true }
  };
  return { width, height, terrain, depthMeters, level, mission };
}

export function buildPlan(waypoints = [{ id: 'wp-open-water', x: 11, y: 10, maximumDiveDepthMeters: 20 }], scienceTargets = []) {
  return {
    schemaVersion: '2026-06-three-r1-2c-smoke',
    type: 'anchor.plan',
    levelId: 'terrain-validation-fixture',
    missionId: 'terrain-validation-mission',
    agentPlans: [{
      agentId: 'glider-1',
      selectedStart: { x: 10, y: 10 },
      waypoints
    }],
    scienceTargets
  };
}

export function stablePublicString(value) {
  return JSON.stringify(value, Object.keys(flattenKeys(value)).sort());
}

function flattenKeys(value, out = {}) {
  if (Array.isArray(value)) value.forEach((item) => flattenKeys(item, out));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      out[key] = true;
      flattenKeys(child, out);
    }
  }
  return out;
}

export function issueCodes(report) {
  return [...new Set([...(report.hardErrors ?? []), ...(report.warnings ?? []), ...(report.advisories ?? [])].map((issue) => issue.code))];
}

export function assertNoRendererAuthority(summaryOrReport) {
  const flags = summaryOrReport?.boundaryFlags ?? summaryOrReport?.summary?.boundaryFlags ?? {};
  assert.equal(flags.usesMeshRaycastForValidity, false);
  assert.equal(flags.rendererOwnsValidation, false);
  assert.equal(flags.rendererOwnsPlanning, false);
  assert.equal(flags.changesOfficialScoring, false);
}
