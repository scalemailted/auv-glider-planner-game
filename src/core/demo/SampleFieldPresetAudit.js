import { createDemoRoiField } from './DemoRoiFields.js';
import { SAMPLE_FIELD_BEHAVIOR_PRESETS, sampleFieldBehaviorPresetById } from './SampleFieldBehaviorPresets.js';
import { roiProcessContractForPreset } from './roi/RoiProcessContracts.js';

const DEFAULT_TIMES = [0, 6, 12, 18, 24, 30, 36, 42, 48, 60];

export function validateSampleFieldPreset(presetId, options = {}) {
  const preset = sampleFieldBehaviorPresetById(presetId);
  if (!preset) {
    return {
      presetId,
      label: 'Unknown preset',
      status: 'FAIL',
      warnings: ['missing_preset'],
      frames: []
    };
  }
  const seed = options.seed ?? `preset-audit:${preset.id}`;
  const processContract = roiProcessContractForPreset(preset.id, preset.config);
  const times = Array.isArray(options.times) && options.times.length ? options.times : DEFAULT_TIMES;
  const frames = times.map((time) => {
    const field = createDemoRoiField({
      ...preset.config,
      seed,
      time,
      demoTime: time
    });
    return summarizePresetFrame(field, time);
  });
  const deltas = [];
  for (let index = 1; index < frames.length; index += 1) {
    deltas.push(frameDelta(frames[index - 1].sampleValueField, frames[index].sampleValueField));
  }
  const activeFractions = frames.map((frame) => frame.activeCellFraction);
  const highFractions = frames.map((frame) => frame.highValueCellFraction);
  const masses = frames.map((frame) => frame.totalActivityMass);
  const means = frames.map((frame) => frame.meanValue);
  const maxValues = frames.map((frame) => frame.maxValue);
  const ranges = frames.map((frame) => frame.dynamicRange);
  const rareExtremeFractions = frames.map((frame) => frame.rareExtremeFraction);
  const heavyTailIndicators = frames.map((frame) => frame.heavyTailIndicator);
  const bimodalSeparations = frames.map((frame) => frame.bimodalSeparation);
  const bboxCoverages = frames.map((frame) => frame.activeBoundingBoxCoverage);
  const maxComponents = Math.max(...frames.map((frame) => frame.connectedComponents));
  const graphFrames = frames.filter((frame) => frame.graphUpdateRule && frame.graphUpdateRule !== 'memoryless');
  const meanDelta = mean(deltas);
  const meanSpatialCorrelation = mean(frames.map((frame) => frame.spatialCorrelation));
  const centerMovement = totalCenterMovement(frames.map((frame) => frame.centerOfMass));
  const avgComponents = mean(frames.map((frame) => frame.connectedComponents));
  const warnings = [];
  if (consecutiveBelow(activeFractions, 0.02, 3)) warnings.push('extinction_risk');
  if (consecutiveSaturation(frames, 3)) warnings.push('saturation_risk');
  if (preset.config.timeMode === 'dynamic' && meanDelta < 0.012) warnings.push('dynamic_static_risk');
  if (meanDelta > 0.34 && meanSpatialCorrelation < 0.24) warnings.push('random_flicker_risk');
  if (preset.id === 'migratingPatch' && centerMovement < 0.08) warnings.push('movement_too_subtle');
  if (preset.id === 'driftingStormCells' && maxComponents < 2) warnings.push('not_enough_distinct_cells');
  if ((preset.id === 'expandingFront' || preset.id === 'forestFireFrontInspired') && avgComponents > 14) warnings.push('front_too_speckled');
  if (['recurringHotspots', 'patchyRainfall', 'neighborSpread'].includes(preset.id) && mean(bboxCoverages) < 0.18) warnings.push('low_domain_coverage');
  if (graphFrames.length && graphFrames.some((frame) => !frame.graphDiagnosticsPresent)) warnings.push('missing_graph_diagnostics');
  if (graphFrames.length && mean(graphFrames.map((frame) => frame.graphEngagedNodeCount)) < 1) warnings.push('graph_extinction_risk');
  if (graphFrames.length && graphFrames.every((frame) => frame.graphSaturationWarning)) warnings.push('graph_saturation_risk');
  if (preset.id === 'recurringHotspots' && Math.max(...frames.map((frame) => frame.graphClusterCount)) < 3) warnings.push('too_few_recurring_clusters');
  if (preset.id === 'recurringHotspots' && Math.min(...frames.map((frame) => frame.graphMinClusterSeparation || 1)) < 0.16) warnings.push('recurring_clusters_too_close');
  return {
    presetId: preset.id,
    label: preset.label,
    processClass: processContract.processClass,
    interactionScale: processContract.interactionScale,
    validationSignature: processContract.validationSignature,
    status: warnings.length ? 'WARN' : 'PASS',
    warnings,
    summary: {
      meanValue: round3(mean(means)),
      maxValue: round3(mean(maxValues)),
      minActiveCellFraction: round3(Math.min(...activeFractions)),
      meanActiveCellFraction: round3(mean(activeFractions)),
      meanHighValueCellFraction: round3(mean(highFractions)),
      meanTotalActivityMass: round3(mean(masses)),
      meanDynamicRange: round3(mean(ranges)),
      meanRareExtremeFraction: round3(mean(rareExtremeFractions)),
      meanHeavyTailIndicator: round3(mean(heavyTailIndicators)),
      meanBimodalSeparation: round3(mean(bimodalSeparations)),
      meanActiveBoundingBoxCoverage: round3(mean(bboxCoverages)),
      meanFrameDelta: round3(meanDelta),
      centerOfMassMovement: round3(centerMovement),
      meanConnectedComponents: round3(avgComponents),
      meanSpatialCorrelation: round3(meanSpatialCorrelation),
      graphUpdateRules: [...new Set(frames.map((frame) => frame.graphUpdateRule).filter(Boolean))],
      meanGraphClusterCount: round3(mean(graphFrames.map((frame) => frame.graphClusterCount))),
      minGraphClusterSeparation: round3(finiteMin(graphFrames.map((frame) => frame.graphMinClusterSeparation).filter((value) => Number.isFinite(value) && value > 0))),
      meanGraphActiveNodeCount: round3(mean(graphFrames.map((frame) => frame.graphActiveNodeCount))),
      meanGraphEngagedNodeCount: round3(mean(graphFrames.map((frame) => frame.graphEngagedNodeCount))),
      meanGraphMessageTotal: round3(mean(graphFrames.map((frame) => frame.graphMessageTotal)))
    },
    frames: frames.map(({ sampleValueField: _sampleValueField, ...frame }) => frame)
  };
}

