import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  createReferenceBathymetryAtlas,
  createReferenceBathymetryMultiTilePatchRequest,
  REFERENCE_BATHYMETRY_MULTITILE_PATCH_REQUEST_TYPE
} from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import {
  estimateReferenceAtlasBoundaryBudget
} from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import {
  findTileSetsForBounds,
  normalizeReferenceTileLibraryManifest,
  REFERENCE_BATHYMETRY_MULTITILE_TILE_SET_TYPE
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';
import {
  referenceAtlasStageActionState
} from '../../src/game/phaser/scenes/EnvironmentStudioScene.js';

const ROOT = process.cwd();
const DEMO_BOUNDS = Object.freeze({
  westLon: -90.5,
  eastLon: -83.8,
  southLat: 26.7,
  northLat: 30.7
});
const EXPECTED_SOURCE_TILES = ['N45W105', 'N45W090', 'N30W105', 'N30W090'];

const library = normalizeReferenceTileLibraryManifest(
  await readJson('assets/reference_bathymetry/tile-library-manifest.json')
);
const demo = library.tileSets.find((tileSet) => tileSet.tileSetId === 'gulf_segment_demo_15s');

assert.ok(demo, 'gulf_segment_demo_15s request-only tile set is registered');
assert.equal(demo.artifactType, REFERENCE_BATHYMETRY_MULTITILE_TILE_SET_TYPE, 'demo uses multi-tile tile-set contract');
assert.equal(demo.staged, false, 'demo is not staged as browser mission-ready data');
assert.equal(demo.coverageRole, 'requestOnly', 'demo remains request-only');
assert.equal(demo.rasterTiles, null, 'demo has no staged raster tile payload');
assert.equal(demo.tileGrid?.tileCount, 4, 'demo records four required source tiles');
assert.equal(demo.tileGrid?.maxTileRows, 512, 'demo records browser-safe per-tile row cap');
assert.equal(demo.tileGrid?.maxTileColumns, 512, 'demo records browser-safe per-tile column cap');
assert.equal(demo.claimBoundary?.browserDownloadsPublicSourceData, false, 'browser source downloads disabled');
assert.equal(demo.claimBoundary?.hiddenTruthExposed, false, 'no hidden truth in demo metadata');

const sourceTileIds = (demo.requiredSourceTiles ?? []).map((tile) => tile.tileId).sort();
assert.deepEqual(sourceTileIds, [...EXPECTED_SOURCE_TILES].sort(), 'demo crosses the expected 30N source-tile boundary');

const stagedMatches = findTileSetsForBounds(DEMO_BOUNDS, library);
assert.equal(stagedMatches.length, 0, 'demo bounds have no staged browser tile set');
const requestMatches = findTileSetsForBounds(DEMO_BOUNDS, library, { includeRequestOnly: true });
assert.ok(requestMatches.some((tileSet) => tileSet.tileSetId === 'gulf_segment_demo_15s'), 'demo request-only match is discoverable');
assert.ok(requestMatches.every((tileSet) => tileSet.coverageRole === 'requestOnly'), 'demo matches are request-only');

const budget = estimateReferenceAtlasBoundaryBudget(DEMO_BOUNDS, { sourceResolutionArcSeconds: 15 });
assert.equal(budget.operationalWindow.validSelection, true, 'demo operational area is valid');
assert.equal(budget.budgetStatus, 'MULTI_TILE_REQUIRED', 'demo requires multi-tile staging');
assert.equal(budget.patchRequestAllowed, true, 'demo can export a staging request');
assert.equal(budget.generationAllowed, false, 'demo does not allow live browser generation');
assert.ok(budget.estimatedColumns >= 1608 && budget.estimatedColumns <= 1609, 'demo dry-run column estimate is stable within rounding tolerance');
assert.equal(budget.estimatedRows, 960, 'demo dry-run row estimate is stable');

const actionState = referenceAtlasStageActionState({
  selectedReferenceWindow: { bounds: DEMO_BOUNDS },
  selectedReferenceAvailability: {
    available: false,
    status: 'requestOnly',
    recommendedAction: 'exportMultiTilePatchRequest'
  },
  selectedReferenceBoundaryBudget: budget
});
assert.equal(actionState.selectedRegionScale.operationalSelectionStatus, 'VALID', 'action state treats demo as valid');
assert.equal(actionState.selectedRegionScale.generationBudgetStatus, 'MULTI_TILE_REQUIRED', 'action state exposes generation budget');
assert.equal(actionState.openCoarsePreviewEnabled, true, 'coarse preview is enabled for demo');
assert.equal(actionState.continueToBathymetryEnabled, false, 'mission-ready regional launch remains disabled');
assert.equal(actionState.exportMultiTileRequestEnabled, true, 'multi-tile request export remains enabled');
assert.equal(actionState.loadMissionPatchEnabled, false, 'request-only region cannot load as mission patch');
assert.equal(actionState.selectedRegionNextAction, 'exportMultiTilePatchRequest', 'request export is the primary next action');

const atlas = createReferenceBathymetryAtlas({
  manifest: await readJson('assets/reference_bathymetry/manifest.json')
});
const request = createReferenceBathymetryMultiTilePatchRequest(DEMO_BOUNDS, atlas, {
  generationBudget: budget,
  suggestedFixturePrefix: 'gulf_segment_demo_15s'
});
assert.equal(request.artifactType, REFERENCE_BATHYMETRY_MULTITILE_PATCH_REQUEST_TYPE, 'request artifact type');
assert.equal(request.browserRunsPython, false, 'browser request does not run Python');
assert.equal(request.claimBoundary?.multiTileRequestOnly, true, 'request is explicit request-only metadata');
assert.equal(request.claimBoundary?.bathymetryGenerated, false, 'request does not claim generated bathymetry');
assert.equal(request.claimBoundary?.currentField4DGenerated, false, 'request does not claim generated currents');
assert.equal(request.claimBoundary?.scalarField4DGenerated, false, 'request does not claim generated scalars');
assert.equal(request.claimBoundary?.hiddenTruthExposed, false, 'request hides truth');
assert.ok(Number(request.tilePlan?.tileCount ?? 0) > 1, 'request contains multiple staging subtiles');
assert.match(request.requestDigest ?? '', /^fnv1a32:/, 'request has stable digest');
assertNoPublicLeak({ library, demo, request });

console.log('smoke_multitile_operational_area_contract: ok', {
  libraryDigest: library.digest,
  demoTileSetId: demo.tileSetId,
  sourceTileIds,
  budgetStatus: budget.budgetStatus,
  estimatedColumns: budget.estimatedColumns,
  estimatedRows: budget.estimatedRows,
  requestDigest: request.requestDigest
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, String(relativePath).replaceAll('/', path.sep)), 'utf8'));
}

function assertNoPublicLeak(value) {
  const text = JSON.stringify(value ?? {});
  assert.doesNotMatch(text, /T_hiddenTruth|rawOracleTensor|oracleState/i, 'public metadata must not expose hidden truth markers');
  assert.doesNotMatch(text, /"hiddenTruth"\s*:\s*(?!false|null)/i, 'public metadata must not expose hidden truth payloads');
  assert.doesNotMatch(text, /external_data[\\/]/i, 'public metadata must not expose raw external_data paths');
  assert.doesNotMatch(text, /[A-Za-z]:\\/i, 'public metadata must not expose local absolute paths');
}
