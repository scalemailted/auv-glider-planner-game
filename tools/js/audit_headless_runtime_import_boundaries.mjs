import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const runtimeDir = 'src/core/headless/runtime';
const files = fs.readdirSync(runtimeDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(runtimeDir, name));
files.push(
  'src/core/headless/HeadlessCsv.js',
  'src/core/headless/HeadlessBundleLoader.js',
  'src/core/headless/HeadlessBundleValidation.js',
  'src/core/headless/HeadlessBundleViewModel.js',
  'src/core/headless/HeadlessBundleBrowserAdapter.js',
  'src/core/headless/HeadlessRoundtrip.js',
  'src/core/headless/HeadlessRoundtripTypes.js',
  'src/core/headless/HeadlessSolverPacketAdapter.js',
  'src/core/headless/HeadlessPlanAdapter.js',
  'src/core/headless/HeadlessSolverRoundtrip.js',
  'src/core/headless/HeadlessRoundtripExport.js',
  'src/core/science/WaterColumnSchema.js',
  'src/core/science/WaterColumnFieldModel.js',
  'src/core/science/DiveProfileModel.js',
  'src/core/science/WaterColumnObservationModel.js',
  'src/core/science/WaterColumnPriorityModel.js',
  'tools/js/headless_oceanbox.mjs'
);

const bannedPatterns = [
  /Phaser/i,
  /\bdocument\b/,
  /\bwindow\b/,
  /localStorage/,
  /src\/game\/phaser/i,
  /src\\game\\phaser/i,
  /src\/ui\//i,
  /src\\ui\\/i,
  /Panel\.js/i,
  /Scene\.js/i
];
const fsAllowed = new Set(['HeadlessBundleWriter.js', 'headless_oceanbox.mjs']);
const violations = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of bannedPatterns) {
    if (pattern.test(text)) violations.push(`${file}: banned browser/UI reference ${pattern}`);
  }
  const basename = path.basename(file);
  const importsFsOrPath = /from ['"]node:(fs|path)['"]/.test(text) || /require\(['"](fs|path|node:fs|node:path)['"]\)/.test(text);
  if (importsFsOrPath && !fsAllowed.has(basename)) violations.push(`${file}: fs/path allowed only in bundle writer or CLI`);
}

assert.deepEqual(violations, [], `Headless runtime import boundary violations:\n${violations.join('\n')}`);
console.log('Headless runtime import boundary audit passed');

