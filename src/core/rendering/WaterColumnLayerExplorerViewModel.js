import { buildBottomBoundaryViewModel } from './BottomBoundaryViewModel.js';
import { buildOperationalDepthLayerViewModel } from './OperationalDepthLayerViewModel.js';
import { collapseWaterColumnField, waterColumnFieldStats } from '../science/WaterColumnFieldModel.js';
import { sampleScalarFieldContinuous, sampleVectorFieldContinuous } from '../science/VolumetricFieldSampler.js';
import { getSyntheticCurrentCubeFromMissionWorld } from '../science/SyntheticCurrentCubeAdapter.js';
import { getOceanCurrentSampler, sampleOceanCurrent } from '../science/OceanCurrentFieldSampler.js';
import { incrementSimulationLaunchCounter } from '../runtime/SimulationLaunchProfiler.js';
import { oceanCurrentField4DSummary } from '../science/OceanCurrentField4D.js';
import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  waterColumnLayerMetadata
} from '../science/WaterColumnSchema.js';

export const WATER_COLUMN_LAYER_EXPLORER_VERSION = 'water-column-layer-explorer-dive-r1-1';
export const WATER_COLUMN_LAYER_DISPLAY_MODES = Object.freeze([
  'activeSlice',
  'stackedSlabs',
  'explodedSlabs',
  'integratedWaterColumn',
  'verticalProfile',
  'layerDifference',
  'verticalGradient',
  'activeCurrentSlice',
  'stackedCurrentSlabs',
  'explodedCurrentSlabs',
  'currentVerticalProfile',
  'depthAverageCurrent'
]);

const currentRenderSampleCache = new WeakMap();
const currentRenderSampleCacheStats = { buildCount: 0, hitCount: 0, missCount: 0, cameraInvalidationCount: 0 };

export function resetWaterColumnCurrentRenderSampleCache() {
  currentRenderSampleCacheStats.buildCount = 0;
  currentRenderSampleCacheStats.hitCount = 0;
  currentRenderSampleCacheStats.missCount = 0;
  currentRenderSampleCacheStats.cameraInvalidationCount = 0;
}

export function waterColumnCurrentRenderSampleCacheSummary() {
  return { ...currentRenderSampleCacheStats };
}

const VARIABLE_ALIASES = Object.freeze({
  science: 'scienceValue',
  sampleValue: 'scienceValue',
  expected: 'expectedValue',
  expectedValue: 'expectedValue',
  remaining: 'remainingValue',
  current: 'current',
  currentMagnitude: 'currentMagnitude',
  uncertainty: 'forecastUncertainty',
  forecastUncertainty: 'forecastUncertainty',
  informationGain: 'informationGain',
  terrainClearance: 'terrainClearance',
  depthCoverage: 'depthCoverage'
});