export function validateSampleFieldPresets(options = {}) {
  return SAMPLE_FIELD_BEHAVIOR_PRESETS.map((preset) => validateSampleFieldPreset(preset.id, options));
}

function summarizePresetFrame(field, time) {
  const sampleValueField = field.sampleValueField ?? field.field ?? [];
  const stats = field.activityDiagnostics ?? field.stats ?? {};
  const graphDiagnostics = field.activityDiagnostics?.graphDiagnostics ?? field.graphField?.diagnostics ?? null;
  const flat = sampleValueField.flat().map((value) => Number(value) || 0);
  const sorted = [...flat].sort((a, b) => a - b);
  const cellCount = Math.max(1, flat.length);
  const p10 = percentileSorted(sorted, 0.1);
  const p25 = percentileSorted(sorted, 0.25);
  const p75 = percentileSorted(sorted, 0.75);
  const p90 = percentileSorted(sorted, 0.9);
  const p99 = percentileSorted(sorted, 0.99);
  return {
    time,
    meanValue: round3(stats.meanValue ?? stats.mean ?? mean(flat)),
    maxValue: round3(stats.maxValue ?? stats.max ?? Math.max(...flat)),
    activeCellFraction: round3((stats.activeFraction ?? flat.filter((value) => value >= 0.07).length / cellCount)),
    highValueCellFraction: round3(flat.filter((value) => value >= 0.68).length / cellCount),
    rareExtremeFraction: round3(flat.filter((value) => value >= 0.9).length / cellCount),
    heavyTailIndicator: round3(p99 - p90),
    bimodalSeparation: round3((p25 < 0.36 && p75 > 0.62) ? p75 - p25 : 0),
    lowTailSpread: round3(p10 - (sorted[0] ?? 0)),
    totalActivityMass: round3(stats.totalActivityMass ?? stats.totalValue ?? sum(flat)),
    dynamicRange: round3(stats.dynamicRangeAfterContrast ?? ((stats.maxValue ?? stats.max ?? Math.max(...flat)) - (stats.minValue ?? stats.min ?? Math.min(...flat)))),
    activeBoundingBoxCoverage: round3(stats.activeBoundingBoxCoverage ?? 0),
    diagnosticWarnings: Array.isArray(stats.diagnosticWarnings) ? stats.diagnosticWarnings : [],
    contrastEnhanced: Boolean(stats.contrastEnhanced),
    contrastStrength: round3(stats.contrastStrength ?? 0),
    graphDiagnosticsPresent: Boolean(graphDiagnostics),
    graphUpdateRule: graphDiagnostics?.updateRule ?? field.graphField?.graph?.updateRule ?? 'memoryless',
    graphActiveNodeCount: graphDiagnostics?.activeNodeCount ?? 0,
    graphEngagedNodeCount: graphEngagedNodeCount(graphDiagnostics),
    graphClusterCount: graphDiagnostics?.clusterCount ?? 0,
    graphActiveClusterCount: graphDiagnostics?.activeClusterCount ?? 0,
    graphMinClusterSeparation: round3(graphDiagnostics?.minClusterSeparation ?? 0),
    graphMessageTotal: round3(graphDiagnostics?.edgeMessageTotal ?? 0),
    graphSaturationWarning: Boolean(graphDiagnostics?.saturationWarning),
    graphExtinctionWarning: Boolean(graphDiagnostics?.extinctionWarning),
    centerOfMass: centerOfMass(sampleValueField),
    connectedComponents: connectedComponents(sampleValueField, 0.55),
    spatialCorrelation: localSpatialCorrelation(sampleValueField),
    sampleValueField
  };
}

