import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  ENVIRONMENT_STUDIO_BATHYMETRY_MODES,
  ENVIRONMENT_STUDIO_CURATED_REGION_OPTIONS,
  ENVIRONMENT_STUDIO_CURATED_REGIONS,
  bathymetryModeById,
  curatedRegionById,
  normalizeEnvironmentStudioBathymetryMode,
  normalizeEnvironmentStudioCuratedRegionSelection
} from '../../src/core/editor/EnvironmentStudioCuratedRegions.js';
import {
  buildEnvironmentStudioProject,
  createEnvironmentStudioSession
} from '../../src/core/editor/EnvironmentStudioProject.js';

const requiredRegionIds = [
  'monterey_canyon',
  'hawaii_island_slope',
  'puerto_rico_trench_shelf',
  'florida_straits',
  'gulf_shelf_canyon_segment',
  'northeast_us_shelf_break',
  'california_shelf_break',
  'alaska_fjord_shelf'
];

assert.equal(ENVIRONMENT_STUDIO_CURATED_REGION_OPTIONS[0]?.regionId, 'none', 'None is the default curated option');
assert.equal(ENVIRONMENT_STUDIO_CURATED_REGIONS.length, requiredRegionIds.length, 'curated region list has expected count');
for (const regionId of requiredRegionIds) {
  const region = curatedRegionById(regionId);
  assert.equal(region.regionId, regionId, `${regionId} exists`);
  assert.ok(region.label, `${regionId} has label`);
  assert.ok(region.shortLabel, `${regionId} has shortLabel`);
  assert.ok(region.description, `${regionId} has description`);
  assert.ok(Number.isFinite(region.bounds.westLon), `${regionId} has numeric westLon`);
  assert.ok(Number.isFinite(region.bounds.eastLon), `${regionId} has numeric eastLon`);
  assert.ok(Number.isFinite(region.bounds.southLat), `${regionId} has numeric southLat`);
  assert.ok(Number.isFinite(region.bounds.northLat), `${regionId} has numeric northLat`);
  assert.ok(region.bounds.westLon < region.bounds.eastLon, `${regionId} has ordered longitude bounds`);
  assert.ok(region.bounds.southLat < region.bounds.northLat, `${regionId} has ordered latitude bounds`);
  assert.ok(region.defaultWindowKm?.widthKm > 0, `${regionId} has default width`);
  assert.ok(region.defaultWindowKm?.heightKm > 0, `${regionId} has default height`);
  assert.ok(Array.isArray(region.expectedContext), `${regionId} has expected context`);
  assert.ok(region.bathymetryModeRecommendation, `${regionId} has bathymetry mode recommendation`);
  assert.ok(region.currentStatus, `${regionId} has current status`);
  assert.ok(region.stagingRole, `${regionId} has staging role`);
  assert.ok(Array.isArray(region.tags), `${regionId} has tags`);
  assert.ok(region.boundsConfidence, `${regionId} has bounds confidence`);
  if (regionId !== 'monterey_canyon') {
    assert.equal(region.boundsConfidence, 'initialOwnerReviewRequired', `${regionId} is explicitly owner-review seed bounds`);
    assert.match(region.currentStatus, /requestOnly|notStaged/, `${regionId} does not claim mission readiness`);
  }
}

assert.equal(curatedRegionById('monterey_canyon').currentStatus, 'stagedMissionReadyIfAvailable', 'Monterey is conditional on staged tile availability');

const realReference = bathymetryModeById('realReference');
const enhanced = bathymetryModeById('referenceEnhancedSynthetic');
const synthetic = bathymetryModeById('fullySyntheticSandbox');
assert.equal(realReference.implemented, true, 'Real Reference is current implemented path');
assert.equal(enhanced.implemented, false, 'Reference-Enhanced Synthetic is scaffold only');
assert.equal(synthetic.implemented, false, 'Fully Synthetic Sandbox selector route is scaffold only');
assert.equal(new Set(ENVIRONMENT_STUDIO_BATHYMETRY_MODES.map((mode) => mode.missionAuthority)).size, 3, 'bathymetry modes have distinct mission authorities');

const curatedSelection = normalizeEnvironmentStudioCuratedRegionSelection({
  selectedRegionId: 'hawaii_island_slope',
  selectedRegionSource: 'curatedRegion',
  boundsApplied: true,
  atlasViewportFocused: true
});
assert.equal(curatedSelection.selectedRegionLabel, 'Hawaii / Island Slope', 'selection carries curated label');
assert.equal(curatedSelection.boundsApplied, true, 'selection records bounds applied');
assert.equal(curatedSelection.atlasViewportFocused, true, 'selection records atlas focus');

const modeSelection = normalizeEnvironmentStudioBathymetryMode('referenceEnhancedSynthetic');
assert.equal(modeSelection.selectedMode, 'referenceEnhancedSynthetic', 'mode selection normalizes selected mode');
assert.equal(modeSelection.modeImplemented, false, 'mode selection preserves planned status');
assert.equal(modeSelection.missionAuthority, 'enhancedSyntheticRaster', 'mode selection exposes mission authority');

const session = createEnvironmentStudioSession({
  curatedRegion: curatedSelection,
  bathymetryMode: modeSelection
});
const project = buildEnvironmentStudioProject(session);
assert.equal(project.curatedRegion.selectedRegionId, 'hawaii_island_slope', 'project export preserves curated region');
assert.equal(project.bathymetryMode.selectedMode, 'referenceEnhancedSynthetic', 'project export preserves bathymetry mode');

const sceneSource = fs.readFileSync('src/game/phaser/scenes/EnvironmentStudioScene.js', 'utf8');
assert.match(sceneSource, /data-env-curated-region-select/, 'Environment Studio scene exposes curated region selector');
assert.match(sceneSource, /data-env-bathymetry-mode-select/, 'Environment Studio scene exposes bathymetry mode selector');
assert.match(sceneSource, /ANCHOR_ENVIRONMENT_STUDIO_DEBUG/, 'Environment Studio scene publishes debug object');
assert.doesNotMatch(sceneSource, /https?:\/\/(?:www\.)?(?:noaa|gebco)/i, 'scene does not add runtime NOAA/GEBCO fetch URLs');

console.log('smoke_environment_studio_curated_regions: ok');
