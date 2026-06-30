import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  deriveAtlasBoundaryActions,
  referenceAtlasStageActionState
} from '../../src/game/phaser/scenes/EnvironmentStudioScene.js';

const root = process.cwd();
const source = readFileSync(path.join(root, 'src/game/phaser/scenes/EnvironmentStudioScene.js'), 'utf8');

const helperStart = source.indexOf('function referenceAtlasSimplifiedConsoleHtml');
assert.ok(helperStart >= 0, 'simplified atlas console helper exists');
const helperEnd = source.indexOf('function referenceFixtureSelectorHtml', helperStart);
assert.ok(helperEnd > helperStart, 'simplified atlas console helper is bounded');
const helperSource = source.slice(helperStart, helperEnd);
const advancedStart = helperSource.indexOf('data-env-stage-section="advanced"');
assert.ok(advancedStart > 0, 'advanced stage section exists');
const defaultLeftPanelSource = helperSource.slice(0, advancedStart);

for (const requiredText of [
  'Environment Studio',
  'Select a region on the reference atlas',
  'Atlas Tools',
  'Pan / Select',
  'Draw Boundary',
  'Move / Resize',
  'Clear Boundary',
  'Reset View',
  'Focus Selected',
  'Window Presets',
  'Local Patch',
  'Regional Survey',
  'Fleet Survey',
  'Gulf Segment',
  'Basin Campaign',
  'Boundary Actions',
  'Advanced',
  'data-default-collapsed="true"'
]) {
  assert.ok(helperSource.includes(requiredText), `simplified left panel missing ${requiredText}`);
}

for (const requiredLabel of [
  'Open 3D Bathymetry Preview',
  'Continue to Mission-Ready Bathymetry',
  'Export Patch Request',
  'Export Multi-Tile Request'
]) {
  assert.ok(source.includes(requiredLabel), `Environment Studio source missing ${requiredLabel}`);
}

for (const hiddenByDefault of [
  'Dataset / manifest diagnostics',
  'Source Cells',
  'Overview Digest',
  'Fixture Count',
  'Tile Library Safety',
  'Field Artifact',
  'cell-inspector-metrics'
]) {
  assert.ok(!defaultLeftPanelSource.includes(hiddenByDefault), `${hiddenByDefault} is hidden from the default left panel`);
}

const gulfSession = {
  selectedReferenceWindow: {
    bounds: { westLon: -94, eastLon: -84, southLat: 24, northLat: 30 }
  },
  selectedReferenceAvailability: {
    available: false,
    status: 'requestOnly',
    recommendedAction: 'exportMultiTilePatchRequest'
  },
  selectedReferenceBoundaryBudget: {
    budgetStatus: 'MULTI_TILE_REQUIRED',
    patchRequestAllowed: true,
    multiTileRecommended: true,
    recommendedAction: 'exportMultiTilePatchRequest',
    estimatedColumns: 1400,
    estimatedRows: 820,
    sourceCellCount: 1148000
  }
};

const state = referenceAtlasStageActionState(gulfSession);
assert.equal(state.leftPanelSimplified, true, 'debug reports simplified left panel');
assert.deepEqual(state.visibleLeftPanelSections, ['header', 'atlas-tools', 'window-presets', 'boundary-actions', 'advanced']);
assert.equal(state.selectedRegionPreviewAction.enabled, true, 'valid large region enables preview action');
assert.equal(state.selectedRegionPreviewAction.label, 'Open 3D Bathymetry Preview');
assert.equal(state.selectedRegionMissionReadyAction.enabled, false, 'large unstaged region disables mission-ready continuation');
assert.equal(state.selectedRegionGenerationMode, 'MULTI_TILE_REQUIRED', 'large unstaged region reports multi-tile generation mode');
assert.equal(state.selectedRegionScale.operationalSelectionStatus, 'VALID', 'large selection remains valid');
assert.equal(state.selectedRegionScale.coarsePreviewAvailable, true, 'large selection has coarse preview');

const actions = deriveAtlasBoundaryActions(gulfSession);
assert.equal(actions.openCoarsePreview.enabled, true, 'preview is enabled for Gulf-scale selection');
assert.equal(actions.openCoarsePreview.label, 'Open 3D Bathymetry Preview');
assert.equal(actions.exportMultiTileRequest.enabled, true, 'multi-tile export request is enabled');
assert.equal(actions.exportMultiTileRequest.label, 'Export Multi-Tile Request');
assert.doesNotMatch(JSON.stringify({ state, actions }), /impossible/i, 'large regions are not described as impossible');

console.log('smoke_environment_studio_left_panel_simplified: ok', {
  sections: state.visibleLeftPanelSections,
  generationMode: state.selectedRegionGenerationMode,
  previewAction: state.selectedRegionPreviewAction.label
});