export function buildWaterColumnLayerExplorerViewModel(options = {}) {
  incrementSimulationLaunchCounter('currentViewModelBuildCount');
  const level = options.level ?? null;
  const mission = options.mission ?? null;
  const grid = options.grid ?? level?.world?.grid ?? options.baseViewModel?.grid ?? { width: 0, height: 0 };
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? level?.world?.waterColumnConfig ?? mission?.waterColumnConfig ?? mission?.world?.waterColumnConfig ?? { depthLayerIds: ['surface'] });
  const activeVariable = normalizeVariable(options.activeVariable ?? options.displaySettings?.activeVariable ?? options.displaySettings?.selectedScalarFieldId ?? options.selectedFieldId ?? 'scienceValue');
  const activeLayerId = normalizeLayer(options.activeLayerId ?? options.displaySettings?.activeDepthLayerId ?? waterColumnConfig.defaultPlanningLayerId ?? waterColumnConfig.depthLayerIds[0] ?? 'surface', waterColumnConfig);
  const displayMode = normalizeDisplayMode(options.displayMode ?? options.displaySettings?.displayMode ?? options.displaySettings?.verticalDisplayMode ?? 'activeSlice');
  const bottomBoundary = options.bottomBoundary ?? buildBottomBoundaryViewModel({ level, grid });
  const operational = options.operationalDepthLayerModel ?? buildOperationalDepthLayerViewModel({ waterColumnConfig, bottomBoundary, grid, activeDepthLayerId: activeLayerId, verticalDisplayMode: displayMode === 'explodedSlabs' ? 'explodedLayers' : 'physicalDepth' });
  const currentCube = options.currentField4D ?? options.oceanCurrentField4D ?? getSyntheticCurrentCubeFromMissionWorld({ level, baseViewModel: options.baseViewModel, waterColumnConfig, grid });
  const source = normalizeFieldSources({ level, baseViewModel: options.baseViewModel, waterColumnConfig, grid, currentCube });
  const layers = waterColumnConfig.depthLayerIds.map((layerId, index) => buildExplorerLayer({ layerId, index, waterColumnConfig, source, bottomBoundary, grid, currentCube, activeTimeSeconds: options.activeTimeSeconds ?? 0 }));
  const integratedField = source.scalarField.length ? collapseWaterColumnField(source.scalarField, waterColumnConfig, { method: 'integratedProfile' }) : [];
  const selectedLocation = normalizeSelectedLocation(options.selectedLocation ?? options.baseViewModel?.selectedDepthCell ?? options.baseViewModel?.selectedCell ?? options.baseViewModel?.selection?.selectedCell, grid, activeLayerId);
  const selectedVerticalProfile = buildSelectedVerticalProfile({ selectedLocation, waterColumnConfig, source, activeTimeSeconds: options.activeTimeSeconds ?? 0 });
  const selectedCurrentProfile = buildSelectedCurrentProfile({ selectedLocation, waterColumnConfig, source, activeTimeSeconds: options.activeTimeSeconds ?? 0 });
  const interpolation = interpolationForDepth(selectedLocation.depthMeters, waterColumnConfig);
  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? layers[0] ?? null;
  const comparisonLayerId = normalizeLayer(options.comparisonLayerId ?? options.displaySettings?.comparisonLayerId ?? nextComparisonLayer(activeLayerId, waterColumnConfig), waterColumnConfig);
  const comparisonLayer = layers.find((layer) => layer.id === comparisonLayerId) ?? null;
  const activeScalarSourceDigest = activeLayer?.sourceDigest?.scalar ?? null;
  const activeCurrentSourceDigest = activeLayer?.sourceDigest?.current ?? null;
  return {
    type: 'anchor.rendering.water-column-layer-explorer-view-model',
    version: WATER_COLUMN_LAYER_EXPLORER_VERSION,
    activeTimeSeconds: finiteNumber(options.activeTimeSeconds ?? options.timeSeconds, 0),
    activeVariable,
    activeLayerId,
    activeDepthMeters: activeLayer?.representativeDepthMeters ?? Number(waterColumnLayerMetadata(activeLayerId).nominalDepthMeters ?? 0),
    layers,
    displayMode,
    comparisonLayerId,
    interpolationMode: source.scalarField.length > 1 ? 'deterministicTrilinearDepthInterpolation' : 'singleLayer',
    integratedSummary: {
      id: 'integratedWaterColumn',
      label: 'Integrated Water Column',
      derived: true,
      physicalDepthPlane: false,
      scalarField: integratedField,
      statistics: fieldStats2d(integratedField),
      sourceDigest: `integrated-${hashStable({ layers: layers.map((layer) => layer.sourceDigest.scalar), method: 'integratedProfile' })}`
    },
    selectedLocation,
    selectedVerticalProfile,
    legend: legendFor(activeVariable, activeLayer),
    sourceResolution: { columns: source.width, rows: source.height, depthLayers: waterColumnConfig.depthLayerIds.length, timeSteps: source.timeCoordinates.length || 1 },
    displayResolution: { columns: grid.width ?? source.width, rows: grid.height ?? source.height },
    operationalLayerSummary: operational,
    lowerInterpolationLayerId: interpolation.lowerLayerId,
    upperInterpolationLayerId: interpolation.upperLayerId,
    interpolationFraction: interpolation.fraction,
    activeScalarSourceDigest,
    activeCurrentSourceDigest,
    currentCube,
    currentFieldSummary: currentCube ? oceanCurrentField4DSummary(currentCube) : null,
    selectedCurrentProfile,
    currentDisplayModes: ['activeCurrentSlice', 'stackedCurrentSlabs', 'explodedCurrentSlabs', 'currentVerticalProfile', 'depthAverageCurrent'],
    boundaryFlags: {
      publicSafe: true,
      hiddenTruthIncluded: false,
      displayOwnsScience: false,
      displayOwnsCurrent: false,
      displayOwnsSampling: false,
      displayChangesScoring: false,
      ownsSimulation: false,
      ownsPlanning: false,
      ownsScoring: false,
      usesNewPlanner: false,
      integratedWaterColumnIsDerived: true,
      slabsSnapCanonicalDepth: false
    },
    warnings: []
  };
}

