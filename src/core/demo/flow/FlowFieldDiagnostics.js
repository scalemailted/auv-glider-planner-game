import {
  createVectorGrid,
  currentAssist,
  crossCurrentMagnitude,
  divergence,
  flowSpeedStats,
  maskFlowByTerrain,
  scalarFieldStats,
  strainRate,
  validateVectorField,
  vectorMagnitude,
  vorticity
} from './FlowFieldMath.js';

export function buildSampledVectorGrid({
  width = 1,
  height = 1,
  sampler,
  terrainMask = null,
  maskTerrain = true,
  coordinateMode = 'normalizedCellCenter'
} = {}) {
  const cols = Math.max(1, Math.floor(Number(width) || 1));
  const rows = Math.max(1, Math.floor(Number(height) || 1));
  const rawVectorField = createVectorGrid(cols, rows, (x, y) => {
    const point = coordinateMode === 'grid'
      ? { x, y }
      : { x: (x + 0.5) / cols, y: (y + 0.5) / rows };
    const sample = typeof sampler === 'function' ? sampler(point.x, point.y, x, y) : { u: 0, v: 0 };
    return { u: sample?.u, v: sample?.v };
  });
  const vectorField = maskTerrain && terrainMask
    ? maskFlowByTerrain(rawVectorField, terrainMask)
    : rawVectorField;
  return { vectorField, rawVectorField };
}

export function buildFlowFieldDiagnostics({
  vectorField,
  rawVectorField = vectorField,
  terrainMask = null,
  presetMetadata = null,
  deterministicSeed = null,
  dx = 1,
  dy = 1,
  assistDirection = { u: 1, v: 0 },
  maxExpectedMagnitude = null
} = {}) {
  const validation = validateVectorField(vectorField);
  const rawValidation = validateVectorField(rawVectorField);
  const speedStats = roundStats(flowSpeedStats(vectorField));
  const divergenceField = divergence(vectorField, dx, dy);
  const vorticityField = vorticity(vectorField, dx, dy);
  const strainField = strainRate(vectorField, dx, dy);
  const divergenceStats = roundStats(scalarFieldStats(divergenceField));
  const vorticityStats = roundStats(scalarFieldStats(vorticityField));
  const strainStats = roundStats(scalarFieldStats(strainField));
  const terrainMaskedCount = countTerrainCells(terrainMask);
  const rawLandMagnitudeStats = rawLandStats(rawVectorField, terrainMask);
  const centerFlow = centerVector(vectorField);
  const assist = currentAssist(centerFlow, assistDirection);
  const cross = crossCurrentMagnitude(centerFlow, assistDirection);
  const warnings = flowDiagnosticWarnings({
    validation,
    rawValidation,
    speedStats,
    rawLandMagnitudeStats,
    terrainMaskedCount,
    presetMetadata,
    maxExpectedMagnitude
  });
  return {
    speedStats,
    divergenceStats,
    vorticityStats,
    strainStats,
    assistExample: {
      travelDirection: normalizeDirectionLabel(assistDirection),
      value: roundNumber(assist),
      interpretation: assist >= 0 ? 'assisting eastbound travel' : 'opposing eastbound travel'
    },
    crossCurrentExample: {
      travelDirection: normalizeDirectionLabel(assistDirection),
      value: roundNumber(cross),
      interpretation: cross > 0.001 ? 'cross-current component present' : 'little cross-current component'
    },
    finiteVectorCount: validation.finiteVectorCount,
    invalidVectorCount: validation.invalidVectorCount,
    terrainMaskedCount,
    deterministicSeed,
    presetValidationStatus: validationStatus(validation, warnings),
    warnings,
    rawFiniteVectorCount: rawValidation.finiteVectorCount,
    rawInvalidVectorCount: rawValidation.invalidVectorCount,
    rawLandMagnitudeStats: roundStats(rawLandMagnitudeStats)
  };
}

export function buildFlowFieldModelMetadata({
  presetId,
  presetConfig = {},
  presetMetadata = presetConfig.scientificMetadata,
  parameters = {},
  evolutionSettings = {},
  terrainMode = 'none',
  boundaryMode = 'none'
} = {}) {
  const metadata = presetMetadata ?? {};
  return {
    presetId: presetId ?? presetConfig.preset ?? presetConfig.id ?? metadata.id ?? null,
    presetLabel: metadata.label ?? presetConfig.label ?? presetConfig.preset ?? null,
    claimLevel: metadata.claimLevel ?? presetConfig.claimLevel ?? 'syntheticOceanInspired',
    equation: metadata.equation ?? presetConfig.equation ?? null,
    parameters,
    evolutionSettings,
    terrainMode,
    boundaryMode,
    notA: metadata.notA ?? presetConfig.notA ?? 'calibrated ocean forecast or physical hydrodynamic model.'
  };
}

