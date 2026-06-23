import * as THREE from 'three';
import { positionForRecord } from './ThreeMissionLayerUtils.js';
import { incrementSimulationLaunchCounter } from '../../../core/runtime/SimulationLaunchProfiler.js';

export const THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION = 'three-instanced-current-glyph-layer-flow-r2a-2';

const DEFAULT_RENDER_ORDER = 96;
const DEFAULT_OPACITY = 0.98;
const DEFAULT_LAYER_OFFSET_FACTOR = 0.18;

export function createThreeInstancedCurrentGlyphLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'mission-instanced-current-glyph-layer';
  incrementSimulationLaunchCounter('currentGlyphLayerBuildCount');
  return {
    type: 'anchor.three.instanced-current-glyph-layer',
    version: THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION,
    group,
    mesh: null,
    capacity: 0,
    updateCount: 0,
    bufferUpdateCount: 0,
    bufferAllocationCount: 0,
    objectCreateCount: 0,
    invalidVectorCount: 0,
    hiddenInvalidVectorCount: 0,
    lastSummary: null,
    lastStats: null,
    ownsCurrent: false,
    ownsSimulation: false,
    ownsScoring: false,
    usesWebGpu: false
  };
}

export function updateThreeInstancedCurrentGlyphLayer(layer, viewModel = {}, options = {}) {
  if (!layer?.group) return layer;
  if (globalThis.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE === true || viewModel.displaySettings?.waterColumn?.forceCurrentGlyphFailure === true) {
    throw new Error('Forced current glyph presentation failure.');
  }
  const transform = viewModel.coordinateSystem ?? options.transform ?? { cellSize: 1 };
  const samples = currentSamplesForViewModel(viewModel, options);
  ensureMesh(layer, Math.max(1, samples.length), transform, options);
  const dummy = updateThreeInstancedCurrentGlyphLayer._dummy ??= new THREE.Object3D();
  const color = updateThreeInstancedCurrentGlyphLayer._color ??= new THREE.Color();
  const cellSize = finite(transform.cellSize, 1);
  const magnitudeScale = finite(viewModel.waterColumn?.currentMagnitudeScale ?? viewModel.displaySettings?.waterColumn?.currentMagnitudeScale ?? options.magnitudeScale, 1.8);
  const layerOffsetWorld = finite(viewModel.waterColumn?.currentGlyphLayerOffsetWorld ?? viewModel.displaySettings?.waterColumn?.currentGlyphLayerOffsetWorld ?? options.layerOffsetWorld, cellSize * DEFAULT_LAYER_OFFSET_FACTOR);
  const maxLength = cellSize * 1.18;
  const minLength = cellSize * 0.34;
  const minWidth = cellSize * 0.11;
  let invalidVectorCount = 0;
  let finiteVectorCount = 0;
  let nonzeroVectorCount = 0;
  let terrainMaskedVectorCount = 0;
  let belowBottomVectorCount = 0;
  let minScale = Infinity;
  let maxScale = 0;
  for (let index = 0; index < layer.capacity; index += 1) {
    if (index < samples.length) {
      const sample = samples[index];
      const u = Number(sample.uEastMetersPerSecond ?? sample.u ?? 0);
      const v = Number(sample.vNorthMetersPerSecond ?? sample.v ?? 0);
      const magnitude = Number(sample.magnitudeMetersPerSecond ?? sample.magnitude ?? Math.hypot(u, v));
      const depthMeters = Number(sample.depthMeters ?? 0);
      const x = Number(sample.x ?? sample.eastMeters);
      const y = Number(sample.y ?? sample.northMeters);
      if (sample.masked === true || sample.wet === false) terrainMaskedVectorCount += 1;
      if (sample.belowBottom === true) belowBottomVectorCount += 1;
      if (![u, v, magnitude, depthMeters, x, y].every(Number.isFinite)) {
        invalidVectorCount += 1;
        hideInstance(layer, index, dummy, color);
        continue;
      }
      finiteVectorCount += 1;
      if (Math.hypot(u, v) > 1e-5) nonzeroVectorCount += 1;
      if (magnitude <= 1e-5) {
        hideInstance(layer, index, dummy, color);
        continue;
      }
      const position = positionForRecord(transform, { x, y, depthMeters }, layerOffsetWorld);
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
        invalidVectorCount += 1;
        hideInstance(layer, index, dummy, color);
        continue;
      }
      const length = Math.max(minLength, Math.min(maxLength, cellSize * magnitudeScale * (0.32 + magnitude * 2.8)));
      const width = Math.max(minWidth, Math.min(cellSize * 0.34, length * 0.32));
      minScale = Math.min(minScale, length);
      maxScale = Math.max(maxScale, length);
      dummy.position.copy(position);
      dummy.rotation.set(0, Math.atan2(u, v), 0);
      dummy.scale.set(width, 1, length);
      dummy.updateMatrix();
      layer.mesh.setMatrixAt(index, dummy.matrix);
      layer.mesh.setColorAt(index, colorForSample(color, sample, viewModel));
    } else {
      hideInstance(layer, index, dummy, color);
    }
  }
  layer.mesh.count = samples.length;
  layer.mesh.instanceMatrix.needsUpdate = true;
  if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true;
  layer.mesh.visible = samples.length > 0;
  layer.group.visible = samples.length > 0;
  layer.group.renderOrder = DEFAULT_RENDER_ORDER;
  layer.mesh.renderOrder = DEFAULT_RENDER_ORDER;
  layer.mesh.frustumCulled = false;
  layer.mesh.computeBoundingBox?.();
  layer.mesh.computeBoundingSphere?.();
  layer.updateCount += 1;
  layer.bufferUpdateCount += 1;
  layer.invalidVectorCount = invalidVectorCount;
  layer.hiddenInvalidVectorCount += invalidVectorCount;
  layer.lastStats = {
    sourceVectorSampleCount: samples.length,
    finiteVectorSampleCount: finiteVectorCount,
    nonzeroVectorSampleCount: nonzeroVectorCount,
    terrainMaskedVectorCount,
    belowBottomVectorCount,
    visibleVectorInstanceCount: samples.length,
    glyphMinimumScale: Number.isFinite(minScale) ? minScale : 0,
    glyphMaximumScale: maxScale,
    glyphLayerOffsetWorld: layerOffsetWorld
  };
  incrementSimulationLaunchCounter('currentGlyphBufferUpdateCount');
  layer.lastSummary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel, { sampleCount: samples.length, invalidVectorCount });
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
  const mesh = layer.mesh ?? null;
  const material = mesh?.material ?? null;
  const stats = layer.lastStats ?? {};
  const bounds = boundsSummary(mesh);
  return {
    type: 'anchor.three.instanced-current-glyph-layer-summary',
    version: THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION,
    activeLayerId: viewModel.currentActiveLayerId ?? viewModel.currentVisualization?.currentActiveLayerId ?? explorer.activeLayerId ?? viewModel.activeDepthLayerId ?? null,
    activeDepthMeters: explorer.activeDepthMeters ?? null,
    activeTimeSeconds: explorer.activeTimeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    glyphInstanceCount: patch.sampleCount ?? mesh?.count ?? 0,
    glyphCapacity: layer.capacity ?? 0,
    glyphDrawCallCount: patch.sampleCount || mesh?.count ? 1 : 0,
    glyphBufferUpdateCount: Number(layer.bufferUpdateCount ?? 0),
    glyphBufferAllocationCount: Number(layer.bufferAllocationCount ?? 0),
    glyphObjectCreateCount: Number(layer.objectCreateCount ?? 0),
    invalidVectorCount: Number(patch.invalidVectorCount ?? layer.invalidVectorCount ?? 0),
    hiddenInvalidVectorCount: Number(layer.hiddenInvalidVectorCount ?? 0),
    sourceVectorSampleCount: stats.sourceVectorSampleCount ?? patch.sampleCount ?? mesh?.count ?? 0,
    finiteVectorSampleCount: stats.finiteVectorSampleCount ?? 0,
    nonzeroVectorSampleCount: stats.nonzeroVectorSampleCount ?? 0,
    terrainMaskedVectorCount: stats.terrainMaskedVectorCount ?? 0,
    belowBottomVectorCount: stats.belowBottomVectorCount ?? 0,
    visibleVectorInstanceCount: stats.visibleVectorInstanceCount ?? patch.sampleCount ?? mesh?.count ?? 0,
    glyphMeshVisible: mesh?.visible === true,
    glyphParentVisible: layer.group?.visible === true,
    glyphFrustumCulled: mesh?.frustumCulled === true,
    glyphMinimumScale: round(stats.glyphMinimumScale ?? 0),
    glyphMaximumScale: round(stats.glyphMaximumScale ?? 0),
    glyphOpacity: Number(material?.opacity ?? DEFAULT_OPACITY),
    glyphDepthTest: material?.depthTest !== false,
    glyphDepthWrite: material?.depthWrite === true,
    glyphRenderOrder: Number(mesh?.renderOrder ?? DEFAULT_RENDER_ORDER),
    glyphLayerOffsetWorld: round(stats.glyphLayerOffsetWorld ?? 0),
    glyphBoundsMinimum: bounds?.min ?? null,
    glyphBoundsMaximum: bounds?.max ?? null,
    glyphBoundsCenter: bounds?.center ?? null,
    glyphBoundsRadius: bounds?.radius ?? null,
    standaloneVectorObjectCount: 0,
    noPerVectorThreeObjects: true,
    coordinateMapping: {
      eastU: 'Three world X',
      northV: 'Three world Z',
      depthMeters: 'Three world Y via mission coordinate transform'
    },
    glyphPrimitive: 'instanced-horizontal-arrow-kite',
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
  const geometry = createArrowKiteGeometry();
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: finite(options.opacity, DEFAULT_OPACITY),
    depthWrite: false,
    depthTest: options.depthTest === false ? false : true,
    side: THREE.DoubleSide,
    vertexColors: true,
    toneMapped: false
  });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.name = 'instanced-current-glyphs';
  mesh.frustumCulled = false;
  mesh.renderOrder = DEFAULT_RENDER_ORDER;
  mesh.userData = {
    missionObjectType: 'instancedCurrentGlyphs',
    version: THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION,
    rendererOwnsCurrent: false,
    displayLayerChangesCurrent: false,
    changesOfficialScoring: false,
    usesWebGpu: false
  };
  layer.group.renderOrder = DEFAULT_RENDER_ORDER;
  layer.group.add(mesh);
  layer.mesh = mesh;
  layer.capacity = capacity;
  layer.objectCreateCount += 1;
  layer.bufferAllocationCount += 1;
  incrementSimulationLaunchCounter('currentGlyphBufferAllocationCount');
  return mesh;
}

