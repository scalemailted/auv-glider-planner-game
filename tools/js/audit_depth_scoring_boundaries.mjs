import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenRendererPatterns = [/evaluateDepthAwareSampleValue\(/, /depthAwareSampleScoreEvent\(/, /summarizeDepthAwareScoreEvents\(/];
const rendererDirs = ['src/game/phaser', 'src/ui/rendering', 'src/core/rendering'];
const sourceFiles = rendererDirs.flatMap((dir) => walk(path.join(root, dir)).filter((file) => file.endsWith('.js')));
const offenders = [];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenRendererPatterns) {
    if (pattern.test(text)) offenders.push(path.relative(root, file));
  }
}
assert.deepEqual([...new Set(offenders)], [], 'no scoring logic in Three/Phaser/rendering layers');
const allCore = walk(path.join(root, 'src')).filter((file) => file.endsWith('.js'));
const coreText = allCore.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.ok(!/free[- ]?flight 3d route planner/i.test(coreText), 'no free XYZ planner claim');
assert.ok(!/operationallyValidated:\s*true/.test(coreText), 'no operational validation claim');
assert.ok(!/hiddenTruthIncluded:\s*true/.test(fs.readFileSync(path.join(root, 'src/core/science/DepthAwareScienceValue.js'), 'utf8')), 'depth science value does not leak hidden truth');
assert.ok(/awardsIntegratedValueToSurfaceSample:\s*false/.test(fs.readFileSync(path.join(root, 'src/core/science/DepthAwareScienceValue.js'), 'utf8')), 'no duplicated top-down/depth-layer credit');
assert.ok(/scoreProfileId/.test(fs.readFileSync(path.join(root, 'src/core/science/DepthScoringProfiles.js'), 'utf8')), 'official-score profile is versioned');
console.log('audit_depth_scoring_boundaries: PASS');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
