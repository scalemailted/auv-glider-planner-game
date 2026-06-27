import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createSyntheticGlobeWorld,
  syntheticGlobeViewportVisualMetrics
} from '../../src/core/editor/SyntheticGlobeWorld.js';

const REVIEW_DIR = path.resolve('test-results', 'env-globe-r1-owner-review');
const SUMMARY_PATH = path.join(REVIEW_DIR, 'qa-summary.json');
const REQUIRED_SCREENSHOTS = [
  '01-globe-default.png',
  '02-globe-rotated.png',
  '03-globe-zoomed.png',
  '04-globe-layer-bathymetry.png',
  '05-globe-layer-flow.png',
  '06-globe-region-selected.png',
  '07-regional-bathymetry-generated.png'
];

try {
  const summary = JSON.parse(await fs.readFile(SUMMARY_PATH, 'utf8'));
  for (const filename of REQUIRED_SCREENSHOTS) {
    const stat = await fs.stat(path.join(REVIEW_DIR, filename));
    assert.ok(stat.size > 2048, `${filename} is missing or too small for owner review`);
  }

  assert.equal(summary.globeRendered, true, 'globeRendered must be true');
  assert.equal(summary.sphereVisible, true, 'sphereVisible must be true');
  assert.equal(summary.flatMapPrimaryView, false, 'primary view must not be a flat map');
  assert.equal(summary.pixelGridPrimaryView, false, 'primary view must not be pixel-grid art');
  assert.ok(Number(summary.canonicalWorldResolution?.width) >= 2048, 'canonical world width must be at least 2048');
  assert.ok(Number(summary.canonicalWorldResolution?.height) >= 1024, 'canonical world height must be at least 1024');
  assert.ok(Number(summary.displayTextureResolution?.width) > 0, 'display texture width must be populated');
  assert.ok(Number(summary.displayTextureResolution?.height) > 0, 'display texture height must be populated');
  assert.match(String(summary.worldDigest ?? ''), /^fnv1a32:/, 'worldDigest must be populated');
  assert.ok(String(summary.worldStyle ?? '').length > 0, 'worldStyle must be populated');
  assert.ok(String(summary.worldSeed ?? '').length > 0, 'worldSeed must be populated');
  assert.notEqual(Number(summary.rotationStart), Number(summary.rotationEnd), 'rotationStart and rotationEnd must differ');
  assert.notEqual(Number(summary.zoomStart), Number(summary.zoomEnd), 'zoomStart and zoomEnd must differ');
  assert.ok(Number(summary.selectedWindowAreaFractionOfGlobe) > 0, 'selected window area must be populated');
  assert.ok(Number(summary.selectedWindowAreaFractionOfGlobe) < 0.05, 'selected globe region must stay small');
  assert.match(String(summary.selectedWindowDigest ?? ''), /^fnv1a32:/, 'selectedWindowDigest must be populated');
  assert.ok(Number(summary.visibleLandFraction) > 0.02, 'globe must show land context');
  assert.ok(Number(summary.visibleOceanFraction) > 0.18, 'globe must show ocean context');
  assert.ok(Number(summary.visibleIslandCount) > 0, 'globe must show island or seamount context');
  assert.equal(summary.forbiddenPrimaryControlCount, 0, 'Stage 1 primary left panel contains forbidden controls');
  assert.equal(summary.symbolicAtlasShapeCount, 0, 'symbolic atlas DOM shapes must not be present in the Stage 1 viewport');
  assert.ok(String(summary.bathymetryArtifactDigest ?? '').includes(':'), 'bathymetryArtifactDigest must be populated');
  assert.equal(Number(summary.rendererCleanup?.activeRendererCount), 0, 'renderer cleanup must leave no active renderers');
  assert.equal(Number(summary.rendererCleanup?.activeRafCount), 0, 'renderer cleanup must leave no active RAF');
  assert.equal(Number(summary.rendererCleanup?.activeCanvasCount), 0, 'renderer cleanup must leave no active canvases');
  assert.equal(summary.hiddenTruthExposed, false, 'hidden truth must not be exposed');
  assert.equal(summary.simulationChanged, false, 'Environment Studio must not change simulation behavior');
  assert.equal(summary.scoringChanged, false, 'Environment Studio must not change scoring behavior');

  const reproduced = createSyntheticGlobeWorld({
    style: summary.worldStyle,
    seed: summary.worldSeed,
    generatorParameters: summary.worldGeneratorParameters
  });
  const repeat = createSyntheticGlobeWorld({
    style: summary.worldStyle,
    seed: summary.worldSeed,
    generatorParameters: summary.worldGeneratorParameters
  });
  const changed = createSyntheticGlobeWorld({
    style: summary.worldStyle,
    seed: `${summary.worldSeed}:changed`,
    generatorParameters: summary.worldGeneratorParameters
  });
  assert.equal(reproduced.worldDigest, summary.worldDigest, 'qa-summary worldDigest must reproduce from saved style/seed/parameters');
  assert.equal(reproduced.worldDigest, repeat.worldDigest, 'same seed/style/parameters must reproduce the globe digest');
  assert.notEqual(reproduced.worldDigest, changed.worldDigest, 'different seed must change the globe digest');
  assert.equal(reproduced.claimBoundary.hiddenTruthExposed, false, 'globe artifact must not expose hidden truth');
  assert.equal(reproduced.claimBoundary.realEarthMap, false, 'globe artifact must not claim real Earth');
  assert.equal(reproduced.claimBoundary.operationalForecast, false, 'globe artifact must not claim operational forecast');
  assert.equal(reproduced.claimBoundary.calibratedSurveyData, false, 'globe artifact must not claim calibrated survey data');

  const metrics = syntheticGlobeViewportVisualMetrics(reproduced, { layer: 'bathymetryContext' });
  assert.equal(metrics.globeRendered, true, 'pure metrics must represent the globe contract');
  assert.equal(metrics.flatMapPrimaryView, false, 'pure metrics must not imply a flat primary map');
  assert.equal(metrics.pixelGridPrimaryView, false, 'pure metrics must not imply pixel-grid art');
  assert.ok(metrics.visibleLandFraction > 0.02, 'pure metrics must detect land');
  assert.ok(metrics.visibleOceanFraction > 0.18, 'pure metrics must detect ocean');
  assert.ok(metrics.visibleIslandCount > 0, 'pure metrics must detect islands or seamounts');

  console.log('audit_env_globe_r1_visual_acceptance: ok', {
    worldDigest: summary.worldDigest,
    worldStyle: summary.worldStyle,
    selectedWindowDigest: summary.selectedWindowDigest,
    bathymetryArtifactDigest: summary.bathymetryArtifactDigest,
    screenshots: REQUIRED_SCREENSHOTS.length
  });
} catch (error) {
  console.error('ENV_GLOBE_R1_VISUAL_ACCEPTANCE_FAIL', error?.message ?? error);
  process.exit(1);
}
