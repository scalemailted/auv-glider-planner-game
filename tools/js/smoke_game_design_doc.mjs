import assert from 'node:assert/strict';
import fs from 'node:fs';

const docPath = 'docs/game_design_scientific_auv_planning.md';
assert.equal(fs.existsSync(docPath), true, `${docPath} should exist`);

const text = fs.readFileSync(docPath, 'utf8');
const lower = text.toLowerCase();

for (const phrase of [
  'Blind Discovery / Hidden-State Mode',
  'Planner Benchmark',
  'Adaptive Benchmark',
  'Full Autonomy Benchmark',
  '2.5D Water-Column',
  'Motion Planning vs Path Planning',
  'Node/OceanBox-JS',
  'Colab/Python',
  'not a Python simulator',
  'not MARL/RL training',
  'surface waypoint',
  'sampling point',
  'forecast correction',
  'hidden event'
]) {
  assert.ok(text.includes(phrase), `design doc should contain: ${phrase}`);
}

for (const phrase of [
  'best path is not the shortest path',
  'best sample is not always',
  'hidden truth',
  'priority field',
  'reconnaissance / lawnmower / zig-zag',
  'multi-agent cooperative sampling',
  'regret measures',
  'python/colab is not the simulator'
]) {
  assert.ok(lower.includes(phrase), `design doc should contain concept: ${phrase}`);
}

for (const heading of [
  '## 1. Design Purpose',
  '## 3. Scientific Game Loop',
  '## 4. Information Layers',
  '## 5. Visibility Modes',
  '## 6. Authority Modes',
  '## 7. Mission Objective Archetypes',
  '## 8. Sampling Strategy Archetypes',
  '## 9. Priority Model',
  '## 12. 2.5D Water-Column Model',
  '## 16. Scoring Design',
  '## 19. Technical Architecture Mapping',
  '## 20. Current Implementation Status',
  '## 21. Non-Goals'
]) {
  assert.ok(text.includes(heading), `design doc should include heading: ${heading}`);
}

const roadMap = fs.readFileSync('ROADMAP.md', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');
const howplay = fs.readFileSync('HOWPLAY.md', 'utf8');
const testing = fs.readFileSync('docs/testing.md', 'utf8');
const development = fs.readFileSync('docs/development_versions.md', 'utf8');
for (const [file, contents] of [
  ['ROADMAP.md', roadMap],
  ['README.md', readme],
  ['HOWPLAY.md', howplay],
  ['docs/testing.md', testing],
  ['docs/development_versions.md', development]
]) {
  assert.ok(contents.includes('docs/game_design_scientific_auv_planning.md') || contents.includes('game_design_scientific_auv_planning.md'), `${file} should link or reference the canonical design doc`);
}

console.log('smoke_game_design_doc: ok');