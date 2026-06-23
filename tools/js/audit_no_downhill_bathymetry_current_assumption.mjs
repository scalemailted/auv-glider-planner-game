import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { oceanCurrentField4DSummary } from '../../src/core/science/OceanCurrentField4D.js';

const source = readFileSync('src/core/science/BathymetryConditionedCurrentBuilder.js', 'utf8');
assert.equal(/current\s+direction\s*=\s*downhill|downhill\s+bathymetry\s+direction|normalX\s*\*\s*downhill/i.test(source), false, 'builder must not encode current direction as generic downhill bathymetry');
const field = createBathymetryConditionedCurrentField({ grid: { width: 12, height: 8 }, timeAxisSeconds: [0, 600, 1200, 1800] });
const summary = oceanCurrentField4DSummary(field);
assert.ok((summary.sourceMetadata?.warnings ?? []).some((warning) => /does not imply generic downhill flow/i.test(warning)));
console.log('[audit_no_downhill_bathymetry_current_assumption] PASS', { along: summary.alongIsobathFraction, cross: summary.crossIsobathFraction });
