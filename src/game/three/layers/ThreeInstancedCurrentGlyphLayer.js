import * as THREE from 'three';
import { positionForRecord } from './ThreeMissionLayerUtils.js';

export const THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION = 'three-instanced-current-glyph-layer-flow-r2a';

export function createThreeInstancedCurrentGlyphLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'mission-instanced-current-glyph-layer';
  return {
    type: 'anchor.three.instanced-current-glyph-layer',
    version: THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION,
    group,
    mesh: null,
    capacity: 0,
    updateCount: 0,
    bufferUpdateCount: 0,
    objectCreateCount: 0,
    lastSummary: null,
    ownsCurrent: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesWebGpu: false
  };
}

export function updateThreeInstancedCurrentGlyphLayer(layer, viewModel = {}, options = {}) {
  if (!layer?.group) return layer;
  const transform = viewModel.coordinateSystem ?? options.transform ?? { cellSize: 1 };
  const samples = currentSamplesForViewModel(viewModel, options);
  ensureMesh(layer, Math.max(1, samples.length), transform, options);
  const dummy = updateThreeInstancedCurrentGlyphLayer._dummy ??= new THREE.Object3D();
  const color = updateThreeInstancedCurrentGlyphLayer._color ??= new THREE.Color();
  const cellSize = Number(transform.cellSize ?? 1);
  const magnitudeScale = Number(viewModel.waterColumn?.currentMagnitudeScale ?? viewModel.displaySettings?.waterColumn?.currentMagnitudeScale ?? options.magnitudeScale ?? 1);
  const maxLength = cellSize * 0.82;
  const minLength = cellSize * 0.12;
  for (let index = 0; index < layer.capacity; index += 1) {
    if (index < samples.length) {
      const sample = samples[index];
      const position = positionForRecord(transform, { x: sample.x ?? sample.eastMeters, y: sample.y ?? sample.northMeters, depthMeters: sample.depthMeters }, 0.08);
      const u = Number(sample.uEastMetersPerSecond ?? sample.u ?? 0);
      const v = Number(sample.vNorthMetersPerSecond ?? sample.v ?? 0);
      const magnitude = Number(sample.magnitudeMetersPerSecond ?? sample.magnitude ?? Math.hypot(u, v));
      const length = Math.max(minLength, Math.min(maxLength, cellSize * 0.34 * magnitudeScale * (0.25 + magnitude * 2.2)));
      const width = Math.max(cellSize * 0.025, Math.min(cellSize * 0.08, length * 0.22));
      dummy.position.copy(position);
      dummy.rotation.set(Math.PI / 2, 0, -Math.atan2(v, u) - Math.PI / 2);
      dummy.scale.set(width, length, width);
      dummy.updateMatrix();
      layer.mesh.setMatrixAt(index, dummy.matrix);
      layer.mesh.setColorAt(index, colorForSample(color, sample, viewModel));
    } else {
      dummy.position.set(0, -99999, 0);
      dummy.scale.set(0.0001, 0.0001, 0.0001);
      dummy.updateMatrix();
      layer.mesh.setMatrixAt(index, dummy.matrix);
      layer.mesh.setColorAt(index, color.set(0x000000));
    }
  }
  layer.mesh.count = samples.length;
  layer.mesh.instanceMatrix.needsUpdate = true;
  if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true;
  layer.mesh.visible = samples.length > 0;
  layer.group.visible = samples.length > 0;
  layer.updateCount += 1;
  layer.bufferUpdateCount += 1;
  layer.lastSummary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel, { sampleCount: samples.length });
  return layer;
}

export function disposeThreeInstancedCurrentGlyphLayer(layer) {
  if (!layer) return;
  layer.mesh?.geometry?.dispose?.();
  layer.mesh?.material?.dispose?.();
  layer.group?.remove?.(layer.mesh);
  layer.mesh = null;
  layer.capacity = 0;
}