export function waterColumnLayerExplorerSummary(model = {}) {
  return {
    type: 'anchor.rendering.water-column-layer-explorer-summary',
    version: model.version ?? WATER_COLUMN_LAYER_EXPLORER_VERSION,
    activeVariable: model.activeVariable ?? null,
    activeLayerId: model.activeLayerId ?? null,
    activeDepthMeters: model.activeDepthMeters ?? null,
    displayMode: model.displayMode ?? null,
    comparisonLayerId: model.comparisonLayerId ?? null,
    interpolationMode: model.interpolationMode ?? null,
    layerCount: model.layers?.length ?? 0,
    physicalLayerCount: (model.layers ?? []).filter((layer) => layer.id !== 'integratedWaterColumn').length,
    includesIntegratedSummary: Boolean(model.integratedSummary),
    selectedEastMeters: model.selectedLocation?.x ?? null,
    selectedNorthMeters: model.selectedLocation?.y ?? null,
    selectedActualDepthMeters: model.selectedLocation?.depthMeters ?? null,
    lowerInterpolationLayerId: model.lowerInterpolationLayerId ?? null,
    upperInterpolationLayerId: model.upperInterpolationLayerId ?? null,
    interpolationFraction: model.interpolationFraction ?? null,
    activeScalarSourceDigest: model.activeScalarSourceDigest ?? null,
    activeCurrentSourceDigest: model.activeCurrentSourceDigest ?? null,
    sourceColumns: model.sourceResolution?.columns ?? null,
    sourceRows: model.sourceResolution?.rows ?? null,
    displayColumns: model.displayResolution?.columns ?? null,
    displayRows: model.displayResolution?.rows ?? null,
    texturedSlabCount: model.displayMode === 'integratedWaterColumn' ? 1 : 1,
    contextSlabCount: Math.max(0, (model.layers?.length ?? 0) - 1),
    vectorGlyphCount: (model.layers ?? []).reduce((sum, layer) => sum + (layer.currentField?.vectors?.length ?? 0), 0),
    selectedCurrentProfileSampleCount: model.selectedCurrentProfile?.samplesByDepth?.length ?? 0,
    currentSourceDigest: model.currentFieldSummary?.digest ?? model.activeCurrentSourceDigest ?? null,
    displayOwnsScience: model.boundaryFlags?.displayOwnsScience === true,
    displayOwnsCurrent: model.boundaryFlags?.displayOwnsCurrent === true,
    displayOwnsSampling: model.boundaryFlags?.displayOwnsSampling === true,
    displayChangesScoring: model.boundaryFlags?.displayChangesScoring === true,
    warnings: [...(model.warnings ?? [])]
  };
}

