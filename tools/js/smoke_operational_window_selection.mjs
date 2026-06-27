import assert from 'node:assert/strict';
import {
  OPERATIONAL_WINDOW_TYPE,
  createOperationalWindowFromWorldMap,
  createSyntheticWorldMap
} from '../../src/core/editor/SyntheticWorldMap.js';

const worldMap = createSyntheticWorldMap({
  style: 'gulfInlandSea',
  seed: 'env-studio-r2-window-smoke',
  resolution: { columns: 96, rows: 54 }
});

const bounds = { x: 0.2, y: 0.18, width: 0.34, height: 0.32 };
const windowA = createOperationalWindowFromWorldMap(bounds, worldMap);
const windowB = createOperationalWindowFromWorldMap(bounds, worldMap);

assert.equal(windowA.artifactType, OPERATIONAL_WINDOW_TYPE);
assert.equal(windowA.worldDigest, worldMap.worldDigest);
assert.equal(windowA.windowDigest, windowB.windowDigest, 'same world/bounds keep window digest stable');
assert.equal(windowA.validation.valid, true, windowA.validation.errors.join('\n'));
assert.ok(windowA.windowDigest.startsWith('fnv1a32:'));
assert.ok(windowA.detectedContext.primary, 'window context has primary label');
assert.equal(windowA.detectedContext.source, 'sampled synthetic-world-map fields');
assert.ok(windowA.sampledFieldStats.fieldStatsDigest.startsWith('fnv1a32:'));
assert.ok(Number.isFinite(windowA.sampledFieldStats.layerMeans.landOceanMask));
assert.ok(Number.isFinite(windowA.sampledFieldStats.layerMeans.shelfZone));
assert.ok(Number.isFinite(windowA.sampledFieldStats.layerMeans.deepBasinPotential));
assert.ok(Number.isFinite(windowA.sampledFieldStats.layerMeans.coarseFlowRegime));
assert.ok(Number.isFinite(windowA.recommendedDomain.widthMeters));
assert.ok(Number.isFinite(windowA.recommendedDomain.heightMeters));
assert.ok(windowA.recommendedDomain.columns > 0);
assert.ok(windowA.recommendedDomain.rows > 0);
assert.ok(windowA.environmentRegimes.flow.length > 0);
assert.ok(windowA.environmentRegimes.scalar.length > 0);
assert.ok(windowA.datasetTags.length > 0);

const invalid = createOperationalWindowFromWorldMap({ x: 0, y: 0, width: 0.08, height: 0.08 }, worldMap);
assert.equal(invalid.validation.status === 'FAIL' || invalid.validation.status === 'WARN', true, 'small/edge windows are warned or rejected');

const changed = createOperationalWindowFromWorldMap({ ...bounds, x: bounds.x + 0.05 }, worldMap);
assert.notEqual(changed.windowDigest, windowA.windowDigest, 'window digest changes with bounds');

const text = JSON.stringify(windowA);
assert.ok(!/"hiddenTruthExposed"\s*:\s*true/.test(text));
assert.ok(!/"realEarthMap"\s*:\s*true/.test(text));
assert.ok(!/"operationalForecast"\s*:\s*true/.test(text));

console.log('smoke_operational_window_selection: ok', {
  worldDigest: worldMap.worldDigest,
  windowDigest: windowA.windowDigest,
  context: windowA.detectedContext.primary,
  sourceGrid: `${windowA.recommendedDomain.columns}x${windowA.recommendedDomain.rows}`
});
