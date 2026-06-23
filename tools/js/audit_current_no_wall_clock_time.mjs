import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sampler = readFileSync('src/core/science/OceanCurrentFieldSampler.js', 'utf8');
const explorer = readFileSync('src/core/rendering/WaterColumnLayerExplorerViewModel.js', 'utf8');
const presentation = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');

for (const [name, source] of [['OceanCurrentFieldSampler', sampler], ['WaterColumnLayerExplorerViewModel', explorer], ['CurrentPresentationState', presentation], ['ThreeInstancedCurrentGlyphLayer', glyph]]) {
  assert.doesNotMatch(source, /Three\.Clock|requestAnimationFrame\s*\(|Date\.now\s*\(|performance\.now\s*\(/, `${name} must not use wall-clock time for environmental current evolution`);
}
assert.match(explorer, /activeTimeSeconds/, 'water-column explorer accepts canonical activeTimeSeconds');
assert.match(presentation, /resolveCurrentPresentationTimeSeconds/, 'presentation state resolves canonical mission/simulation time');
console.log('[audit_current_no_wall_clock_time] PASS');