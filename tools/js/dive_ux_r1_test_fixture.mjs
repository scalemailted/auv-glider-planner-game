import { normalizePlan } from '../../src/core/planning/WaypointPlan.js';

export function createDiveUxR1Fixture() {
  const waterColumnConfig = {
    enabled: true,
    depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'],
    defaultLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'],
    diveProfileId: 'sawtoothProfile',
    defaultDiveProfileId: 'sawtoothProfile',
    defaultTargetDepthLayerId: 'thermocline',
    source: 'generatedModernMission',
    generatedModernMission: true
  };
  const level = {
    levelId: 'dive-ux-r1-fixture',
    world: { grid: { width: 10, height: 6 }, time: { dt: 1, duration: 7200 }, waterColumnConfig },
    layers: {
      terrain: Array.from({ length: 6 }, () => Array.from({ length: 10 }, () => false)),
      depthMeters: Array.from({ length: 6 }, () => Array.from({ length: 10 }, () => 180))
    },
    bathymetry: { depthMeters: Array.from({ length: 6 }, () => Array.from({ length: 10 }, () => 180)) }
  };
  const mission = {
    missionId: 'dive-ux-r1-mission',
    fieldSamplingProfileId: 'continuousTrilinearV1',
    waterColumnConfig,
    agents: [
      { id: 'glider-1', label: 'Glider 1', start: { x: 1, y: 2 }, maxSpeed: 0.55, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline', maxDepthMeters: 160 },
      { id: 'glider-2', label: 'Glider 2', start: { x: 1, y: 1 }, maxSpeed: 0.55, diveProfileId: 'surfaceOnly' }
    ],
    rules: { waterColumn: { defaultDiveProfileId: 'sawtoothProfile', defaultTargetDepthLayerId: 'thermocline' } },
    physics: { minimumBottomClearanceMeters: 5, verticalSpeedMetersPerSecond: 0.3 }
  };
  const plan = normalizePlan({
    type: 'anchor.plan',
    levelId: level.levelId,
    missionId: mission.missionId,
    coordinateProfileId: 'continuousGridV1',
    fieldSamplingProfileId: 'continuousTrilinearV1',
    agentPlans: [
      {
        agentId: 'glider-1',
        selectedStart: { x: 1, y: 2 },
        diveProfileId: 'sawtoothProfile',
        targetDepthLayerId: 'thermocline',
        waypoints: [
          { id: 'wp-1', x: 2, y: 2, action: 'sample', diveProfileId: 'shallowDive', targetDepthLayerId: 'shallow', cycleCount: 1 },
          { id: 'wp-2', x: 4, y: 2, action: 'sample', diveProfileId: 'thermoclineDive', targetDepthLayerId: 'thermocline', cycleCount: 1 },
          { id: 'wp-3', x: 6, y: 2, action: 'sample', diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'midwater', cycleCount: 1 }
        ]
      },
      { agentId: 'glider-2', selectedStart: { x: 1, y: 1 }, waypoints: [] }
    ]
  }, level, mission);
  return { level, mission, plan };
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function digest(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
