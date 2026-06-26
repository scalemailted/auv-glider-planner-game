import assert from 'node:assert/strict';
import { canonicalJsonDigest, canonicalJsonStringify } from '../../packages/codecs/src/index.js';
import {
  ENVIRONMENT_STUDIO_DEPENDENCY_STATE,
  buildEnvironmentStudioValidationReport,
  createEnvironmentStudioDependencyGraph,
  markEnvironmentStudioDependencyChange,
  normalizeBathymetryArchetypeSpec,
  normalizeBathymetryTileManifest,
  normalizeEnvironmentStudioDomainSpec,
  normalizeTileMosaicManifest,
  validateBathymetryTileManifest,
  validateCodecFriendlyJson,
  validateEdgeProfiles,
  validateEnvironmentStudioDomainSpec,
  validateNoHiddenTruth,
  validateTileMosaicManifest,
  validateTileSeams
} from '../../src/core/editor/EnvironmentStudioContracts.js';

const domain = normalizeEnvironmentStudioDomainSpec({
  id: 'env-studio-smoke-domain',
  horizontal: { widthMeters: 1000, heightMeters: 500, cellSizeMeters: 100 },
  vertical: {
    maxDepthMeters: 150,
    depthLayers: [
      { id: 'surface', depthMeters: 0 },
      { id: 'thermocline', depthMeters: 35 },
      { id: 'deep', depthMeters: 150 }
    ]
  },
  time: { durationSeconds: 600, dtSeconds: 60 }
});
assert.equal(domain.horizontal.columns, 11, 'columns derive from width and cell size');
assert.equal(domain.horizontal.rows, 6, 'rows derive from height and cell size');
assert.equal(domain.horizontal.cellCount, 66, 'cell count derives from rows and columns');
assert.equal(validateEnvironmentStudioDomainSpec(domain).valid, true);
assert.equal(domain.claimBoundary.calibratedOceanProduct, false);
assert.equal(domain.claimBoundary.operationalForecast, false);

const tooLargeDomain = validateEnvironmentStudioDomainSpec({
  horizontal: { widthMeters: 100000, heightMeters: 100000, cellSizeMeters: 10 }
});
assert.equal(tooLargeDomain.valid, false, 'domain cell-count limit rejects browser-hostile grids');
assert.match(tooLargeDomain.errors.join('\n'), /exceeds maxDomainCellCount/);

const archetype = normalizeBathymetryArchetypeSpec({
  id: 'coastalShelf',
  domainSpecDigest: domain.domainSpecDigest,
  parameters: { shelfSlope: 0.03, roughness: 0.2 }
});
assert.equal(archetype.domainSpecDigest, domain.domainSpecDigest);
assert.equal(archetype.claimBoundary.certifiedForNavigation, false);

const tileA = normalizeBathymetryTileManifest({
  id: 'tile-a',
  domainSpecDigest: domain.domainSpecDigest,
  archetypeSpecDigest: archetype.archetypeSpecDigest,
  tileCoordinate: { row: 0, column: 0 },
  rows: 3,
  columns: 3,
  edgeProfiles: {
    top: [11, 12, 13],
    bottom: [20, 21, 22],
    left: [11, 15, 20],
    right: [13, 17, 22]
  },
  editProvenance: {
    deterministicSeed: 'env-studio-smoke',
    operations: [{ id: 'raise-canyon-lip', type: 'heightDelta', target: 'edge:right' }]
  }
});
const tileB = normalizeBathymetryTileManifest({
  id: 'tile-b',
  domainSpecDigest: domain.domainSpecDigest,
  archetypeSpecDigest: archetype.archetypeSpecDigest,
  tileCoordinate: { row: 0, column: 1 },
  rows: 3,
  columns: 3,
  edgeProfiles: {
    top: [13.2, 14, 15],
    bottom: [22.1, 23, 24],
    left: [13.3, 17.4, 22.2],
    right: [15, 19, 24]
  }
});
assert.equal(validateBathymetryTileManifest(tileA).valid, true);
assert.equal(tileA.bathymetrySource.containsHiddenTruth, false);
assert.equal(tileA.bathymetrySource.publicVisibility, 'publicScenario');