export function threeInstancedCurrentGlyphLayerSummary(layer = {}, viewModel = {}, patch = {}) {
  const explorer = viewModel.waterColumnExplorer ?? {};
  return {
    type: 'anchor.three.instanced-current-glyph-layer-summary',
    version: THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION,
    activeLayerId: explorer.activeLayerId ?? viewModel.activeDepthLayerId ?? null,
    activeDepthMeters: explorer.activeDepthMeters ?? null,
    activeTimeSeconds: explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    glyphInstanceCount: patch.sampleCount ?? layer.mesh?.count ?? 0,
    glyphCapacity: layer.capacity ?? 0,
    glyphDrawCallCount: patch.sampleCount || layer.mesh?.count ? 1 : 0,
    glyphBufferUpdateCount: Number(layer.bufferUpdateCount ?? 0),
    glyphObjectCreateCount: Number(layer.objectCreateCount ?? 0),
    standaloneVectorObjectCount: 0,
    noPerVectorThreeObjects: true,
    coordinateMapping: {
      eastU: 'Three world X',
      northV: 'Three world Z',
      depthMeters: 'Three world Y via mission coordinate transform'
    },
    units: 'm/s',
    rendererOwnsCurrent: false,
    displayLayerChangesCurrent: false,
    changesOfficialScoring: false,
    usesWebGpu: false
  };
}

function ensureMesh(layer, capacity, transform, options = {}) {
  if (layer.mesh && layer.capacity >= capacity) return layer.mesh;
  disposeThreeInstancedCurrentGlyphLayer(layer);
  const cellSize = Number(transform.cellSize ?? 1);
  const geometry = new THREE.ConeGeometry(cellSize * 0.08, cellSize * 0.55, 3, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: Number(options.opacity ?? 0.86), depthWrite: false, vertexColors: true });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.name = 'instanced-current-glyphs';
  mesh.frustumCulled = false;
  mesh.userData = {
    missionObjectType: 'instancedCurrentGlyphs',
    version: THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION,
    rendererOwnsCurrent: false,
    displayLayerChangesCurrent: false,
    changesOfficialScoring: false,
    usesWebGpu: false
  };
  layer.group.add(mesh);
  layer.mesh = mesh;
  layer.capacity = capacity;
  layer.objectCreateCount += 1;
  return mesh;
}

function currentSamplesForViewModel(viewModel = {}, options = {}) {
  const explorer = viewModel.waterColumnExplorer ?? {};
  const layers = explorer.layers ?? [];
  const activeLayerId = explorer.activeLayerId ?? viewModel.activeDepthLayerId ?? layers[0]?.id;
  const currentMode = viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? explorer.displayMode ?? 'activeCurrentSlice';
  const showContext = viewModel.waterColumn?.showContextCurrents !== false && viewModel.displaySettings?.waterColumn?.showContextCurrents !== false;
  const density = Math.max(1, Math.round(Number(viewModel.waterColumn?.currentVectorDensity ?? viewModel.displaySettings?.waterColumn?.currentVectorDensity ?? options.vectorDensity ?? 1)));
  const includeContext = showContext && ['stackedCurrentSlabs', 'explodedCurrentSlabs', 'stackedSlabs', 'explodedSlabs'].includes(currentMode);
  const selected = includeContext ? layers : layers.filter((layer) => layer.id === activeLayerId);
  const samples = [];
  for (const layer of selected) {
    const context = layer.id !== activeLayerId;
    const stride = context ? density * 3 : density;
    for (const [index, vector] of (layer.currentField?.vectors ?? []).entries()) {
      if (vector.visible === false || index % stride !== 0) continue;
      samples.push({ ...vector, depthLayerId: layer.id, context, opacity: context ? 0.38 : 0.9 });
    }
  }
  return samples;
}

function colorForSample(color, sample, viewModel = {}) {
  const mode = viewModel.waterColumn?.currentColorMode ?? viewModel.displaySettings?.waterColumn?.currentColorMode ?? 'speed';
  if (sample.context) return color.set(0x6ca0b8);
  if (mode === 'depthLayer') {
    if (sample.depthLayerId === 'deep') return color.set(0xb197fc);
    if (sample.depthLayerId === 'thermocline') return color.set(0x63e6be);
    if (sample.depthLayerId === 'midwater') return color.set(0x73d2de);
    return color.set(0xbef6ff);
  }
  if (mode === 'direction') {
    const hue = ((Number(sample.bearingDegrees ?? 0) % 360) + 360) % 360 / 360;
    return color.setHSL(hue, 0.72, 0.58);
  }
  const speed = Math.max(0, Math.min(1, Number(sample.magnitudeMetersPerSecond ?? sample.magnitude ?? 0) / 0.7));
  return color.setHSL(0.56 - speed * 0.42, 0.82, 0.52 + speed * 0.12);
}