export function validateWaterColumnLayerExplorerViewModel(model = {}) {
  const errors = [];
  const warnings = [...(model.warnings ?? [])];
  if (model.type !== 'anchor.rendering.water-column-layer-explorer-view-model') errors.push('Water-column explorer model type is invalid.');
  if (!Array.isArray(model.layers) || !model.layers.length) errors.push('Water-column explorer requires physical layers.');
  if (!WATER_COLUMN_LAYER_DISPLAY_MODES.includes(model.displayMode)) errors.push(`Unsupported water-column display mode: ${model.displayMode}.`);
  if (model.boundaryFlags?.hiddenTruthIncluded === true) errors.push('Water-column explorer must not expose hidden truth.');
  if (model.boundaryFlags?.displayChangesScoring === true) errors.push('Water-column explorer display must not change scoring.');
  if (model.boundaryFlags?.displayOwnsScience === true || model.boundaryFlags?.displayOwnsCurrent === true || model.boundaryFlags?.displayOwnsSampling === true) errors.push('Water-column explorer must not own science/current/sampling semantics.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: waterColumnLayerExplorerSummary(model) };
}

function buildExplorerLayer({ layerId, index, waterColumnConfig, source, bottomBoundary, grid, currentCube, activeTimeSeconds = 0 }) {
  const metadata = waterColumnLayerMetadata(layerId);
  const representativeDepthMeters = Number(metadata.nominalDepthMeters ?? index);
  const scalarField = layer2d(source.scalarField, index, grid, 0);
  const uncertaintyField = layer2d(source.uncertaintyField, index, grid, null);
  const remainingValueField = layer2d(source.remainingValueField, index, grid, null);
  const legacyCurrentField = vectorLayer(source.currentField, index, grid);
  const currentField = currentCube ? currentLayerFromCube({ field: currentCube, layerId, representativeDepthMeters, grid, activeTimeSeconds, terrainMask: null }) : legacyCurrentField;
  const terrainMask = Array.from({ length: grid.height ?? scalarField.length }, (_row, row) => Array.from({ length: grid.width ?? scalarField[0]?.length ?? 0 }, (_cell, col) => {
    if (bottomBoundary.landMask?.[row]?.[col]) return false;
    const bottom = Number(bottomBoundary.bottomDepthField?.[row]?.[col] ?? Infinity);
    return bottom >= representativeDepthMeters;
  }));
  return {
    id: layerId,
    label: metadata.label ?? labelize(layerId),
    representativeDepthMeters,
    depthRangeMeters: {
      min: round(Math.max(0, representativeDepthMeters - Number(metadata.thicknessMeters ?? 0) / 2)),
      max: round(representativeDepthMeters + Number(metadata.thicknessMeters ?? 0) / 2)
    },
    scalarField,
    currentField,
    currentMagnitudeStatistics: currentVectorStats(currentField.vectors ?? []),
    currentSourceDigest: currentCube?.digest ?? `current-${layerId}-${hashStable(currentField.vectors ?? [])}`,
    currentAvailable: (currentField.vectors ?? []).some((vector) => vector.visible !== false),
    representativeCurrentSamples: representativeCurrentSamples(currentField.vectors ?? []),
    uncertaintyField,
    remainingValueField,
    terrainMask,
    statistics: fieldStats2d(scalarField),
    sourceDigest: {
      scalar: `scalar-${layerId}-${hashStable(scalarField)}`,
      current: `current-${layerId}-${hashStable(currentField.vectors ?? [])}`,
      uncertainty: uncertaintyField ? `uncertainty-${layerId}-${hashStable(uncertaintyField)}` : null,
      remainingValue: remainingValueField ? `remaining-${layerId}-${hashStable(remainingValueField)}` : null
    },
    publicSafe: true,
    hiddenTruthIncluded: false,
    fieldSource: source.sourceLabel,
    layerIndex: index,
    availableVariables: availableVariablesFor({ scalarField, currentField, uncertaintyField, remainingValueField })
  };
}

function buildSelectedVerticalProfile({ selectedLocation, waterColumnConfig, source, activeTimeSeconds }) {
  const x = selectedLocation.x;
  const y = selectedLocation.y;
  return waterColumnConfig.depthLayerIds.map((layerId) => {
    const depthMeters = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
    const scalar = source.scalarField.length ? sampleScalarFieldContinuous({ field: source.scalarField, x, y, depthMeters, timeSeconds: activeTimeSeconds, depthCoordinates: source.depthCoordinates, timeCoordinates: source.timeCoordinates, interpolationProfileId: 'trilinearVolumeV1' }) : null;
    const vector = source.currentCube
      ? sampleOceanCurrent({ field: source.currentCube, eastMeters: x, northMeters: y, depthMeters, timeSeconds: activeTimeSeconds, interpolation: 'linear4d' })
      : source.currentField ? sampleVectorFieldContinuous({ field: source.currentField, x, y, depthMeters, timeSeconds: activeTimeSeconds, depthCoordinates: source.depthCoordinates, timeCoordinates: source.timeCoordinates, interpolationProfileId: 'trilinearVolumeV1' }) : null;
    return {
      layerId,
      depthMeters,
      scienceValue: scalar?.value ?? null,
      current: vector ? { u: vector.uEastMetersPerSecond ?? vector.vector?.u ?? 0, v: vector.vNorthMetersPerSecond ?? vector.vector?.v ?? 0, w: vector.wDownMetersPerSecond ?? vector.vector?.w ?? 0 } : null,
      currentMagnitude: vector?.magnitudeMetersPerSecond ?? vector?.magnitude ?? null,
      uEastMetersPerSecond: vector?.uEastMetersPerSecond ?? vector?.vector?.u ?? null,
      vNorthMetersPerSecond: vector?.vNorthMetersPerSecond ?? vector?.vector?.v ?? null,
      bearingDegrees: vector?.bearingDegrees ?? null,
      uncertainty: source.uncertaintyField.length ? sampleScalarFieldContinuous({ field: source.uncertaintyField, x, y, depthMeters, timeSeconds: activeTimeSeconds, depthCoordinates: source.depthCoordinates, timeCoordinates: source.timeCoordinates, interpolationProfileId: 'trilinearVolumeV1' }).value : null,
      valid: scalar?.valid !== false
    };
  });
}

function normalizeFieldSources({ level, baseViewModel, waterColumnConfig, grid, currentCube = null }) {
  const wc = level?.layers?.waterColumn ?? level?.waterColumn ?? {};
  const scalarField = normalize3dField(wc.sampleValue ?? wc.scienceValue ?? wc.A_global ?? wc.expectedValue ?? baseViewModel?.layerFields?.sampleValue, waterColumnConfig, grid, baseViewModel?.scalarFieldLayer?.values);
  const remainingValueField = normalize3dField(wc.remainingValue ?? wc.remaining ?? null, waterColumnConfig, grid, null);
  const uncertaintyField = normalize3dField(wc.uncertainty ?? wc.forecastUncertainty ?? null, waterColumnConfig, grid, null);
  const currentField = normalizeCurrentField(wc.current ?? wc.vector ?? wc.currentVector ?? baseViewModel?.vectorFieldLayer, waterColumnConfig, grid);
  const depthCoordinates = Array.isArray(wc.depthCoordinates) && wc.depthCoordinates.length
    ? wc.depthCoordinates.map(Number)
    : waterColumnConfig.depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0));
  const timeCoordinates = Array.isArray(wc.timeCoordinates) && wc.timeCoordinates.length ? wc.timeCoordinates.map(Number) : [0];
  const shape = sourceShape(scalarField, grid);
  return {
    scalarField,
    remainingValueField,
    uncertaintyField,
    currentField,
    currentCube,
    depthCoordinates,
    timeCoordinates,
    width: shape.width,
    height: shape.height,
    sourceLabel: scalarField.length ? 'canonicalWaterColumnField' : 'missingField'
  };
}