const badEdge = validateEdgeProfiles({ top: [1, 2], bottom: [1, 2, 3], left: [1, 2, 3], right: [1, 2, 3] }, { rows: 3, columns: 3 });
assert.equal(badEdge.valid, false, 'edge profile validation rejects wrong-length edges');

const tooLargeTile = validateBathymetryTileManifest({ rows: 200, columns: 200 });
assert.equal(tooLargeTile.valid, false, 'tile manifest validation rejects excessive cells');

const hiddenTile = validateBathymetryTileManifest({ bathymetrySource: { containsHiddenTruth: true } });
assert.equal(hiddenTile.valid, false, 'tile manifest validation rejects hidden-truth flags');

const mosaic = normalizeTileMosaicManifest({
  id: 'two-tile-mosaic',
  domainSpecDigest: domain.domainSpecDigest,
  tileGrid: { rows: 1, columns: 2 },
  tiles: [tileA, tileB],
  seamPolicy: { maxDepthDeltaMeters: 1 }
});
assert.equal(validateTileMosaicManifest(mosaic).valid, true);
assert.equal(mosaic.tileGrid.tileCount, 2);

const seamReport = validateTileSeams({
  tileManifests: [tileA, tileB],
  seamPolicy: { maxDepthDeltaMeters: 1 }
});
assert.equal(seamReport.valid, true, 'seam helper accepts compatible adjacent edges');
assert.equal(seamReport.seamCount, 1);

const badSeam = validateTileSeams({
  tileManifests: [
    tileA,
    normalizeBathymetryTileManifest({
      ...tileB,
      edgeProfiles: { ...tileB.edgeProfiles, left: [99, 99, 99] }
    })
  ],
  seamPolicy: { maxDepthDeltaMeters: 1 }
});
assert.equal(badSeam.valid, false, 'seam helper rejects excessive edge discontinuity');

const graph = createEnvironmentStudioDependencyGraph();
assert.equal(graph.nodes.domainSpec.state, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
assert.equal(graph.nodes.currentArtifact.state, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED);
const editedGraph = markEnvironmentStudioDependencyChange(graph, 'BATHYMETRY_EDITED');
assert.equal(editedGraph.nodes.bathymetryTiles.state, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
assert.equal(editedGraph.nodes.tileMosaic.state, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.STALE);
assert.equal(editedGraph.nodes.currentArtifact.state, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION);

const report = buildEnvironmentStudioValidationReport({
  id: 'env-studio-smoke-validation',
  domainSpec: domain,
  tileManifests: [tileA, tileB],
  mosaicManifest: mosaic,
  seamReport,
  dependencyGraph: editedGraph,
  publicArtifacts: { domain, archetype, mosaic }
});
assert.equal(report.valid, true);
assert.equal(report.summary.hiddenTruthIncluded, false);
assert.ok(/^fnv1a32:/.test(report.validationReportDigest), 'validation report has a canonical digest');
const { validationReportDigest, ...reportPayload } = JSON.parse(canonicalJsonStringify(report));
assert.equal(canonicalJsonDigest(reportPayload), validationReportDigest);

const hiddenReport = validateNoHiddenTruth({ type: 'publicArtifact', T_hiddenTruth: [[1, 2, 3]] });
assert.equal(hiddenReport.valid, false, 'hidden truth scan rejects direct hidden truth arrays');
const codecReport = validateCodecFriendlyJson({ b: 2, a: 1 });
assert.equal(codecReport.valid, true);
assert.equal(codecReport.digest, canonicalJsonDigest({ a: 1, b: 2 }));

console.log('smoke_environment_studio_contracts: ok', {
  domainDigest: domain.domainSpecDigest,
  tileDigest: tileA.tileDigest,
  mosaicDigest: mosaic.mosaicDigest,
  reportDigest: report.validationReportDigest
});
