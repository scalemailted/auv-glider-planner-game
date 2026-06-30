import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createReferenceBathymetryAtlas,
  referenceFixtureAvailabilityForBounds
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  estimateReferenceAtlasBoundaryBudget,
  referenceAtlasBoundsForOperationalPreset
} from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES,
  referenceAtlasUpdateBoundsForDrag
} from '../../src/core/editor/ReferenceAtlasInteractionModel.js';

const ROOT = process.cwd();
const atlas = await loadReferenceAtlas();
const initial = {
  westLon: -123,
  eastLon: -122,
  southLat: 36,
  northLat: 37
};

const moved = referenceAtlasUpdateBoundsForDrag({
  initialBounds: initial,
  dragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move,
  startLonLat: { lon: -122.5, lat: 36.5 },
  currentLonLat: { lon: -121.75, lat: 36.9 },
  atlas
});
assertSpanPreserved(initial, moved.bounds, 'move preserves width/height');
assert.ok(centerLon(moved.bounds) > centerLon(initial), 'move changes center longitude');
assert.ok(centerLat(moved.bounds) > centerLat(initial), 'move changes center latitude');
assert.deepEqual(moved.changedSides, ['westLon', 'eastLon', 'southLat', 'northLat'], 'move reports all sides changed');

const clamped = referenceAtlasUpdateBoundsForDrag({
  initialBounds: { westLon: 178, eastLon: 180, southLat: 80, northLat: 89 },
  dragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move,
  startLonLat: { lon: 179, lat: 84 },
  currentLonLat: { lon: 220, lat: 110 },
  atlas
});
assert.equal(clamped.bounds.eastLon, 180, 'move clamps east world extent');
assert.equal(clamped.bounds.northLat, 90, 'move clamps north world extent');

assertResize(
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeWest,
  { lon: -123.5, lat: 36.5 },
  ['westLon'],
  ['eastLon'],
  'west edge changes westLon only'
);
assertResize(
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeEast,
  { lon: -121.5, lat: 36.5 },
  ['eastLon'],
  ['westLon'],
  'east edge changes eastLon only'
);
assertResize(
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorth,
  { lon: -122.5, lat: 37.5 },
  ['northLat'],
  ['southLat'],
  'north edge changes northLat only'
);
assertResize(
  REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeSouth,
  { lon: -122.5, lat: 35.5 },
  ['southLat'],
  ['northLat'],
  'south edge changes southLat only'
);

const corner = referenceAtlasUpdateBoundsForDrag({
  initialBounds: initial,
  dragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeNorthEast,
  currentLonLat: { lon: -121.25, lat: 37.75 },
  atlas,
  minLonSpanDegrees: 0.05,
  minLatSpanDegrees: 0.05
});
assert.deepEqual(corner.changedSides, ['eastLon', 'northLat'], 'corner changes both connected sides');
assert.deepEqual(corner.fixedSides, ['westLon', 'southLat'], 'corner preserves opposite sides');
assert.equal(corner.lastResizePreservedOppositeEdge, true, 'corner resize preserves opposite sides');

const minSize = referenceAtlasUpdateBoundsForDrag({
  initialBounds: initial,
  dragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.resizeEast,
  currentLonLat: { lon: -122.99, lat: 36.5 },
  atlas,
  minLonSpanDegrees: 0.2,
  minLatSpanDegrees: 0.2
});
assert.ok(minSize.bounds.eastLon - minSize.bounds.westLon >= 0.199, 'minimum width enforced');

const localBudget = estimateReferenceAtlasBoundaryBudget(initial, { atlas });
const largeRegionalBounds = referenceAtlasBoundsForOperationalPreset({ centerLon: -122.25, centerLat: 36.6 }, 'regionalSurvey');
const largeRegionalBudget = estimateReferenceAtlasBoundaryBudget(largeRegionalBounds, { atlas });
const gulfBounds = { westLon: -96, eastLon: -83, southLat: 23, northLat: 31 };
const gulfBudget = estimateReferenceAtlasBoundaryBudget(gulfBounds, { atlas });

assert.notEqual(localBudget.budgetStatus, gulfBudget.budgetStatus, 'after resize, budget status can update');
assert.equal(gulfBudget.operationalWindow.validSelection, true, 'Gulf-scale window remains valid');
assert.equal(gulfBudget.generationAllowed, false, 'Gulf-scale live generation is disabled');
assert.equal(gulfBudget.patchRequestAllowed, true, 'Gulf-scale patch request is allowed');
assert.equal(gulfBudget.multiTileRecommended, true, 'Gulf-scale multi-tile request is recommended');
assert.equal(gulfBudget.recommendedAction, 'exportMultiTilePatchRequest', 'Gulf recommends multi-tile request');