function normalize3dField(value, config, grid, fallback2d = null) {
  if (Array.isArray(value) && Array.isArray(value[0]) && Array.isArray(value[0][0])) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const byLayer = config.depthLayerIds.map((id) => value[id]?.values ?? value[id] ?? null);
    if (byLayer.some(Array.isArray)) return byLayer.map((layer, index) => normalize2d(layer, grid, layerFactor(config.depthLayerIds[index], index)));
  }
  const base = normalize2d(fallback2d, grid, 0);
  if (!base.length) return [];
  return config.depthLayerIds.map((id, index) => base.map((row) => row.map((cell) => round(Number(cell ?? 0) * layerFactor(id, index)))));
}

function normalizeCurrentField(value, config, grid) {
  if (!value) return null;
  if (Array.isArray(value)) return vector3dFromArray(value, config, grid);
  if (value.u || value.v || value.F_u || value.F_v) return { u: normalize3dField(value.u ?? value.F_u, config, grid, null), v: normalize3dField(value.v ?? value.F_v, config, grid, null), w: normalize3dField(value.w ?? value.F_w, config, grid, null) };
  if (Array.isArray(value.vectors)) return vectorsToField(value.vectors, config, grid);
  return null;
}

function vector3dFromArray(value, config, grid) {
  const vectors = config.depthLayerIds.map((_id, z) => normalize2d(value[z], grid, null));
  return {
    u: vectors.map((layer) => layer.map((row) => row.map((entry) => Number(Array.isArray(entry) ? entry[0] : entry?.u ?? 0)))),
    v: vectors.map((layer) => layer.map((row) => row.map((entry) => Number(Array.isArray(entry) ? entry[1] : entry?.v ?? 0)))),
    w: vectors.map((layer) => layer.map((row) => row.map((entry) => Number(Array.isArray(entry) ? entry[2] : entry?.w ?? 0))))
  };
}

