import * as THREE from 'three';
import { positionForRecord } from './ThreeMissionLayerUtils.js';
import { incrementSimulationLaunchCounter } from '../../../core/runtime/SimulationLaunchProfiler.js';
import { normalizeRendererCurrentDisplayMode } from '../../../core/rendering/CurrentPresentationState.js';

export const THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION = 'three-instanced-current-glyph-layer-flow-r2a-3';

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
  const fieldSummary = viewModel.waterColumnExplorer?.currentFieldSummary ?? {};
  const sourceMetadata = fieldSummary.sourceMetadata ?? viewModel.waterColumnExplorer?.currentCube?.sourceMetadata ?? {};
  const calmThreshold = Math.max(0, finite(sourceMetadata.calmThresholdMetersPerSecond ?? fieldSummary.calmThresholdMetersPerSecond, 0.035));
  const canonicalMax = Math.max(calmThreshold + 1e-6, finite(sourceMetadata.displayMagnitudeRangeMetersPerSecond?.max ?? fieldSummary.speedStatistics?.max, 0.45));
  const maxLength = cellSize * 1.24;
  const minLength = cellSize * 0.18;
  const minWidth = cellSize * 0.08;
  let invalidVectorCount = 0;
  let finiteVectorCount = 0;
  let nonzeroVectorCount = 0;
  let terrainMaskedVectorCount = 0;
  let belowBottomVectorCount = 0;
  let activeGlyphCount = 0;
  let contextGlyphCount = 0;
  let volumetricGlyphCount = 0;
  let calmVectorCount = 0;
  const visibleDepthIds = new Set();
  const canonicalMagnitudes = [];
  const glyphLengths = [];
  const magnitudeBins = new Set();
  let slot = 0;
  for (const sample of samples) {
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
      continue;
    }
    finiteVectorCount += 1;
    canonicalMagnitudes.push(magnitude);
    magnitudeBins.add(Math.floor(Math.max(0, magnitude) / Math.max(0.0025, canonicalMax / 10)));
    if (Math.hypot(u, v) > 1e-5) nonzeroVectorCount += 1;
    const calm = sample.calm === true || magnitude <= calmThreshold || Math.hypot(u, v) <= calmThreshold;
    if (calm) {
      calmVectorCount += 1;
      continue;
    }
    const position = positionForRecord(transform, { x, y, depthMeters }, layerOffsetWorld);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
      invalidVectorCount += 1;
      continue;
    }
    const displayNormalized = Number.isFinite(Number(sample.displayMagnitudeNormalized))
      ? Math.max(0, Math.min(1, Number(sample.displayMagnitudeNormalized)))
      : Math.sqrt(Math.max(0, Math.min(1, (magnitude - calmThreshold) / Math.max(1e-6, canonicalMax - calmThreshold))));
    const lengthHint = Number(sample.displayGlyphLengthWorld);
    const rawLength = Number.isFinite(lengthHint) && lengthHint > 0
      ? cellSize * lengthHint * Math.max(0.35, magnitudeScale / 1.8)
      : minLength + (maxLength - minLength) * displayNormalized * Math.max(0.35, magnitudeScale / 1.8);
    const length = Math.max(minLength, Math.min(maxLength, rawLength));
    const width = Math.max(minWidth, Math.min(cellSize * 0.3, length * 0.25));
    glyphLengths.push(length);
    visibleDepthIds.add(String(sample.depthLayerId ?? sample.depthMeters ?? 'unknown'));
    if (sample.context === true) contextGlyphCount += 1; else activeGlyphCount += 1;
    if (sample.volumetric === true) volumetricGlyphCount += 1;
    dummy.position.copy(position);
    dummy.rotation.set(0, Math.atan2(u, v), 0);
    dummy.scale.set(width, 1, length);
    dummy.updateMatrix();
    layer.mesh.setMatrixAt(slot, dummy.matrix);
    layer.mesh.setColorAt(slot, colorForSample(color, sample, viewModel));
    slot += 1;
  }
  for (let index = slot; index < layer.capacity; index += 1) hideInstance(layer, index, dummy, color);
  layer.mesh.count = slot;
  layer.mesh.instanceMatrix.needsUpdate = true;
  if (layer.mesh.instanceColor) layer.mesh.instanceColor.needsUpdate = true;
  layer.mesh.visible = slot > 0;
  layer.group.visible = slot > 0;
  layer.group.renderOrder = DEFAULT_RENDER_ORDER;
  layer.mesh.renderOrder = DEFAULT_RENDER_ORDER;
  layer.mesh.frustumCulled = false;
  layer.mesh.computeBoundingBox?.();
  layer.mesh.computeBoundingSphere?.();
  layer.updateCount += 1;
  layer.bufferUpdateCount += 1;
  layer.invalidVectorCount = invalidVectorCount;
  layer.hiddenInvalidVectorCount += invalidVectorCount;
  const canonicalStats = numericStats(canonicalMagnitudes);
  const glyphStats = numericStats(glyphLengths);
  layer.lastStats = {
    sourceVectorSampleCount: samples.length,
    finiteVectorSampleCount: finiteVectorCount,
    nonzeroVectorSampleCount: nonzeroVectorCount,
    terrainMaskedVectorCount,
    belowBottomVectorCount,
    visibleVectorInstanceCount: slot,
    activeGlyphCount,
    contextGlyphCount,
    volumetricGlyphCount,
    visibleDepthIds: [...visibleDepthIds],
    visibleDepthCount: visibleDepthIds.size,
    activeCurrentDisplayMode: normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? viewModel.waterColumnExplorer?.displayMode ?? 'activeCurrentSlice'),
    canonicalMagnitudeMinimum: canonicalStats.minimum,
    canonicalMagnitudeMean: canonicalStats.mean,
    canonicalMagnitudeMaximum: canonicalStats.maximum,
    calmThresholdMetersPerSecond: calmThreshold,
    calmVectorCount,
    distinctMagnitudeBinCount: magnitudeBins.size,
    glyphLengthMinimum: glyphStats.minimum,
    glyphLengthMean: glyphStats.mean,
    glyphLengthMaximum: glyphStats.maximum,
    glyphMinimumScale: glyphStats.minimum ?? 0,
    glyphMaximumScale: glyphStats.maximum ?? 0,
    glyphLayerOffsetWorld: layerOffsetWorld
  };
  incrementSimulationLaunchCounter('currentGlyphBufferUpdateCount');
  layer.lastSummary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel, { sampleCount: slot, invalidVectorCount });
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
    activeGlyphCount: stats.activeGlyphCount ?? 0,
    contextGlyphCount: stats.contextGlyphCount ?? 0,
    volumetricGlyphCount: stats.volumetricGlyphCount ?? 0,
    visibleDepthIds: stats.visibleDepthIds ?? [],
    visibleDepthCount: stats.visibleDepthCount ?? 0,
    activeCurrentDisplayMode: stats.activeCurrentDisplayMode ?? normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? explorer.displayMode ?? 'activeCurrentSlice'),
    drawCallPolicy: 'one shared instanced mesh for all visible current glyph depths',
    glyphMeshVisible: mesh?.visible === true,
    glyphParentVisible: layer.group?.visible === true,
    glyphFrustumCulled: mesh?.frustumCulled === true,
    canonicalMagnitudeMinimum: stats.canonicalMagnitudeMinimum ?? null,
    canonicalMagnitudeMean: stats.canonicalMagnitudeMean ?? null,
    canonicalMagnitudeMaximum: stats.canonicalMagnitudeMaximum ?? null,
    calmThresholdMetersPerSecond: stats.calmThresholdMetersPerSecond ?? null,
    calmVectorCount: Number(stats.calmVectorCount ?? 0),
    distinctMagnitudeBinCount: Number(stats.distinctMagnitudeBinCount ?? 0),
    glyphLengthMinimum: round(stats.glyphLengthMinimum ?? 0),
    glyphLengthMean: round(stats.glyphLengthMean ?? 0),
    glyphLengthMaximum: round(stats.glyphLengthMaximum ?? 0),
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
    depthTest: options.depthTest === true ? true : false,
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
  const multiDepthMode = ['stackedCurrentSlabs', 'explodedCurrentSlabs', 'stackedDepthField', 'explodedDepthField', 'sparseVolumetricField', 'stackedSlabs', 'explodedSlabs', 'allLayers'].includes(currentMode);
  const includeContext = showContext || multiDepthMode;
  const selected = includeContext ? layers : layers.filter((layer) => layer.id === activeLayerId);
  const samples = [];
  for (const layer of selected) {
    const context = layer.id !== activeLayerId;
    const sparseVolume = currentMode === 'sparseVolumetricField';
    const stride = sparseVolume ? Math.max(1, density * (context ? 4 : 2)) : context ? Math.max(1, density * 3) : density;
    for (const [index, vector] of (layer.currentField?.vectors ?? []).entries()) {
      if (vector.visible === false || index % stride !== 0) continue;
      samples.push({
        ...vector,
        depthLayerId: layer.id,
        context,
        volumetric: sparseVolume,
        presentationMode: currentMode,
        opacity: context ? 0.38 : 0.95
      });
    }
  }
  const maxGlyphSamples = Math.max(120, Number(viewModel.resolutionProfile?.renderLod?.currentVectorMaxGlyphs ?? viewModel.renderLod?.currentVectorMaxGlyphs ?? options.maxGlyphSamples ?? 900));
  if (samples.length <= maxGlyphSamples) return samples;
  const byDepth = new Map();
  for (const sample of samples) {
    const key = String(sample.depthLayerId ?? sample.depthMeters ?? 'unknown');
    if (!byDepth.has(key)) byDepth.set(key, []);
    byDepth.get(key).push(sample);
  }
  const limited = [];
  const perDepthLimit = Math.max(1, Math.floor(maxGlyphSamples / Math.max(1, byDepth.size)));
  for (const group of byDepth.values()) {
    const stride = Math.max(1, Math.ceil(group.length / perDepthLimit));
    for (let index = 0; index < group.length && limited.length < maxGlyphSamples; index += stride) limited.push(group[index]);
  }
  return limited;
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

function numericStats(values = []) {
  const finiteValues = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finiteValues.length) return { minimum: null, mean: null, maximum: null };
  return {
    minimum: round(finiteValues[0]),
    mean: round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length),
    maximum: round(finiteValues.at(-1))
  };
}

function currentVectorDensityStride(value) {
  if (value === 'sparse') return 2;
  if (value === 'dense') return 1;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(4, Math.round(numeric)));
}

function normalizeCurrentDisplayMode(mode) {
  return normalizeRendererCurrentDisplayMode(mode);
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