function frameDelta(a, b) {
  const valuesA = a?.flat?.().map(Number) ?? [];
  const valuesB = b?.flat?.().map(Number) ?? [];
  const count = Math.min(valuesA.length, valuesB.length);
  if (!count) return 0;
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += Math.abs((valuesA[index] || 0) - (valuesB[index] || 0));
  }
  return round3(total / count);
}

function centerOfMass(field) {
  let mass = 0;
  let xSum = 0;
  let ySum = 0;
  const height = field?.length ?? 0;
  const width = field?.[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(field[y]?.[x] ?? 0);
      mass += value;
      xSum += value * (width > 1 ? x / (width - 1) : 0);
      ySum += value * (height > 1 ? y / (height - 1) : 0);
    }
  }
  if (mass <= 0) return { x: 0.5, y: 0.5 };
  return { x: round3(xSum / mass), y: round3(ySum / mass) };
}

function totalCenterMovement(centers) {
  let total = 0;
  for (let index = 1; index < centers.length; index += 1) {
    const dx = centers[index].x - centers[index - 1].x;
    const dy = centers[index].y - centers[index - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function connectedComponents(field, threshold) {
  const height = field?.length ?? 0;
  const width = field?.[0]?.length ?? 0;
  const visited = new Set();
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = `${x},${y}`;
      if (visited.has(key) || Number(field[y]?.[x] ?? 0) < threshold) continue;
      count += 1;
      const stack = [[x, y]];
      visited.add(key);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nextKey = `${nx},${ny}`;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited.has(nextKey)) continue;
          if (Number(field[ny]?.[nx] ?? 0) < threshold) continue;
          visited.add(nextKey);
          stack.push([nx, ny]);
        }
      }
    }
  }
  return count;
}

function localSpatialCorrelation(field) {
  const values = [];
  const neighbors = [];
  const height = field?.length ?? 0;
  const width = field?.[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      values.push(Number(field[y]?.[x] ?? 0));
      neighbors.push(Number(field[y]?.[x + 1] ?? 0));
    }
  }
  return Math.max(0, pearson(values, neighbors));
}

function pearson(a, b) {
  const count = Math.min(a.length, b.length);
  if (!count) return 0;
  const meanA = mean(a);
  const meanB = mean(b);
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < count; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  return numerator / Math.max(0.000001, Math.sqrt(denomA * denomB));
}

function consecutiveBelow(values, threshold, runLength) {
  let run = 0;
  for (const value of values) {
    run = value < threshold ? run + 1 : 0;
    if (run >= runLength) return true;
  }
  return false;
}

function consecutiveSaturation(frames, runLength) {
  let run = 0;
  for (const frame of frames) {
    run = frame.activeCellFraction > 0.98 && frame.maxValue - frame.meanValue < 0.08 ? run + 1 : 0;
    if (run >= runLength) return true;
  }
  return false;
}

function graphEngagedNodeCount(graphDiagnostics) {
  const counts = graphDiagnostics?.stateCounts ?? {};
  return ['active', 'crest', 'alive', 'cooling', 'recovering', 'consumed', 'susceptible'].reduce((total, state) => total + (counts[state] ?? 0), 0);
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function mean(values) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

function finiteMin(values) {
  return values.length ? Math.min(...values) : 0;
}

function percentileSorted(sorted, percentile) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
