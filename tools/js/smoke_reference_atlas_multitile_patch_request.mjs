import assert from 'node:assert/strict';
import { canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import { estimateReferenceAtlasBoundaryBudget } from '../../src/core/editor/ReferenceAtlasBoundaryBudget.js';
import { createReferenceBathymetryMultiTilePatchRequest } from '../../src/core/editor/ReferenceBathymetryAtlas.js';
import { loadReferenceAtlasFixtureContext } from './reference_atlas_test_helpers.mjs';

const { atlas } = await loadReferenceAtlasFixtureContext();

const gulfBounds = {
  westLon: -94,
  eastLon: -84,
  southLat: 24,
  northLat: 30
};
const generationBudget = estimateReferenceAtlasBoundaryBudget(gulfBounds, { atlas, sourceResolutionArcSeconds: 15 });
assert.equal(generationBudget.budgetStatus, 'MULTI_TILE_REQUIRED', 'fixture uses a multi-tile Gulf-scale budget');

const request = createReferenceBathymetryMultiTilePatchRequest(gulfBounds, atlas, {
  generationBudget,
  operationalWindow: generationBudget.operationalWindow,
  suggestedFixturePrefix: 'gulf_segment_multitile_smoke'
});

assert.equal(request.artifactType, 'anchor.reference-bathymetry-multitile-patch-request', 'artifact type is multi-tile request');
assert.equal(request.sourceDataset, 'ETOPO_2022', 'request records compact ETOPO source identity');
assert.equal(request.requestedResolution, '15 arc-second', 'request records requested resolution');
assert.equal(request.operationalWindow.scaleClass, 'gulfScale', 'request preserves operational window');
assert.equal(request.generationBudget.budgetStatus, 'MULTI_TILE_REQUIRED', 'request preserves generation budget');
assert.equal(request.generationBudget.generationAllowed, false, 'request records live-generation disabled');
assert.equal(request.tilePlan.tileCount, request.tilePlan.tiles.length, 'tile count matches tiles');
assert.ok(request.tilePlan.tileCount > 1, 'Gulf request has multiple tiles');
assert.equal(request.suggestedTileBounds.length, request.tilePlan.tileCount, 'suggested tile bounds align with tile plan');
assert.ok(request.downloadCommands.length === request.tilePlan.tileCount, 'download commands align with tile plan');
assert.ok(request.preprocessCommands.length >= 1, 'preprocess command is present');
assert.match(request.requestDigest, /^fnv1a32:/, 'request digest is present');
assert.equal(request.browserRunsPython, false, 'browser does not run Python');
assert.equal(request.rawExternalDataPathIncluded, false, 'request excludes raw external data paths');
assert.equal(request.localAbsolutePathsIncluded, false, 'request excludes local absolute paths');
assert.equal(request.claimBoundary.hiddenTruthExposed, false, 'request exposes no hidden truth');
assert.equal(request.claimBoundary.currentField4DGenerated, false, 'request does not claim generated currents');
assert.equal(request.claimBoundary.scalarField4DGenerated, false, 'request does not claim generated scalars');
assert.equal(request.claimBoundary.operationalOceanForecast, false, 'request does not claim an operational forecast');

const publicText = canonicalJsonStringify(request);
assert.doesNotMatch(publicText, /external_data|[A-Z]:\\\\|\/Users\//, 'request has no raw/local paths');
assert.doesNotMatch(publicText, /"hiddenTruthExposed"\s*:\s*true/, 'request has no hidden truth true flag');

console.log('smoke_reference_atlas_multitile_patch_request: ok', {
  tileCount: request.tilePlan.tileCount,
  scaleClass: request.operationalWindow.scaleClass,
  digest: request.requestDigest
});