function vectorsToField(vectors = [], config, grid) {
  const blank = () => Array.from({ length: grid.height ?? 0 }, () => Array.from({ length: grid.width ?? 0 }, () => 0));
  const field = { u: config.depthLayerIds.map(blank), v: config.depthLayerIds.map(blank), w: config.depthLayerIds.map(blank) };
  for (const vector of vectors) {
    const layer = config.depthLayerIds.indexOf(vector.depthLayerId ?? config.depthLayerIds[0]);
    const z = layer >= 0 ? layer : 0;
    const x = Math.max(0, Math.min((grid.width ?? 1) - 1, Math.round(Number(vector.x ?? 0))));
    const y = Math.max(0, Math.min((grid.height ?? 1) - 1, Math.round(Number(vector.y ?? 0))));
    field.u[z][y][x] = Number(vector.u ?? 0);
    field.v[z][y][x] = Number(vector.v ?? 0);
    field.w[z][y][x] = Number(vector.w ?? 0);
  }
  return field;
}

function vectorLayer(field, index, grid) {
  if (!field) return { vectors: [] };
  const u = layer2d(field.u, index, grid, 0);
  const v = layer2d(field.v, index, grid, 0);
  const w = layer2d(field.w, index, grid, 0);
  const vectors = [];
  for (let y = 0; y < u.length; y += 1) {
    for (let x = 0; x < (u[y]?.length ?? 0); x += 1) {
      vectors.push({ x, y, u: round(u[y][x]), v: round(v[y]?.[x] ?? 0), w: round(w[y]?.[x] ?? 0), magnitude: round(Math.hypot(u[y][x], v[y]?.[x] ?? 0, w[y]?.[x] ?? 0)) });
    }
  }
  return { vectors };
}

function buildSelectedCurrentProfile({ selectedLocation, waterColumnConfig, source, activeTimeSeconds }) {
  const x = selectedLocation.x;
  const y = selectedLocation.y;
  const samplesByDepth = waterColumnConfig.depthLayerIds.map((layerId) => {
    const depthMeters = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
    const sample = source.currentCube
      ? sampleOceanCurrent({ field: source.currentCube, eastMeters: x, northMeters: y, depthMeters, timeSeconds: activeTimeSeconds, interpolation: 'linear4d' })
      : null;
    return {
      layerId,
      depthMeters,
      uEastMetersPerSecond: sample?.uEastMetersPerSecond ?? null,
      vNorthMetersPerSecond: sample?.vNorthMetersPerSecond ?? null,
      magnitudeMetersPerSecond: sample?.magnitudeMetersPerSecond ?? null,
      bearingDegrees: sample?.bearingDegrees ?? null,
      wet: sample?.wet === true,
      masked: sample?.masked === true,
      sourceDigest: sample?.source?.digest ?? source.currentCube?.digest ?? null
    };
  });
  return {
    eastMeters: x,
    northMeters: y,
    timeSeconds: activeTimeSeconds,
    samplesByDepth,
    derivedDepthAverage: depthAverageCurrent(samplesByDepth)
  };
}

function currentLayerFromCube({ field, layerId, representativeDepthMeters, grid, activeTimeSeconds }) {
  const key = `${field.digest ?? field.id ?? 'field'}:${layerId}:${roundCache(representativeDepthMeters)}:${roundCache(activeTimeSeconds)}:${grid.width ?? 0}x${grid.height ?? 0}`;
  let cache = currentRenderSampleCache.get(field);
  if (!cache) {
    cache = new Map();
    currentRenderSampleCache.set(field, cache);
  }
  if (cache.has(key)) {
    currentRenderSampleCacheStats.hitCount += 1;
    return cache.get(key);
  }
  currentRenderSampleCacheStats.missCount += 1;
  currentRenderSampleCacheStats.buildCount += 1;
  const sampler = getOceanCurrentSampler(field);
  const vectors = [];
  for (let y = 0; y < (grid.height ?? 0); y += 1) {
    for (let x = 0; x < (grid.width ?? 0); x += 1) {
      const sample = sampler.sample({ eastMeters: x, northMeters: y, depthMeters: representativeDepthMeters, timeSeconds: activeTimeSeconds, interpolation: 'linear4d' });
      vectors.push({
        id: `current-${layerId}-${x}-${y}`,
        x,
        y,
        eastMeters: x,
        northMeters: y,
        depthMeters: representativeDepthMeters,
        depthLayerId: layerId,
        timeSeconds: activeTimeSeconds,
        u: sample.uEastMetersPerSecond,
        v: sample.vNorthMetersPerSecond,
        w: sample.wDownMetersPerSecond ?? 0,
        uEastMetersPerSecond: sample.uEastMetersPerSecond,
        vNorthMetersPerSecond: sample.vNorthMetersPerSecond,
        magnitude: sample.magnitudeMetersPerSecond,
        magnitudeMetersPerSecond: sample.magnitudeMetersPerSecond,
        bearingDegrees: sample.bearingDegrees,
        visible: sample.wet === true && sample.masked !== true,
        wet: sample.wet === true,
        masked: sample.masked === true,
        belowBottom: sample.belowBottom === true,
        outsideDomain: sample.outsideDomain === true,
        sourceDigest: sample.source?.digest ?? field.digest ?? null
      });
    }
  }
  const layer = { vectors, units: 'm/s', sourceDigest: field.digest ?? null, source: field.sourceMetadata ?? null, renderSampleCacheKey: key };
  cache.set(key, layer);
  return layer;
}

