import assert from 'node:assert/strict';
import {
  buildFlowDemoDiagnostics,
  createDemoTerrain,
  FLOW_DEMO_GRID,
  sampleDemoFlow
} from '../../src/core/demo/FlowFieldDemo.js';
import {
  CURRENT_PRESET_CHOICES,
  getVectorPresetScientificMetadata,
  validateVectorPresetScientificMetadata
} from '../../src/core/generation/VectorFieldPresets.js';
import { summarizePresetAudit } from '../../src/core/demo/flow/FlowFieldDiagnostics.js';

const terrain = createDemoTerrain({
  mode: 'blendedCoastal',
  seed: 'flow-preset-audit',
  grid: FLOW_DEMO_GRID
});

const rows = [];
const failures = [];

for (const presetId of CURRENT_PRESET_CHOICES) {
  const metadata = getVectorPresetScientificMetadata(presetId);
  const metadataValidation = validateVectorPresetScientificMetadata(metadata);
  const fieldConfig = {
    fieldMode: 'dynamic',
    primaryPreset: presetId,
    terrain,
    evolutionBehavior: 'continuous',
    cycleDuration: 60,
    directionVariation: 'medium',
    magnitudeVariation: 'medium',
    dynamicComplexity: 'medium',
    evolutionPattern: 'composite',
    spatialMotion: 'none',
    spatialMotionSpeed: 1,
    boundaryMode: 'deflectAlongShore'
  };
  const deterministicRepeatable = sameVector(
    sampleDemoFlow({ ...fieldConfig, x: 0.5, y: 0.5, time: 17 }),
    sampleDemoFlow({ ...fieldConfig, x: 0.5, y: 0.5, time: 17 })
  );
  const diagnostics = buildFlowDemoDiagnostics(fieldConfig, 17, {
    deterministicSeed: 'flow-preset-audit',
    presetMetadata: metadata
  });
  const audit = summarizePresetAudit({
    presetId,
    label: metadata.label,
    metadata,
    diagnostics,
    deterministicRepeatable
  });
  const warnings = [
    ...audit.warnings,
    ...metadataValidation.errors
  ];
  const status = metadataValidation.valid && audit.validationStatus !== 'FAIL' ? audit.validationStatus : 'FAIL';
  rows.push({
    presetId,
    label: metadata.label,
    claimLevel: metadata.claimLevel,
    speed: rangeText(diagnostics.speedStats),
    divergenceMean: diagnostics.divergenceStats.mean,
    divergenceMax: diagnostics.divergenceStats.absMax,
    vorticityMean: diagnostics.vorticityStats.mean,
    vorticityMax: diagnostics.vorticityStats.absMax,
    strainMean: diagnostics.strainStats.mean,
    strainMax: diagnostics.strainStats.absMax,
    invalidVectors: diagnostics.invalidVectorCount,
    deterministicRepeatable,
    status,
    warnings: warnings.join('; ')
  });
  if (status === 'FAIL') failures.push(`${presetId}: ${warnings.join('; ') || 'failed preset audit'}`);
}

for (const row of rows) {
  console.log([
    row.status,
    row.presetId,
    row.label,
    `claim=${row.claimLevel}`,
    `speed=${row.speed}`,
    `divMean=${row.divergenceMean}`,
    `divMax=${row.divergenceMax}`,
    `vortMean=${row.vorticityMean}`,
    `vortMax=${row.vorticityMax}`,
    `strainMean=${row.strainMean}`,
    `strainMax=${row.strainMax}`,
    `invalid=${row.invalidVectors}`,
    `deterministic=${row.deterministicRepeatable}`,
    row.warnings ? `warnings=${row.warnings}` : ''
  ].filter(Boolean).join(' | '));
}

assert.deepEqual(failures, [], `Flow preset audit failures:\n${failures.join('\n')}`);
console.log(`Flow field preset audit completed for ${rows.length} presets`);

function sameVector(a, b) {
  return Math.abs(Number(a?.u) - Number(b?.u)) <= 1e-12
    && Math.abs(Number(a?.v) - Number(b?.v)) <= 1e-12;
}

function rangeText(stats = {}) {
  return `${stats.min}/${stats.mean}/${stats.max}`;
}
