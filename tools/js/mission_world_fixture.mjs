import { normalizeDeploymentState } from '../../src/core/deployment/DeploymentZones.js';

export function createMissionWorldFixture() {
  const width = 8;
  const height = 6;
  const terrain = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (x === 0 || y === 0 || (x === 7 && y < 4) ? 1 : 0)));
  const hazards = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  hazards[3][4] = 1;
  hazards[4][5] = 0.8;
  const depth = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => terrain[y][x] ? 0 : Number(((x + y + 1) / (width + height)).toFixed(3))));
  const frame = (t) => ({
    t,
    roi: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => terrain[y][x] ? 0 : Number((0.12 + ((x * 3 + y * 5 + t / 60) % 9) / 10).toFixed(3)))),
    current: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => [Number((0.18 + x * 0.02).toFixed(3)), Number((0.06 + y * 0.015).toFixed(3))]))
  });
  const level = {
    levelId: 'gfx-r3a-fixture-level',
    instanceId: 'gfx-r3a-instance',
    world: { grid: { width, height }, time: { dt: 60, duration: 360, planningWindow: 120 } },
    meta: { name: 'GFX-R3A Fixture', seed: 'gfx-r3a-fixture' },
    layers: {
      terrain,
      hazards,
      depth,
      truth: { frames: [frame(0), frame(60), frame(120), frame(180)] },
      bases: [
        { id: 'alpha-base', x: 2, y: 1, radius: 1, label: 'Alpha Base' },
        { id: 'bravo-base', x: 5, y: 4, radius: 1, label: 'Bravo Base' }
      ],
      priorityTargets: [
        { id: 'star-alpha', label: 'Front Sample', x: 3, y: 2, value: 150, startTime: 0, endTime: 180 },
        { id: 'star-bravo', label: 'Eddy Sample', x: 6, y: 4, value: 120, startTime: 60, endTime: 240 }
      ]
    }
  };
  const mission = {
    missionId: 'gfx-r3a-fixture-mission',
    agents: [
      { id: 'glider-alpha', label: 'Alpha', battery: 100, deployment: { mode: 'chooseFromZone', zoneId: 'alpha-base_deployment', selectedStart: { x: 2, y: 1 } } },
      { id: 'glider-bravo', label: 'Bravo', battery: 100, deployment: { mode: 'chooseFromZone', zoneId: 'bravo-base_deployment', selectedStart: { x: 5, y: 4 } } }
    ],
    rules: { priorityTargets: { enabled: true }, dropPlacement: { enabled: true } }
  };
  const plan = {
    type: 'anchor.plan',
    schemaVersion: '2.0',
    levelId: level.levelId,
    missionId: mission.missionId,
    planningMarkers: [{ id: 'marker-1', agentId: 'glider-alpha', x: 4, y: 2, t: 60, label: 'Inspect front' }],
    agentPlans: [
      { agentId: 'glider-alpha', selectedStart: { x: 2, y: 1 }, waypoints: [{ id: 'alpha-wp-1', x: 3, y: 2, action: 'sample', t: 60 }, { id: 'alpha-wp-2', x: 4, y: 3, action: 'sample', t: 120 }] },
      { agentId: 'glider-bravo', selectedStart: { x: 5, y: 4 }, waypoints: [{ id: 'bravo-wp-1', x: 6, y: 4, action: 'sample', t: 60 }] }
    ]
  };
  normalizeDeploymentState(level, mission, plan);
  const state = {
    mode: 'planning',
    level,
    mission,
    plan,
    selectedAgentId: 'glider-alpha',
    selectedWindow: 0,
    planningTime: 60,
    challengeMode: 'perfectKnowledge',
    ui: {
      selectedWaypoint: { agentId: 'glider-alpha', index: 1 },
      hoverCell: { x: 4, y: 2 },
      rendererBackend: 'legacyPhaser2d',
      threeMissionCameraPreset: 'obliqueMission',
      threeMissionLayers: {},
      showROI: true,
      showCurrents: true,
      showHazards: true,
      showTerrain: true,
      showPlanningMarkers: true,
      showPriorityStars: true,
      roiViewMode: 'expectedValue'
    }
  };
  return { level, mission, plan, state };
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
