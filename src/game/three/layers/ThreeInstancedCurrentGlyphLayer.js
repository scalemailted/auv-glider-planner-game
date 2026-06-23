import * as THREE from 'three';
import { positionForRecord } from './ThreeMissionLayerUtils.js';
import { incrementSimulationLaunchCounter } from '../../../core/runtime/SimulationLaunchProfiler.js';
import { currentSourceTimeFrameSignature, normalizeRendererCurrentDisplayMode, resolveCurrentPresentationTimeSeconds } from '../../../core/rendering/CurrentPresentationState.js';

export const THREE_INSTANCED_CURRENT_GLYPH_LAYER_VERSION = 'three-instanced-current-glyph-layer-flow-runtime-r1';

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
    skippedUpdateCount: 0,
    lastSkipReason: null,
    bufferUpdateCount: 0,
    bufferAllocationCount: 0,
    objectCreateCount: 0,
    invalidVectorCount: 0,
    hiddenInvalidVectorCount: 0,
    lastPresentationDigest: null,
    currentDirectionDigest: null,
    currentMagnitudeDigest: null,
    currentVisibilityDigest: null,
    currentMatrixDigest: null,
    currentDirectionAttributeVersion: 0,
    currentMagnitudeAttributeVersion: 0,
    currentVisibilityAttributeVersion: 0,
    currentMatrixAttributeVersion: 0,
    currentDirectionBufferUploadCount: 0,
    currentMagnitudeBufferUploadCount: 0,
    currentVisibilityBufferUploadCount: 0,
    currentMatrixBufferUploadCount: 0,
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
  const fingerprint = currentGlyphPresentationFingerprint(samples, viewModel, transform, { magnitudeScale, layerOffsetWorld, currentMode: normalizeCurrentDisplayMode(viewModel.waterColumn?.currentDisplayMode ?? viewModel.displaySettings?.waterColumn?.currentDisplayMode ?? viewModel.waterColumnExplorer?.displayMode ?? 'activeCurrentSlice') });
  if (layer.lastPresentationDigest && layer.lastPresentationDigest === fingerprint.presentationDigest) {
    layer.updateCount += 1;
    layer.skippedUpdateCount += 1;
    layer.lastSkipReason = 'presentationDigestUnchanged';
    layer.lastStats = {
      ...(layer.lastStats ?? {}),
      ...(samples.__currentClassificationSummary ?? {}),
      currentPresentationTimeSeconds: fingerprint.currentPresentationTimeSeconds,
      sourceTimeFrameSignature: fingerprint.sourceTimeFrameSignature,
      currentDataDigest: fingerprint.currentDataDigest,
      currentDirectionDigest: fingerprint.directionDigest,
      currentMagnitudeDigest: fingerprint.magnitudeDigest,
      currentVisibilityDigest: fingerprint.visibilityDigest,
      currentMatrixDigest: fingerprint.matrixDigest,
      currentDataChangedSinceLastUpload: false,
      currentDataUploadSkipped: true
    };
    layer.lastSummary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel, { sampleCount: layer.mesh?.count ?? 0, invalidVectorCount: layer.invalidVectorCount ?? 0 });
    return layer;
  }
  let invalidVectorCount = 0;
  let finiteVectorCount = 0;
  let nonzeroVectorCount = 0;
  let terrainMaskedVectorCount = 0;
  let belowBottomVectorCount = 0;
  let activeGlyphCount = 0;
  let contextGlyphCount = 0;
  let volumetricGlyphCount = 0;
  let calmVectorCount = 0;
  let calmMarkerInstanceCount = 0;
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
      const position = positionForRecord(transform, { x, y, depthMeters }, layerOffsetWorld);
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
        invalidVectorCount += 1;
        continue;
      }
      const markerSize = Math.max(cellSize * 0.1, Math.min(cellSize * 0.22, cellSize * (sample.context ? 0.11 : 0.15)));
      glyphLengths.push(markerSize);
      visibleDepthIds.add(String(sample.depthLayerId ?? sample.depthMeters ?? 'unknown'));
      if (sample.context === true) contextGlyphCount += 1; else activeGlyphCount += 1;
      if (sample.volumetric === true) volumetricGlyphCount += 1;
      calmMarkerInstanceCount += 1;
      dummy.position.copy(position);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(markerSize, 1, markerSize);
      dummy.updateMatrix();
      layer.mesh.setMatrixAt(slot, dummy.matrix);
      layer.mesh.setColorAt(slot, color.set(sample.context ? 0x64748b : 0xb7f7e6));
      slot += 1;
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
  const digestChanges = applyCurrentGlyphDigestCounters(layer, fingerprint);
  layer.lastPresentationDigest = fingerprint.presentationDigest;
  layer.lastSkipReason = null;
  layer.mesh.count = slot;
  layer.mesh.instanceMatrix.needsUpdate = true;
  layer.mesh.instanceMatrix.setUsage?.(THREE.DynamicDrawUsage);
  if (layer.mesh.instanceColor) {
    layer.mesh.instanceColor.setUsage?.(THREE.DynamicDrawUsage);
    layer.mesh.instanceColor.needsUpdate = true;
  }
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
    calmMarkerInstanceCount,
    distinctMagnitudeBinCount: magnitudeBins.size,
    glyphLengthMinimum: glyphStats.minimum,
    glyphLengthMean: glyphStats.mean,
    glyphLengthMaximum: glyphStats.maximum,
    glyphMinimumScale: glyphStats.minimum ?? 0,
    glyphMaximumScale: glyphStats.maximum ?? 0,
    glyphLayerOffsetWorld: layerOffsetWorld,
    ...(samples.__currentClassificationSummary ?? {}),
    currentPresentationTimeSeconds: fingerprint.currentPresentationTimeSeconds,
    sourceTimeFrameSignature: fingerprint.sourceTimeFrameSignature,
    currentDataDigest: fingerprint.currentDataDigest,
    currentDirectionDigest: fingerprint.directionDigest,
    currentMagnitudeDigest: fingerprint.magnitudeDigest,
    currentVisibilityDigest: fingerprint.visibilityDigest,
    currentMatrixDigest: fingerprint.matrixDigest,
    currentDataChangedSinceLastUpload: digestChanges.changed,
    currentDataUploadSkipped: false
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
    currentLayerUpdateCount: Number(layer.updateCount ?? 0),
    currentLayerSkippedUpdateCount: Number(layer.skippedUpdateCount ?? 0),
    currentLayerSkipReason: layer.lastSkipReason ?? null,
    currentDirectionBufferUploadCount: Number(layer.currentDirectionBufferUploadCount ?? 0),
    currentMagnitudeBufferUploadCount: Number(layer.currentMagnitudeBufferUploadCount ?? 0),
    currentVisibilityBufferUploadCount: Number(layer.currentVisibilityBufferUploadCount ?? 0),
    currentMatrixBufferUploadCount: Number(layer.currentMatrixBufferUploadCount ?? 0),
    currentDirectionAttributeVersion: Number(layer.currentDirectionAttributeVersion ?? 0),
    currentMagnitudeAttributeVersion: Number(layer.currentMagnitudeAttributeVersion ?? 0),
    currentVisibilityAttributeVersion: Number(layer.currentVisibilityAttributeVersion ?? 0),
    currentMatrixAttributeVersion: Number(layer.currentMatrixAttributeVersion ?? 0),
    currentDataDigest: stats.currentDataDigest ?? null,
    currentDirectionDigest: stats.currentDirectionDigest ?? layer.currentDirectionDigest ?? null,
    currentMagnitudeDigest: stats.currentMagnitudeDigest ?? layer.currentMagnitudeDigest ?? null,
    currentVisibilityDigest: stats.currentVisibilityDigest ?? layer.currentVisibilityDigest ?? null,
    currentMatrixDigest: stats.currentMatrixDigest ?? layer.currentMatrixDigest ?? null,
    currentPresentationTimeSeconds: stats.currentPresentationTimeSeconds ?? resolveCurrentPresentationTimeSeconds(viewModel, explorer.activeTimeSeconds ?? 0),
    sourceTimeFrameSignature: stats.sourceTimeFrameSignature ?? currentSourceTimeFrameSignature(viewModel),
    currentDataChangedSinceLastUpload: stats.currentDataChangedSinceLastUpload ?? null,
    currentDataUploadSkipped: stats.currentDataUploadSkipped ?? null,
    glyphBufferAllocationCount: Number(layer.bufferAllocationCount ?? 0),
    glyphObjectCreateCount: Number(layer.objectCreateCount ?? 0),
    invalidVectorCount: Number(patch.invalidVectorCount ?? layer.invalidVectorCount ?? 0),
    hiddenInvalidVectorCount: Number(layer.hiddenInvalidVectorCount ?? 0),
    sourceVectorSampleCount: stats.sourceVectorSampleCount ?? patch.sampleCount ?? mesh?.count ?? 0,
    finiteVectorSampleCount: stats.finiteVectorSampleCount ?? 0,
    nonzeroVectorSampleCount: stats.nonzeroVectorSampleCount ?? 0,
    terrainMaskedVectorCount: stats.terrainMaskedVectorCount ?? 0,
    belowBottomVectorCount: stats.belowBottomVectorCount ?? 0,
    sourceTerrainMaskedVectorCount: Number(stats.sourceTerrainMaskedVectorCount ?? 0),
    sourceBelowBottomVectorCount: Number(stats.sourceBelowBottomVectorCount ?? 0),
    densityProfileId: stats.densityProfileId ?? null,
    requestedCurrentDensity: stats.requestedDensity ?? null,
    classifiedVectorCount: Number(stats.classifiedVectorCount ?? 0),
    hiddenByLayerFilterCount: Number(stats.hiddenByLayerFilterCount ?? 0),
    hiddenByDensityCount: Number(stats.hiddenByDensityCount ?? 0),
    directionalCandidateCount: Number(stats.directionalCandidateCount ?? 0),
    calmCandidateCount: Number(stats.calmCandidateCount ?? 0),
    directionalRenderedCount: Number(stats.directionalRenderedCount ?? 0),
    calmRenderedCount: Number(stats.calmRenderedCount ?? stats.calmMarkerInstanceCount ?? 0),
    maxDirectionalGlyphs: Number(stats.maxDirectionalGlyphs ?? 0),
    maxCalmGlyphs: Number(stats.maxCalmGlyphs ?? 0),
    currentSampleConservationCheck: stats.conservationCheck === true,
    currentLayerSampleCounts: stats.perLayerCounts ?? [],
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
    calmMarkerInstanceCount: Number(stats.calmMarkerInstanceCount ?? 0),
    calmMarkerPolicy: 'calm wet cells use neutral instanced markers instead of directional arrows',
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


