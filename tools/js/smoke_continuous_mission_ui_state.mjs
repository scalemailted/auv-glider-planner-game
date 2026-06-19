import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CONTINUOUS_MISSION_UI_STATE_VERSION,
  normalizeContinuousMissionUiState,
  validateContinuousMissionUiState
} from '../../src/core/rendering/ContinuousMissionUiState.js';

const defaultState = normalizeContinuousMissionUiState({});
assert.equal(defaultState.version, CONTINUOUS_MISSION_UI_STATE_VERSION);
assert.equal(defaultState.waypointSnapMode, 'snapToCellCenters');
assert.equal(defaultState.volumeRenderMode, 'smoothedSlices');
assert.equal(defaultState.coordinateProfileId, 'legacyIntegerCellsV1');
assert.equal(defaultState.fieldSamplingProfileId, 'legacyNearestCellV1');
assert.equal(validateContinuousMissionUiState(defaultState).valid, true);

const modern = normalizeContinuousMissionUiState({
  plan: { coordinateProfileId: 'continuousGridV1' },
  ui: {
    waypointSnapMode: 'freePlacement',
    waterColumn: {
      scalarRenderMode: 'volumetricCloud',
      activeDepthLayerId: 'thermocline',
      verticalDisplayMode: 'explodedLayers',
      selectedDiveProfileId: 'thermoclineDive',
      selectedTargetDepthLayerId: 'thermocline'
    }
  },
  level: { world: { waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'surfaceOnly' } } }
});
assert.equal(modern.coordinateProfileId, 'continuousGridV1');
assert.equal(modern.waypointSnapMode, 'freePlacement');
assert.equal(modern.fieldSamplingProfileId, 'continuousTrilinearV1');
assert.equal(modern.volumeRenderMode, 'volumetricCloud');
assert.equal(modern.activeDepthLayerId, 'thermocline');
assert.equal(modern.selectedDiveProfileId, 'thermoclineDive');
assert.equal(modern.selectedTargetDepthLayerId, 'thermocline');
assert.equal(modern.boundaryFlags.usesArbitraryXYZRoutePlanning, false);
assert.equal(modern.boundaryFlags.rendererOwnsPlanning, false);
assert.equal(modern.boundaryFlags.rendererOwnsSimulation, false);
assert.equal(modern.boundaryFlags.rendererOwnsScoring, false);
assert.equal(validateContinuousMissionUiState(modern).valid, true);

const source = fs.readFileSync('src/core/rendering/ContinuousMissionUiState.js', 'utf8');
assert.equal(/from ['"]three['"]/.test(source), false, 'Continuous UI state must not import Three.js');
assert.equal(/Phaser/.test(source), false, 'Continuous UI state must not import Phaser');
assert.equal(/document\.|window\.|HTMLElement|querySelector/.test(source), false, 'Continuous UI state must not depend on DOM APIs');

console.log('smoke_continuous_mission_ui_state: ok', {
  defaultSnapMode: defaultState.waypointSnapMode,
  modernSnapMode: modern.waypointSnapMode,
  volumeMode: modern.volumeRenderMode
});