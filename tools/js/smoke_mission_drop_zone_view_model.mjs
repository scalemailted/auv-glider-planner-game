import { strict as assert } from 'node:assert';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel, validateMissionWorldRenderViewModel } from '../../src/core/rendering/MissionWorldRenderViewModel.js';

function fixtureState() {
  const level = {
    levelId: 'three-r11-fixture',
    world: { grid: { width: 6, height: 5 }, time: { dt: 1, duration: 12 } },
    zones: [{ id: 'drop_alpha', type: 'deployment', label: 'Drop Alpha', cells: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }] }],
    layers: {
      terrain: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0)),
      hazards: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0)),
      depth: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0.3)),
      currents: [],
      roi: [Array.from({ length: 5 }, (_, t) => Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => t === 0 ? 0.5 : 0.2)))[0]]
    },
    frames: [{ t: 0, roi: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0.4)), currents: [] }]
  };
  const mission = { missionId: 'three-r11-mission', agents: [{ id: 'glider_01', label: 'Glider 01', deployment: { mode: 'chooseFromZone', zoneId: 'drop_alpha', selectedStart: { x: 1, y: 1 } }, battery: 100 }] };
  const plan = { agentPlans: [{ agentId: 'glider_01', selectedStart: { x: 1, y: 1 }, waypoints: [] }], planningMarkers: [] };
  return { mode: 'planning', challengeMode: 'perfectKnowledge', level, mission, plan, selectedAgentId: 'glider_01', ui: { rendererBackend: 'threeMission3d', threeMissionCameraPreset: 'obliqueMission' } };
}

const state = fixtureState();
const input = missionWorldRenderInputFromWorkspace({ app: { state } });
const vm = buildMissionWorldRenderViewModel(input);
const validation = validateMissionWorldRenderViewModel(vm);
assert.equal(validation.valid, true);
assert.equal(vm.dropZones.length, 1);
assert.equal(vm.dropZones[0].id, "drop_alpha");
assert.equal(vm.dropZones[0].validCellCount, 3);
assert.deepEqual(vm.dropZones[0].selectedCell, { x: 1, y: 1 });
assert.equal(vm.dropZones[0].source, "DeploymentZones.getDeploymentZonesForAgent");
assert.equal(vm.boundaryFlags.includesHiddenTruth, false);
console.log('Mission drop-zone view model smoke passed.');