function currentGlyphPresentationFingerprint(samples = [], viewModel = {}, transform = {}, options = {}) {
  const currentPresentationTimeSeconds = resolveCurrentPresentationTimeSeconds(viewModel, viewModel.waterColumnExplorer?.activeTimeSeconds ?? 0);
  const sourceTimeFrameSignature = currentSourceTimeFrameSignature(viewModel);
  const sampleRecords = samples.map((sample) => ({
    id: sample.id ?? `${sample.depthLayerId}:${sample.x}:${sample.y}`,
    x: round(sample.x ?? sample.eastMeters, 4),
    y: round(sample.y ?? sample.northMeters, 4),
    depthLayerId: sample.depthLayerId ?? null,
    depthMeters: round(sample.depthMeters ?? 0, 4),
    u: round(sample.uEastMetersPerSecond ?? sample.u ?? 0, 6),
    v: round(sample.vNorthMetersPerSecond ?? sample.v ?? 0, 6),
    magnitude: round(sample.magnitudeMetersPerSecond ?? sample.magnitude ?? 0, 6),
    calm: sample.calm === true,
    visible: sample.visible !== false,
    context: sample.context === true
  }));
  const directionDigest = stableDigest(sampleRecords.map((sample) => [sample.id, sample.depthLayerId, sample.u, sample.v, sample.calm]));
  const magnitudeDigest = stableDigest(sampleRecords.map((sample) => [sample.id, sample.depthLayerId, sample.magnitude]));
  const visibilityDigest = stableDigest({ mode: options.currentMode, records: sampleRecords.map((sample) => [sample.id, sample.depthLayerId, sample.visible, sample.context, sample.calm]) });
  const matrixDigest = stableDigest({
    transform: {
      cellSize: round(transform.cellSize ?? 1, 6),
      depthScale: round(transform.depthScale ?? 1, 6),
      verticalExaggeration: round(transform.verticalExaggeration ?? 1, 6),
      originX: round(transform.originX ?? 0, 6),
      originY: round(transform.originY ?? 0, 6),
      originZ: round(transform.originZ ?? 0, 6)
    },
    magnitudeScale: round(options.magnitudeScale ?? 1.8, 6),
    layerOffsetWorld: round(options.layerOffsetWorld ?? 0, 6),
    records: sampleRecords.map((sample) => [sample.id, sample.x, sample.y, sample.depthMeters, sample.u, sample.v, sample.magnitude, sample.calm])
  });
  const currentDataDigest = stableDigest({ sourceTimeFrameSignature, currentPresentationTimeSeconds: round(currentPresentationTimeSeconds, 3), directionDigest, magnitudeDigest, visibilityDigest });
  const presentationDigest = stableDigest({ currentDataDigest, matrixDigest });
  return { currentPresentationTimeSeconds, sourceTimeFrameSignature, directionDigest, magnitudeDigest, visibilityDigest, matrixDigest, currentDataDigest, presentationDigest };
}