function roundCache(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(3)) : 0;
}

function currentVectorStats(vectors = []) {
  const values = vectors.filter((vector) => vector.visible !== false).map((vector) => Number(vector.magnitudeMetersPerSecond ?? vector.magnitude)).filter(Number.isFinite);
  if (!values.length) return { count: 0, min: null, mean: null, max: null, units: 'm/s' };
  return { count: values.length, min: round(Math.min(...values)), mean: round(values.reduce((sum, value) => sum + value, 0) / values.length), max: round(Math.max(...values)), units: 'm/s' };
}

function representativeCurrentSamples(vectors = [], limit = 8) {
  return vectors.filter((vector) => vector.visible !== false).filter((_vector, index) => index % Math.max(1, Math.floor(vectors.length / Math.max(1, limit))) === 0).slice(0, limit).map((vector) => ({
    x: vector.x,
    y: vector.y,
    depthMeters: vector.depthMeters,
    uEastMetersPerSecond: vector.uEastMetersPerSecond,
    vNorthMetersPerSecond: vector.vNorthMetersPerSecond,
    magnitudeMetersPerSecond: vector.magnitudeMetersPerSecond,
    bearingDegrees: vector.bearingDegrees
  }));
}

function depthAverageCurrent(samples = []) {
  const valid = samples.filter((sample) => Number.isFinite(Number(sample.uEastMetersPerSecond)) && Number.isFinite(Number(sample.vNorthMetersPerSecond)));
  if (!valid.length) return { derived: true, physicalDepthPlane: false, uEastMetersPerSecond: null, vNorthMetersPerSecond: null, magnitudeMetersPerSecond: null, label: 'Depth-average current (derived)' };
  const u = valid.reduce((sum, sample) => sum + Number(sample.uEastMetersPerSecond), 0) / valid.length;
  const v = valid.reduce((sum, sample) => sum + Number(sample.vNorthMetersPerSecond), 0) / valid.length;
  return { derived: true, physicalDepthPlane: false, uEastMetersPerSecond: round(u), vNorthMetersPerSecond: round(v), magnitudeMetersPerSecond: round(Math.hypot(u, v)), label: 'Depth-average current (derived)' };
}

function interpolationForDepth(depthMeters = 0, config) {
  const coords = config.depthLayerIds.map((id) => ({ id, depth: Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0) })).sort((a, b) => a.depth - b.depth);
  const depth = Number(depthMeters);
  if (!coords.length) return { lowerLayerId: null, upperLayerId: null, fraction: 0 };
  if (!Number.isFinite(depth) || depth <= coords[0].depth) return { lowerLayerId: coords[0].id, upperLayerId: coords[0].id, fraction: 0 };
  const last = coords.at(-1);
  if (depth >= last.depth) return { lowerLayerId: last.id, upperLayerId: last.id, fraction: 0 };
  for (let index = 0; index < coords.length - 1; index += 1) {
    const lower = coords[index];
    const upper = coords[index + 1];
    if (depth >= lower.depth && depth <= upper.depth) {
      return { lowerLayerId: lower.id, upperLayerId: upper.id, fraction: round((depth - lower.depth) / Math.max(1e-9, upper.depth - lower.depth)) };
    }
  }
  return { lowerLayerId: coords[0].id, upperLayerId: coords[0].id, fraction: 0 };
}