const montereyFixture = atlas.referenceFixtures.find((fixture) => fixture.fixtureId === 'monterey_canyon_15s')
  ?? atlas.referenceFixtures.find((fixture) => fixture.role === 'missionReadyPatch');
assert.ok(montereyFixture, 'Monterey mission-ready fixture exists');
const montereyAvailability = referenceFixtureAvailabilityForBounds(atlas, montereyFixture.bounds);
assert.equal(montereyAvailability.available, true, 'Monterey remains loadable when matched');
assert.equal(montereyAvailability.matchedFixtureId, 'monterey_canyon_15s', 'Monterey matched fixture id');
assert.equal(montereyAvailability.recommendedAction, 'loadMissionPatch', 'Monterey recommends loadMissionPatch');

const movedMonterey = referenceAtlasUpdateBoundsForDrag({
  initialBounds: montereyFixture.bounds,
  dragMode: REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move,
  startLonLat: {
    lon: (montereyFixture.bounds.westLon + montereyFixture.bounds.eastLon) / 2,
    lat: (montereyFixture.bounds.southLat + montereyFixture.bounds.northLat) / 2
  },
  currentLonLat: {
    lon: (montereyFixture.bounds.westLon + montereyFixture.bounds.eastLon) / 2 + 40,
    lat: (montereyFixture.bounds.southLat + montereyFixture.bounds.northLat) / 2
  },
  atlas
});
const movedAvailability = referenceFixtureAvailabilityForBounds(atlas, movedMonterey.bounds);
assert.notEqual(movedAvailability.status, montereyAvailability.status, 'after move, patch availability updates');

for (const safety of [moved, corner, montereyAvailability, movedAvailability]) {
  assert.equal(safety.hiddenTruthExposed, false, 'no hidden truth exposed');
  if (Object.hasOwn(safety, 'rawExternalDataPathExposed')) assert.equal(safety.rawExternalDataPathExposed, false, 'no raw external data path exposed');
}

console.log('smoke_reference_atlas_rectangle_editor: ok', {
  movedBounds: moved.bounds,
  localBudgetStatus: localBudget.budgetStatus,
  largeRegionalBudgetStatus: largeRegionalBudget.budgetStatus,
  gulfBudgetStatus: gulfBudget.budgetStatus,
  montereyFixtureId: montereyAvailability.matchedFixtureId
});

function assertResize(dragMode, pointer, changedSides, fixedSides, message) {
  const result = referenceAtlasUpdateBoundsForDrag({
    initialBounds: initial,
    dragMode,
    currentLonLat: pointer,
    atlas,
    minLonSpanDegrees: 0.05,
    minLatSpanDegrees: 0.05
  });
  assert.deepEqual(result.changedSides, changedSides, `${message}: changed sides`);
  assert.deepEqual(result.fixedSides, fixedSides, `${message}: fixed sides`);
  assert.equal(result.lastResizePreservedOppositeEdge, true, `${message}: opposite side preserved`);
  for (const side of fixedSides) assert.equal(result.bounds[side], initial[side], `${message}: ${side} fixed`);
}

function assertSpanPreserved(before, after, message) {
  assert.equal(round(after.eastLon - after.westLon), round(before.eastLon - before.westLon), `${message}: longitude span`);
  assert.equal(round(after.northLat - after.southLat), round(before.northLat - before.southLat), `${message}: latitude span`);
}

function centerLon(bounds) {
  return (Number(bounds.westLon) + Number(bounds.eastLon)) / 2;
}

function centerLat(bounds) {
  return (Number(bounds.southLat) + Number(bounds.northLat)) / 2;
}

function round(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

async function loadReferenceAtlas() {
  const manifest = await readJson('assets/reference_bathymetry/manifest.json');
  const overviewArtifact = await readJson(manifest.overview.overviewPath);
  const overviewRasterArtifact = await readJson(overviewArtifact.previewPath ?? manifest.overview.previewPath);
  const referenceFixtures = await Promise.all(manifest.fixtures.map(async (fixture) => ({
    ...fixture,
    rasterArtifact: await readJson(fixture.rasterPath)
  })));
  return createReferenceBathymetryAtlas({
    manifest,
    overviewArtifact,
    overviewRasterArtifact,
    referenceFixtures
  });
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, relativePath.replaceAll('/', path.sep)), 'utf8'));
}