function applyCurrentGlyphDigestCounters(layer, fingerprint = {}) {
  const directionChanged = layer.currentDirectionDigest !== fingerprint.directionDigest;
  const magnitudeChanged = layer.currentMagnitudeDigest !== fingerprint.magnitudeDigest;
  const visibilityChanged = layer.currentVisibilityDigest !== fingerprint.visibilityDigest;
  const matrixChanged = layer.currentMatrixDigest !== fingerprint.matrixDigest;
  if (directionChanged) {
    layer.currentDirectionAttributeVersion += 1;
    layer.currentDirectionBufferUploadCount += 1;
    layer.currentDirectionDigest = fingerprint.directionDigest;
  }
  if (magnitudeChanged) {
    layer.currentMagnitudeAttributeVersion += 1;
    layer.currentMagnitudeBufferUploadCount += 1;
    layer.currentMagnitudeDigest = fingerprint.magnitudeDigest;
  }
  if (visibilityChanged) {
    layer.currentVisibilityAttributeVersion += 1;
    layer.currentVisibilityBufferUploadCount += 1;
    layer.currentVisibilityDigest = fingerprint.visibilityDigest;
  }
  if (matrixChanged) {
    layer.currentMatrixAttributeVersion += 1;
    layer.currentMatrixBufferUploadCount += 1;
    layer.currentMatrixDigest = fingerprint.matrixDigest;
  }
  return { changed: directionChanged || magnitudeChanged || visibilityChanged || matrixChanged, directionChanged, magnitudeChanged, visibilityChanged, matrixChanged };
}

