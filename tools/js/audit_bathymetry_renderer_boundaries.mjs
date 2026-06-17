import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'src/game/three/ThreeBathymetryRenderer.js',
  'src/core/rendering/BathymetryWorldRenderViewModel.js',
  'src/game/phaser/scenes/BathymetryWorldViewScene.js',
  'src/ui/MissionConsole.js',
  'docs/bathymetric_world_view.md',
  'docs/renderer_architecture_and_webgpu_strategy.md'
].filter((file) => fs.existsSync(file));
const rendererSource = fs.readFileSync('src/game/three/ThreeBathymetryRenderer.js', 'utf8');
const violations = [];
const implementationPatterns = [
  [/from\s+['"][^'"]*(enable3d|ammo)[^'"]*['"]|import\s+[^;]*(Enable3D|Ammo)|new\s+(Enable3D|Ammo)|extends\s+(Enable3D|Ammo)/i, 'implements Enable3D/Ammo'],
  [/from\s+['"][^'"]*(webgpu-ocean|WebGPU-Ocean)[^'"]*['"]|import\s+[^;]*(webgpu-ocean|WebGPU-Ocean)/i, 'imports WebGPU-Ocean']
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.js')) {
    for (const [pattern, label] of implementationPatterns) if (pattern.test(text)) violations.push(`${file}: ${label}`);
  }
  if (/terrain-flow accumulation is ocean current/i.test(text)) violations.push(`${file}: claims terrain-flow accumulation is ocean current`);
  if (/adds full 3D route planning|implements full 3D route planning/i.test(text)) violations.push(`${file}: claims full 3D route planning`);
  if (/Python simulator is added|implements a Python simulator/i.test(text)) violations.push(`${file}: claims Python simulator`);
  if (/implements MARL|implements RL training/i.test(text)) violations.push(`${file}: claims MARL/RL implementation`);
}
for (const banned of ['src/core/sim', 'src/core/scoring', 'src/core/planning', 'src/core/benchmark']) {
  if (rendererSource.includes(banned)) violations.push(`ThreeBathymetryRenderer imports authority module ${banned}`);
}
assert.deepEqual(violations, [], `Bathymetry renderer boundary violations:\n${violations.join('\n')}`);
console.log('audit_bathymetry_renderer_boundaries: ok');