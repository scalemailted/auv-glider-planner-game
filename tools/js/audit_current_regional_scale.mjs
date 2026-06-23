import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const level = JSON.parse(readFileSync('levels/regional_current_benchmark.json', 'utf8'));
assert.equal(level.label, 'Synthetic Regional Bathymetry and Current Benchmark');
assert.ok(level.world.grid.width >= 20, 'regional benchmark should be wider than toy fixtures');
assert.ok(level.world.grid.cellSizeMeters >= 1000, 'regional benchmark should use kilometer-scale cells');
assert.ok(level.currentFieldRecipe.timeAxisSeconds.length >= 4, 'current recipe has multiple times');
assert.ok(level.currentFieldRecipe.depthAxisMeters.includes(600), 'current recipe supports deep source depth');
assert.match(level.currentFieldRecipe.claimBoundary, /Not a real ocean forecast/i);
console.log('[audit_current_regional_scale] PASS', { width: level.world.grid.width, height: level.world.grid.height });