function stableDigest(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
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
  mesh.instanceMatrix?.setUsage?.(THREE.DynamicDrawUsage);
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
  const profile = currentVectorDensityProfile(viewModel.waterColumn?.currentVectorDensity ?? viewModel.displaySettings?.waterColumn?.currentVectorDensity ?? options.vectorDensity ?? 'balanced', currentMode);
  const multiDepthMode = ['stackedCurrentSlabs', 'explodedCurrentSlabs', 'stackedDepthField', 'explodedDepthField', 'sparseVolumetricField', 'stackedSlabs', 'explodedSlabs', 'allLayers'].includes(currentMode);
  const includeContext = showContext || multiDepthMode;
  const layerVisible = currentLayerVisibilityFilter(viewModel);
  const selectedLayer = (layer) => (includeContext || layer.id === activeLayerId) && layerVisible(layer.id);
  const candidates = [];
  const classification = {
    densityProfileId: profile.id,
    requestedDensity: profile.requestedDensity,
    currentDisplayMode: currentMode,
    activeLayerId: activeLayerId ?? null,
    sourceVectorSampleCount: 0,
    classifiedVectorCount: 0,
    finiteVectorSampleCount: 0,
    invalidVectorCount: 0,
    sourceTerrainMaskedVectorCount: 0,
    sourceBelowBottomVectorCount: 0,
    hiddenByLayerFilterCount: 0,
    hiddenByDensityCount: 0,
    directionalCandidateCount: 0,
    calmCandidateCount: 0,
    directionalRenderedCount: 0,
    calmRenderedCount: 0,
    maxDirectionalGlyphs: profile.maxDirectionalGlyphs,
    maxCalmGlyphs: profile.maxCalmGlyphs,
    maxGlyphSamples: profile.maxGlyphSamples,
    perLayerCounts: []
  };
  for (const layer of layers) {
    const layerCounts = { id: layer.id, source: 0, visible: 0, directional: 0, calm: 0, rendered: 0, hiddenByLayerFilter: 0, hiddenByDensity: 0 };
    const layerSelected = selectedLayer(layer);
    for (const [index, vector] of (layer.currentField?.vectors ?? []).entries()) {
      const u = Number(vector.uEastMetersPerSecond ?? vector.u ?? 0);
      const v = Number(vector.vNorthMetersPerSecond ?? vector.v ?? 0);
      const magnitude = Number(vector.magnitudeMetersPerSecond ?? vector.magnitude ?? Math.hypot(u, v));
      const visible = vector.visible !== false;
      layerCounts.source += 1;
      classification.sourceVectorSampleCount += 1;
      if (vector.masked === true || vector.wet === false || visible === false) classification.sourceTerrainMaskedVectorCount += 1;
      if (vector.belowBottom === true) classification.sourceBelowBottomVectorCount += 1;
      if (![u, v, magnitude].every(Number.isFinite)) {
        classification.invalidVectorCount += 1;
        continue;
      }
      classification.finiteVectorSampleCount += 1;
      if (!visible) continue;
      layerCounts.visible += 1;
      classification.classifiedVectorCount += 1;
      if (!layerSelected) {
        classification.hiddenByLayerFilterCount += 1;
        layerCounts.hiddenByLayerFilter += 1;
        continue;
      }
      const calm = vector.calm === true || magnitude <= Number(vector.calmThresholdMetersPerSecond ?? 0.035) || Math.hypot(u, v) <= Number(vector.calmThresholdMetersPerSecond ?? 0.035);
      if (calm) {
        classification.calmCandidateCount += 1;
        layerCounts.calm += 1;
      } else {
        classification.directionalCandidateCount += 1;
        layerCounts.directional += 1;
      }
      candidates.push({
        ...vector,
        depthLayerId: layer.id,
        context: layer.id !== activeLayerId,
        volumetric: currentMode === 'sparseVolumetricField',
        presentationMode: currentMode,
        opacity: layer.id !== activeLayerId ? 0.38 : 0.95,
        calm,
        __sourceIndex: index,
        __layerIndex: classification.perLayerCounts.length
      });
    }
    classification.perLayerCounts.push(layerCounts);
  }
  const directional = candidates.filter((sample) => sample.calm !== true);
  const calm = candidates.filter((sample) => sample.calm === true);
  const selectedDirectional = deterministicLayerDecimate(directional, profile.maxDirectionalGlyphs);
  const selectedCalm = deterministicLayerDecimate(calm, profile.maxCalmGlyphs);
  const samples = [...selectedDirectional, ...selectedCalm].sort(sampleSortKey);
  const renderedByLayer = new Map();
  for (const sample of samples) renderedByLayer.set(sample.depthLayerId, (renderedByLayer.get(sample.depthLayerId) ?? 0) + 1);
  for (const counts of classification.perLayerCounts) {
    counts.rendered = renderedByLayer.get(counts.id) ?? 0;
    counts.hiddenByDensity = Math.max(0, counts.directional + counts.calm - counts.rendered);
    classification.hiddenByDensityCount += counts.hiddenByDensity;
  }
  classification.directionalRenderedCount = selectedDirectional.length;
  classification.calmRenderedCount = selectedCalm.length;
  classification.visibleVectorInstanceCount = samples.length;
  classification.conservationCheck = classification.classifiedVectorCount === classification.hiddenByLayerFilterCount + classification.hiddenByDensityCount + samples.length;
  samples.__currentClassificationSummary = classification;
  return samples;
}
function currentLayerVisibilityFilter(viewModel = {}) {
  const waterColumn = viewModel.waterColumn ?? viewModel.displaySettings?.waterColumn ?? {};
  const hidden = new Set(Array.isArray(waterColumn.hiddenLayerIds) ? waterColumn.hiddenLayerIds.map(String) : []);
  const explicitVisible = Array.isArray(waterColumn.visibleLayerIds) && waterColumn.visibleLayerIds.length ? new Set(waterColumn.visibleLayerIds.map(String)) : null;
  return (layerId) => !hidden.has(String(layerId)) && (!explicitVisible || explicitVisible.has(String(layerId)));
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


function currentVectorDensityProfile(value, mode = 'activeCurrentSlice') {
  const requestedDensity = value ?? 'balanced';
  const text = String(requestedDensity).trim();
  const sparseVolume = mode === 'sparseVolumetricField';
  if (text === 'sparse' || text === 'low') return { id: 'sparse', requestedDensity, maxDirectionalGlyphs: sparseVolume ? 900 : 1600, maxCalmGlyphs: sparseVolume ? 300 : 600, maxGlyphSamples: sparseVolume ? 1200 : 2200 };
  if (text === 'dense' || text === 'high') return { id: 'high', requestedDensity, maxDirectionalGlyphs: sparseVolume ? 9000 : 18000, maxCalmGlyphs: sparseVolume ? 3000 : 9000, maxGlyphSamples: sparseVolume ? 12000 : 27000 };
  if (text === 'sourceDensity' || text === 'source' || text === 'all') return { id: 'sourceDensity', requestedDensity, maxDirectionalGlyphs: 45000, maxCalmGlyphs: 30000, maxGlyphSamples: 75000 };
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 1) {
    const cap = Math.max(240, Math.min(45000, Math.round(numeric)));
    return { id: 'numericBudget', requestedDensity, maxDirectionalGlyphs: Math.round(cap * 0.72), maxCalmGlyphs: Math.round(cap * 0.28), maxGlyphSamples: cap };
  }
  if (Number.isFinite(numeric) && numeric > 0 && numeric < 1) {
    const cap = Math.max(240, Math.round(12000 * numeric));
    return { id: 'fractionalBudget', requestedDensity, maxDirectionalGlyphs: Math.round(cap * 0.72), maxCalmGlyphs: Math.round(cap * 0.28), maxGlyphSamples: cap };
  }
  return { id: 'balanced', requestedDensity, maxDirectionalGlyphs: sparseVolume ? 4200 : 12000, maxCalmGlyphs: sparseVolume ? 1600 : 6000, maxGlyphSamples: sparseVolume ? 5800 : 18000 };
}

