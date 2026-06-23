import { buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';

export function buildFlowR2A5CurrentDynamicsMetrics(options = {}) {
  const fixture = buildNormalGeneratedCurrentViewModel(options);
  const viewModel = fixture.viewModel;
  const field = viewModel.waterColumnExplorer.currentCube;
  const summary = viewModel.waterColumnExplorer.currentFieldSummary;
  const column = findWetColumn(field, options.minimumDepthCount ?? 5);
  const timeA = field.timeAxisSeconds[0] ?? 0;
  const timeB = field.timeAxisSeconds[Math.min(2, field.timeAxisSeconds.length - 1)] ?? timeA;
  const depthSamplesA = field.depthAxisMeters.map((depthMeters) => sampleOceanCurrent({ field, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters, timeSeconds: timeA, interpolation: 'linear4d' })).filter((sample) => sample.wet === true);
  const depthSamplesB = field.depthAxisMeters.map((depthMeters) => sampleOceanCurrent({ field, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters, timeSeconds: timeB, interpolation: 'linear4d' })).filter((sample) => sample.wet === true);
  const testDepth = depthSamplesA[Math.min(2, depthSamplesA.length - 1)]?.depthMeters ?? field.depthAxisMeters[0] ?? 0;
  const timeSamples = field.timeAxisSeconds.map((timeSeconds) => sampleOceanCurrent({ field, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters: testDepth, timeSeconds, interpolation: 'linear4d' }));
  const midpointSample = sampleOceanCurrent({ field, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters: testDepth, timeSeconds: (timeA + timeB) / 2, interpolation: 'linear4d' });
  const stacked = renderSummaryFor(viewModel, 'stackedDepthField');
  const sparse = renderSummaryFor(viewModel, 'sparseVolumetricField');
  const active = renderSummaryFor(viewModel, 'activeSlice');
  const glyphLengthOrdering = glyphOrdering(stacked);
  const layerStats = viewModel.waterColumnExplorer.layers.map((layer) => ({
    id: layer.id,
    depthMeters: layer.representativeDepthMeters,
    visibleSampleCount: (layer.currentField?.vectors ?? []).filter((vector) => vector.visible !== false).length,
    directionalSampleCount: (layer.currentField?.vectors ?? []).filter((vector) => vector.visible !== false && vector.calm !== true).length,
    calmSampleCount: (layer.currentField?.vectors ?? []).filter((vector) => vector.visible !== false && vector.calm === true).length,
    magnitude: layer.currentMagnitudeStatistics
  }));
  const displayModeSamples = ['hidden', 'activeSlice', 'stackedDepthField', 'explodedDepthField', 'sparseVolumetricField'].map((mode) => ({
    mode,
    digest: field.digest,
    sample: sampleOceanCurrent({ field, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters: testDepth, timeSeconds: timeB, interpolation: 'linear4d' })
  }));
  return {
    fixture,
    viewModel,
    field,
    summary,
    diagnostics: summary.diagnostics,
    column,
    sourceDepthAxis: [...field.depthAxisMeters],
    sourceTimeAxis: [...field.timeAxisSeconds],
    componentIds: summary.componentIds ?? field.sourceMetadata?.componentIds ?? [],
    depthSamplesA,
    depthSamplesB,
    timeSamples,
    midpointSample,
    depthDistinctness: distinctVectors(depthSamplesA),
    timeDistinctness: distinctVectors(timeSamples),
    stacked,
    sparse,
    active,
    layerStats,
    glyphLengthOrdering,
    displayModeSamples,
    displayModeDigestCount: new Set(displayModeSamples.map((entry) => entry.digest)).size,
    displayModeCurrentSampleCount: new Set(displayModeSamples.map((entry) => `${entry.sample.uEastMetersPerSecond},${entry.sample.vNorthMetersPerSecond}`)).size,
    sourceBottomDepthAtColumn: column.bottomDepthMeters,
    sourceWetDepthCountAtColumn: column.depthCount,
    currentDebug: fixture.currentDebug
  };
}

export function renderSummaryFor(viewModel, currentDisplayMode = 'stackedDepthField') {
  const cloned = {
    ...viewModel,
    waterColumn: { ...(viewModel.waterColumn ?? {}), currentDisplayMode, showContextCurrents: currentDisplayMode !== 'activeSlice' },
    displaySettings: {
      ...(viewModel.displaySettings ?? {}),
      waterColumn: { ...(viewModel.displaySettings?.waterColumn ?? {}), currentDisplayMode, showContextCurrents: currentDisplayMode !== 'activeSlice' }
    }
  };
  const layer = createThreeInstancedCurrentGlyphLayer();
  updateThreeInstancedCurrentGlyphLayer(layer, cloned);
  return threeInstancedCurrentGlyphLayerSummary(layer, cloned);
}

export function findWetColumn(field, minimumDepthCount = 5) {
  let best = null;
  for (let y = 0; y < (field.northAxisMeters?.length ?? 0); y += 1) {
    for (let x = 0; x < (field.eastAxisMeters?.length ?? 0); x += 1) {
      if (field.wetMask?.[y]?.[x] === false) continue;
      const bottom = Number(field.bottomDepthMeters?.[y]?.[x] ?? 0);
      const depthCount = (field.depthAxisMeters ?? []).filter((depth) => Number(depth) <= bottom + 1e-6).length;
      const candidate = { x, y, eastMeters: Number(field.eastAxisMeters?.[x] ?? x), northMeters: Number(field.northAxisMeters?.[y] ?? y), bottomDepthMeters: bottom, depthCount };
      if (depthCount >= minimumDepthCount) return candidate;
      if (!best || depthCount > best.depthCount) best = candidate;
    }
  }
  return best ?? { x: 0, y: 0, eastMeters: 0, northMeters: 0, bottomDepthMeters: 0, depthCount: 0 };
}

export function distinctVectors(samples = [], digits = 4) {
  return new Set(samples.filter((sample) => sample.wet !== false).map((sample) => `${Number(sample.uEastMetersPerSecond).toFixed(digits)},${Number(sample.vNorthMetersPerSecond).toFixed(digits)}`)).size;
}

function glyphOrdering(summary = {}) {
  return {
    physicalMagnitudeVaries: Number(summary.canonicalMagnitudeMaximum ?? 0) > Number(summary.canonicalMagnitudeMinimum ?? 0),
    glyphLengthVaries: Number(summary.glyphLengthMaximum ?? 0) > Number(summary.glyphLengthMinimum ?? 0),
    calmCount: Number(summary.calmVectorCount ?? 0),
    magnitudeBinCount: Number(summary.distinctMagnitudeBinCount ?? 0)
  };
}
