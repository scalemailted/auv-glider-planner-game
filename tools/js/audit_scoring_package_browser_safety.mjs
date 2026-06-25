import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScoreProfile, createScoreInput, evaluateScore, publicScoreSummary, validateScoreResult } from '../../packages/scoring/src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = path.join(root, 'packages/scoring/src');
const files = await listFiles(packageRoot);
for (const file of files.filter((entry) => entry.endsWith('.js'))) {
  const source = await fs.readFile(file, 'utf8');
  assert.equal(/\b(document|window|localStorage|requestAnimationFrame)\b/.test(source), false, `${file} must stay browser-safe and DOM-free`);
  assert.equal(/from ['"](?:three|phaser)/.test(source), false, `${file} must not import renderer libraries`);
}
const profile = createScoreProfile({ profileId: 'balancedMission' });
const input = createScoreInput({ rawMetrics: { finalScore: 12, sampleScore: 0.12, weightedSampleScore: 12, energyPenalty: 0 }, scoreProfileId: profile.id });
const result = evaluateScore(profile, input);
assert.equal(validateScoreResult(result).valid, true);
assert.equal(publicScoreSummary(result).hiddenTruthIncluded, false);
console.log('audit_scoring_package_browser_safety: ok', { scoreDigest: result.scoreDigest });

async function listFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(full));
    else out.push(full);
  }
  return out;
}
