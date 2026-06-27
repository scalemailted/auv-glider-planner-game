import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createSyntheticWorldMap,
  syntheticWorldViewportVisualMetrics
} from '../../src/core/editor/SyntheticWorldMap.js';

const REVIEW_DIR = path.resolve('test-results', 'env-world-r1a-owner-review');
const SUMMARY_PATH = path.join(REVIEW_DIR, 'qa-summary.json');
const REQUIRED_SCREENSHOTS = [
  '01-world-default.png',
  '02-world-pan.png',
  '03-world-zoomed-out.png',
  '04-world-layer-bathymetry.png',
  '05-world-layer-flow.png',
  '06-boundary-selected.png',
  '07-regional-bathymetry-generated.png'
];

try {
  const summary = JSON.parse(await fs.readFile(SUMMARY_PATH, 'utf8'));
  for (const filename of REQUIRED_SCREENSHOTS) {
    const stat = await fs.stat(path.join(REVIEW_DIR, filename));
    assert.ok(stat.size > 2048, `${filename} is missing or too small for owner review`);
  }

  assert.match(String(summary.worldDigest ?? ''), /^fnv1a32:/, 'worldDigest must be populated');
  assert.ok(String(summary.worldStyle ?? '').length > 0, 'worldStyle must be populated');
  assert.ok(String(summary.worldSeed ?? '').length > 0, 'worldSeed must be populated');
  assert.ok(Number(summary.viewportWorldFraction) > 0, 'viewportWorldFraction must be positive');
  assert.ok(Number(summary.panDelta) > 0, 'panDelta must prove panning changed the viewport');
  assert.notEqual(Number(summary.zoomStart), Number(summary.zoomEnd), 'zoomStart and zoomEnd must differ');
  assert.ok(Number(summary.visibleLandmassCount) + Number(summary.visibleIslandCount) > 0, 'world must show landmass or island context');
  assert.ok(Number(summary.visibleOpenOceanFraction) > 0.18, 'world must show open-ocean context');
  assert.ok(Number(summary.visibleCoastlineComplexity) > 0.01, 'world must show nontrivial coastline structure');
  assert.ok(Number(summary.selectedWindowAreaFractionOfWorld) > 0, 'selected window area must be populated');
  assert.ok(Number(summary.selectedWindowAreaFractionOfWorld) < 0.15, 'selected window must remain a regional subset of the world');
  assert.match(String(summary.selectedWindowDigest ?? ''), /^fnv1a32:/, 'selectedWindowDigest must be populated');
  assert.ok(Number(summary.sourceGridShape?.columns) > 0, 'sourceGridShape.columns must be populated');
  assert.ok(Number(summary.sourceGridShape?.rows) > 0, 'sourceGridShape.rows must be populated');
  assert.ok(String(summary.bathymetryArtifactDigest ?? '').includes(':'), 'bathymetryArtifactDigest must be populated');
  assert.equal(summary.primaryLeftPanelForbiddenControlCount, 0, 'Stage 1 primary left panel contains forbidden controls');
  assert.equal(summary.symbolicAtlasShapeCount, 0, 'symbolic atlas DOM shapes must not be present in the Stage 1 viewport');
  assert.equal(summary.visibleCellGridDefault, false, 'default world viewport must not expose a visible DOM cell grid');
  assert.equal(summary.hiddenTruthExposed, false, 'hidden truth must not be exposed');
  assert.equal(summary.simulationChanged, false, 'Environment Studio must not change simulation behavior');
  assert.equal(summary.scoringChanged, false, 'Environment Studio must not change scoring behavior');

  const reproduced = createSyntheticWorldMap({
    style: summary.worldStyle,
    seed: summary.worldSeed,
    generatorParameters: summary.worldGeneratorParameters
  });
  const repeat = createSyntheticWorldMap({
    style: summary.worldStyle,
    seed: summary.worldSeed,
    generatorParameters: summary.worldGeneratorParameters
  });
  const changed = createSyntheticWorldMap({
    style: summary.worldStyle,
    seed: `${summary.worldSeed}:changed`,
    generatorParameters: summary.worldGeneratorParameters
  });
  assert.equal(reproduced.worldDigest, summary.worldDigest, 'qa-summary worldDigest must reproduce from saved style/seed/parameters');
  assert.equal(reproduced.worldDigest, repeat.worldDigest, 'same seed/style/parameters must reproduce the world digest');
  assert.notEqual(reproduced.worldDigest, changed.worldDigest, 'different seed must change the world digest');
  assert.equal(reproduced.claimBoundary.hiddenTruthExposed, false, 'world artifact must not expose hidden truth');
  assert.equal(reproduced.claimBoundary.realEarthMap, false, 'world artifact must not claim real Earth');
  assert.equal(reproduced.claimBoundary.operationalForecast, false, 'world artifact must not claim operational forecast');
  assert.equal(reproduced.claimBoundary.calibratedOceanProduct, false, 'world artifact must not claim calibrated ocean product');
  assert.equal(reproduced.provenance.rawNoiseOnly, false, 'world artifact must not be raw-noise-only');

  const metrics = syntheticWorldViewportVisualMetrics(reproduced, {
    layer: 'bathymetryContext',
    zoom: 1,
    panX: 0,
    panY: 0
  });
  assert.ok(metrics.visibleLandmassCount + metrics.visibleIslandCount > 0, 'pure viewport metrics must detect land or islands');
  assert.ok(metrics.visibleOpenOceanFraction > 0.18, 'pure viewport metrics must detect open ocean');
  assert.equal(metrics.visibleCellGridDefault, false, 'pure viewport metrics must not imply a DOM cell grid');
  assert.equal(metrics.symbolicAtlasShapeCount, 0, 'pure viewport metrics must not imply symbolic atlas shapes');

  console.log('audit_env_world_r1a_visual_acceptance: ok', {
    worldDigest: summary.worldDigest,
    worldStyle: summary.worldStyle,
    selectedWindowDigest: summary.selectedWindowDigest,
    bathymetryArtifactDigest: summary.bathymetryArtifactDigest,
    screenshots: REQUIRED_SCREENSHOTS.length
  });
} catch (error) {
  console.error('ENV_WORLD_R1A_VISUAL_ACCEPTANCE_FAIL', error?.message ?? error);
  process.exit(1);
}
