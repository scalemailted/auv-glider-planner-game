import assert from 'node:assert/strict';
import fs from 'node:fs';

const pureFiles = [
  'src/core/science/BathymetrySchema.js',
  'src/core/science/BathymetryFieldModel.js',
  'src/core/science/BathymetryMeshModel.js',
  'src/core/science/OceanWorldGeometryAdapter.js'
];
const bannedPure = [/Phaser/i, /src\/ui\//i, /src\\ui\\/i, /src\/game\/phaser/i, /src\\game\\phaser/i, /document\b/i, /window\b/i, /localStorage/i];
const violations = [];
for (const file of pureFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of bannedPure) if (pattern.test(text)) violations.push(`${file}: banned pure-module dependency ${pattern}`);
}
const boundaryFiles = [
  ...pureFiles,
  'src/game/phaser/scenes/BathymetryWorldViewScene.js',
  'src/ui/headless/HeadlessBundleViewerPanel.js',
  'docs/bathymetric_world_view.md',
  'README.md',
  'HOWPLAY.md',
  'docs/game_design_scientific_auv_planning.md',
  'docs/water_column_2p5d_sampling_model.md',
  'docs/renderer_architecture_and_webgpu_strategy.md'
].filter((file) => fs.existsSync(file));
for (const file of boundaryFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (/adds full 3D route planning|implements full 3D route planning/i.test(text)) violations.push(`${file}: claims full 3D route planning`);
  if (/terrain-flow accumulation is ocean current/i.test(text)) violations.push(`${file}: claims terrain-flow accumulation is ocean current`);
  if (/integrates? (SWE|RichDEM|WebGPU-Ocean)/i.test(text)) violations.push(`${file}: claims external SWE/RichDEM/WebGPU-Ocean integration`);
  if (/Python simulator is added|implements a Python simulator/i.test(text)) violations.push(`${file}: claims Python simulator`);
  if (/implements MARL|implements RL training/i.test(text)) violations.push(`${file}: claims MARL/RL implementation`);
}
assert.deepEqual(violations, [], `Bathymetry boundary violations:\n${violations.join('\n')}`);
console.log('audit_bathymetry_boundaries: ok');