function createArrowKiteGeometry() {
  const vertices = new Float32Array([
    -0.18, 0, -0.50,
    -0.08, 0,  0.04,
    -0.30, 0,  0.04,
     0.00, 0,  0.50,
     0.30, 0,  0.04,
     0.08, 0,  0.04,
     0.18, 0, -0.50
  ]);
  const indices = [0, 1, 6, 1, 5, 6, 1, 2, 3, 1, 3, 5, 3, 4, 5];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function hideInstance(layer, index, dummy, color) {
  dummy.position.set(0, -99999, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(0.0001, 0.0001, 0.0001);
  dummy.updateMatrix();
  layer.mesh.setMatrixAt(index, dummy.matrix);
  layer.mesh.setColorAt(index, color.set(0x000000));
}

function currentSamplesForViewModel(viewModel = {}, options = {}) {
  const explorer = viewModel.waterColumnExplorer ?? {};
  const layers = explorer.layers ?? [];
  const activeLayerId = viewModel.currentActiveLayerId ?? viewModel.currentVisualization?.currentActiveLayerId ?? explorer.currentActiveLayerId ?? explorer.activeLayerId ?? viewModel.activeDepthLayerId ?? layers[0]?.id;
  const currentMode = normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? explorer.displayMode ?? 'activeCurrentSlice');
  const showContext = viewModel.waterColumn?.showContextCurrents === true || viewModel.displaySettings?.waterColumn?.showContextCurrents === true;
  const density = currentVectorDensityStride(viewModel.waterColumn?.currentVectorDensity ?? viewModel.displaySettings?.waterColumn?.currentVectorDensity ?? options.vectorDensity ?? 'balanced');
  const includeContext = showContext && ['stackedCurrentSlabs', 'explodedCurrentSlabs', 'stackedSlabs', 'explodedSlabs', 'allLayers'].includes(currentMode);
  const selected = includeContext ? layers : layers.filter((layer) => layer.id === activeLayerId);
  const samples = [];
  for (const layer of selected) {
    const context = layer.id !== activeLayerId;
    const stride = context ? density * 3 : density;
    for (const [index, vector] of (layer.currentField?.vectors ?? []).entries()) {
      if (vector.visible === false || index % stride !== 0) continue;
      samples.push({ ...vector, depthLayerId: layer.id, context, opacity: context ? 0.38 : 0.95 });
    }
  }
  return samples;
}

function colorForSample(color, sample, viewModel = {}) {
  const mode = viewModel.waterColumn?.currentColorMode ?? viewModel.displaySettings?.waterColumn?.currentColorMode ?? 'speed';
  if (sample.context) return color.set(0x7dd3fc);
  if (mode === 'depthLayer') {
    if (sample.depthLayerId === 'deep') return color.set(0xf0abfc);
    if (sample.depthLayerId === 'thermocline') return color.set(0x5fffd2);
    if (sample.depthLayerId === 'midwater') return color.set(0x67e8f9);
    return color.set(0xe0fbff);
  }
  if (mode === 'direction') {
    const hue = ((Number(sample.bearingDegrees ?? 0) % 360) + 360) % 360 / 360;
    return color.setHSL(hue, 0.92, 0.68);
  }
  const speed = Math.max(0, Math.min(1, Number(sample.magnitudeMetersPerSecond ?? sample.magnitude ?? 0) / 0.7));
  return color.setHSL(0.53 - speed * 0.36, 0.95, 0.66 + speed * 0.16);
}

function currentVectorDensityStride(value) {
  if (value === 'sparse') return 2;
  if (value === 'dense') return 1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(4, Math.round(numeric)));
}

function normalizeCurrentDisplayMode(mode) {
  if (mode === 'activeSlice' || mode === 'activeLayerOnly') return 'activeCurrentSlice';
  if (mode === 'allLayers') return 'stackedCurrentSlabs';
  return String(mode ?? 'activeCurrentSlice');
}

function boundsSummary(mesh) {
  if (!mesh) return null;
  mesh.updateWorldMatrix?.(true, false);
  const box = new THREE.Box3().setFromObject(mesh);
  if (![box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].every(Number.isFinite)) return null;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  return {
    min: [round(box.min.x), round(box.min.y), round(box.min.z)],
    max: [round(box.max.x), round(box.max.y), round(box.max.z)],
    center: [round(sphere.center.x), round(sphere.center.y), round(sphere.center.z)],
    radius: round(sphere.radius)
  };
}

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 6) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}