function normalizeSelectedLocation(value = null, grid = {}, activeLayerId = 'surface') {
  const x = Number(value?.x ?? value?.col ?? Math.max(0, Math.floor((grid.width ?? 1) / 2)));
  const y = Number(value?.y ?? value?.row ?? Math.max(0, Math.floor((grid.height ?? 1) / 2)));
  const fallbackDepth = Number(waterColumnLayerMetadata(activeLayerId).nominalDepthMeters ?? 0);
  const depthMeters = Number(value?.depthMeters ?? fallbackDepth);
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0, depthMeters: Number.isFinite(depthMeters) ? depthMeters : fallbackDepth };
}

function normalizeLayer(value, config) {
  const text = String(value ?? '').trim();
  if (config.depthLayerIds.includes(text)) return text;
  return config.depthLayerIds[0] ?? 'surface';
}

function normalizeDisplayMode(value) {
  const text = String(value ?? '').trim();
  if (text === 'physicalDepth') return 'stackedSlabs';
  if (text === 'explodedLayers') return 'explodedSlabs';
  if (text === 'Active Current Slice') return 'activeCurrentSlice';
  if (text === 'Stacked Current Slabs') return 'stackedCurrentSlabs';
  if (text === 'Exploded Current Slabs') return 'explodedCurrentSlabs';
  if (text === 'Current Vertical Profile') return 'currentVerticalProfile';
  if (text === 'Depth-Average Current') return 'depthAverageCurrent';
  return WATER_COLUMN_LAYER_DISPLAY_MODES.includes(text) ? text : 'activeSlice';
}

function normalizeVariable(value) {
  const text = String(value ?? '').trim();
  return VARIABLE_ALIASES[text] ?? 'scienceValue';
}

function nextComparisonLayer(activeLayerId, config) {
  return config.depthLayerIds.find((id) => id !== activeLayerId) ?? activeLayerId;
}

function availableVariablesFor({ scalarField, currentField, uncertaintyField, remainingValueField }) {
  return [
    scalarField?.length ? 'scienceValue' : null,
    scalarField?.length ? 'expectedValue' : null,
    remainingValueField?.length ? 'remainingValue' : null,
    currentField?.vectors?.length ? 'current' : null,
    currentField?.vectors?.length ? 'currentMagnitude' : null,
    uncertaintyField?.length ? 'forecastUncertainty' : null,
    'terrainClearance',
    'depthCoverage'
  ].filter(Boolean);
}

function legendFor(activeVariable, activeLayer) {
  const stats = activeLayer?.statistics ?? {};
  return { variable: activeVariable, min: stats.min ?? null, max: stats.max ?? null, mean: stats.mean ?? null, units: activeVariable === 'current' || activeVariable === 'currentMagnitude' ? 'relative current' : 'normalized value', syntheticTeachingModel: true };
}

function layer2d(field, index, grid, fallback = 0) {
  if (!Array.isArray(field)) return fallback === null ? null : [];
  const layer = Array.isArray(field[index]?.[0]) ? field[index] : field;
  return normalize2d(layer, grid, fallback);
}

function normalize2d(value, grid, fallback = 0) {
  if (!Array.isArray(value)) return fallback === null ? null : [];
  const height = grid.height ?? value.length;
  const width = grid.width ?? value[0]?.length ?? 0;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const raw = value[y]?.[x];
    const number = Number(Array.isArray(raw) ? raw[0] : raw);
    return Number.isFinite(number) ? round(number) : fallback;
  }));
}

function fieldStats2d(field = []) {
  const values = (field ?? []).flat().map(Number).filter(Number.isFinite);
  if (!values.length) return { count: 0, min: null, max: null, mean: null };
  return { count: values.length, min: round(Math.min(...values)), max: round(Math.max(...values)), mean: round(values.reduce((sum, value) => sum + value, 0) / values.length) };
}

function sourceShape(field, grid) {
  return { width: field?.[0]?.[0]?.length ?? grid.width ?? 0, height: field?.[0]?.length ?? grid.height ?? 0 };
}

function layerFactor(id, index) {
  if (id === 'surface') return 1;
  if (id === 'shallow') return 1.12;
  if (id === 'thermocline') return 1.28;
  if (id === 'midwater') return 0.94;
  if (id === 'deep') return 0.82;
  return 1 + index * 0.04;
}

function hashStable(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function labelize(value) {
  return String(value ?? '').replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (char) => char.toUpperCase());
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