export function summarizePresetAudit({
  presetId,
  label,
  metadata,
  diagnostics,
  deterministicRepeatable = true
} = {}) {
  const warnings = [
    ...(diagnostics?.warnings ?? []),
    ...(deterministicRepeatable ? [] : ['Sampler was not deterministic for repeated same-time samples.']),
    ...(!metadata?.notA ? ['Preset metadata is missing notA claim boundary.'] : [])
  ];
  const status = diagnostics?.invalidVectorCount > 0 || !deterministicRepeatable || !metadata?.notA
    ? 'FAIL'
    : warnings.length
      ? 'WARN'
      : 'PASS';
  return {
    presetId,
    label: label ?? metadata?.label ?? presetId,
    claimLevel: metadata?.claimLevel ?? 'unknown',
    speedStats: diagnostics?.speedStats ?? null,
    divergenceStats: diagnostics?.divergenceStats ?? null,
    vorticityStats: diagnostics?.vorticityStats ?? null,
    strainStats: diagnostics?.strainStats ?? null,
    invalidVectorCount: diagnostics?.invalidVectorCount ?? 0,
    deterministicRepeatable,
    validationStatus: status,
    warnings
  };
}

function flowDiagnosticWarnings({
  validation,
  rawValidation,
  speedStats,
  rawLandMagnitudeStats,
  terrainMaskedCount,
  presetMetadata,
  maxExpectedMagnitude
}) {
  const warnings = [];
  if (validation.invalidVectorCount > 0) warnings.push(`${validation.invalidVectorCount} invalid vectors after terrain masking.`);
  if (rawValidation.invalidVectorCount > 0) warnings.push(`${rawValidation.invalidVectorCount} invalid raw vectors before terrain masking.`);
  const targetMagnitude = Number(maxExpectedMagnitude ?? presetMetadata?.validationTargets?.maxMagnitude);
  if (Number.isFinite(targetMagnitude) && speedStats.max > targetMagnitude * 1.45) {
    warnings.push(`Max speed ${speedStats.max} exceeds expected preset bound ${targetMagnitude}.`);
  }
  if (terrainMaskedCount > 0 && rawLandMagnitudeStats.max > 1e-6) {
    warnings.push('Raw sampler produces nonzero vectors over land; diagnostics and rendering mask those cells.');
  }
  if (!presetMetadata?.notA) warnings.push('Preset metadata is missing a notA claim boundary.');
  return warnings;
}

function validationStatus(validation, warnings) {
  if (validation.invalidVectorCount > 0) return 'FAIL';
  return warnings.length ? 'WARN' : 'PASS';
}

function centerVector(field) {
  const height = Array.isArray(field) ? field.length : 0;
  const width = height > 0 && Array.isArray(field[0]) ? field[0].length : 0;
  if (!width || !height) return { u: 0, v: 0 };
  return field[Math.floor(height / 2)]?.[Math.floor(width / 2)] ?? { u: 0, v: 0 };
}

function countTerrainCells(terrainMask) {
  let count = 0;
  for (const row of Array.isArray(terrainMask) ? terrainMask : []) {
    for (const cell of Array.isArray(row) ? row : []) {
      if (cell) count += 1;
    }
  }
  return count;
}

function rawLandStats(vectorField, terrainMask) {
  const values = [];
  for (let y = 0; y < (Array.isArray(vectorField) ? vectorField.length : 0); y += 1) {
    const row = vectorField[y];
    for (let x = 0; x < (Array.isArray(row) ? row.length : 0); x += 1) {
      if (!terrainMask?.[y]?.[x]) continue;
      values.push(vectorMagnitude(row[x]?.u, row[x]?.v));
    }
  }
  return scalarFieldStats([values]);
}

function roundStats(stats = {}) {
  return {
    min: roundNumber(stats.min),
    mean: roundNumber(stats.mean),
    max: roundNumber(stats.max),
    absMean: roundNumber(stats.absMean),
    absMax: roundNumber(stats.absMax),
    count: Number(stats.count ?? 0)
  };
}

function roundNumber(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function normalizeDirectionLabel(direction) {
  if (typeof direction === 'number') return { radians: roundNumber(direction), u: roundNumber(Math.cos(direction)), v: roundNumber(Math.sin(direction)) };
  return {
    u: roundNumber(direction?.u ?? 1),
    v: roundNumber(direction?.v ?? 0)
  };
}