function deterministicLayerDecimate(samples = [], limit = 0) {
  const max = Math.max(0, Math.floor(Number(limit) || 0));
  if (!max || samples.length <= max) return [...samples];
  const groups = new Map();
  for (const sample of samples) {
    const key = String(sample.depthLayerId ?? sample.depthMeters ?? 'unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sample);
  }
  const result = [];
  const perLayerLimit = Math.max(1, Math.floor(max / Math.max(1, groups.size)));
  for (const group of groups.values()) {
    const sorted = [...group].sort(sampleSortKey);
    const stride = Math.max(1, Math.ceil(sorted.length / perLayerLimit));
    for (let index = 0; index < sorted.length && result.length < max; index += stride) result.push(sorted[index]);
  }
  if (result.length < max) {
    const already = new Set(result.map((sample) => sample.id ?? `${sample.depthLayerId}:${sample.x}:${sample.y}:${sample.__sourceIndex}`));
    for (const sample of [...samples].sort(sampleSortKey)) {
      const id = sample.id ?? `${sample.depthLayerId}:${sample.x}:${sample.y}:${sample.__sourceIndex}`;
      if (already.has(id)) continue;
      result.push(sample);
      already.add(id);
      if (result.length >= max) break;
    }
  }
  return result.slice(0, max).sort(sampleSortKey);
}

function sampleSortKey(a = {}, b = {}) {
  const ad = String(a.depthLayerId ?? '');
  const bd = String(b.depthLayerId ?? '');
  if (ad !== bd) return ad.localeCompare(bd);
  const ay = Number(a.y ?? a.northMeters ?? 0);
  const by = Number(b.y ?? b.northMeters ?? 0);
  if (ay !== by) return ay - by;
  const ax = Number(a.x ?? a.eastMeters ?? 0);
  const bx = Number(b.x ?? b.eastMeters ?? 0);
  if (ax !== bx) return ax - bx;
  return Number(a.__sourceIndex ?? 0) - Number(b.__sourceIndex ?? 0);
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
