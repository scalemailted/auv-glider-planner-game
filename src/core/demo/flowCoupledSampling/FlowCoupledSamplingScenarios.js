import { createSeededRng } from '../../random/SeededRng.js';
import { createVectorGrid } from '../flow/FlowFieldMath.js';
import {
  clamp01,
  createScalarField,
  normalizeField
} from './FlowCoupledSamplingFieldMath.js';

export const FLOW_COUPLED_SAMPLING_SCENARIO_IDS = [
  'currentAssistedTarget',
  'currentOpposedTarget',
  'crossCurrentRisk',
  'downstreamIntercept',
  'hazardGap',
  'staleNearVsValuableFar',
  'twoGliderRedundancyPreview',
  'mixedFlowMission'
];

export const FLOW_COUPLED_SAMPLING_SCENARIO_METADATA = {
  currentAssistedTarget: {
    label: 'Current-Assisted Target',
    teachingNotes: 'A high-priority target becomes a better action because the current helps the selected glider travel toward it.'
  },
  currentOpposedTarget: {
    label: 'Current-Opposed Target',
    teachingNotes: 'A scientifically valuable target is harder to justify when the current directly opposes the selected glider.'
  },
  crossCurrentRisk: {
    label: 'Cross-Current Risk',
    teachingNotes: 'A target can remain scientifically useful while lateral flow makes the direct-leg action riskier.'
  },
  downstreamIntercept: {
    label: 'Downstream Intercept',
    teachingNotes: 'The future-priority feature is downstream, so the direct target should anticipate where the feature will be.'
  },
  hazardGap: {
    label: 'Hazard Gap',
    teachingNotes: 'Hazards and accessibility can turn a high-priority region into a corridor-selection problem without route planning.'
  },
  staleNearVsValuableFar: {
    label: 'Stale Near vs Valuable Far',
    teachingNotes: 'A nearby revisit target can beat a more valuable far target once travel time and energy are included.'
  },
  twoGliderRedundancyPreview: {
    label: 'Two-Glider Redundancy Preview',
    teachingNotes: 'The selected glider discounts a region that another glider is already close enough to cover.'
  },
  mixedFlowMission: {
    label: 'Mixed Flow Mission',
    teachingNotes: 'Science value, flow assist, opposition, energy, hazards, timing, and redundancy compete in one direct-leg target map.'
  }
};

export function flowCoupledSamplingScenarioOptions() {
  return FLOW_COUPLED_SAMPLING_SCENARIO_IDS.map((id) => ({
    id,
    label: flowCoupledSamplingScenarioLabel(id),
    description: FLOW_COUPLED_SAMPLING_SCENARIO_METADATA[id]?.teachingNotes ?? ''
  }));
}

export function normalizeFlowCoupledSamplingScenarioId(id) {
  const value = String(id ?? '').trim();
  if (FLOW_COUPLED_SAMPLING_SCENARIO_IDS.includes(value)) return value;
  const aliases = {
    assisted: 'currentAssistedTarget',
    opposed: 'currentOpposedTarget',
    cross: 'crossCurrentRisk',
    intercept: 'downstreamIntercept',
    hazard: 'hazardGap',
    stale: 'staleNearVsValuableFar',
    redundant: 'twoGliderRedundancyPreview',
    mixed: 'mixedFlowMission'
  };
  return aliases[value] ?? 'currentOpposedTarget';
}

export function flowCoupledSamplingScenarioLabel(id) {
  return FLOW_COUPLED_SAMPLING_SCENARIO_METADATA[normalizeFlowCoupledSamplingScenarioId(id)]?.label ?? 'Current-Opposed Target';
}

export function createFlowCoupledSamplingScenario(config = {}) {
  const width = Math.max(12, Math.round(Number(config.width ?? config.grid?.width ?? 30) || 30));
  const height = Math.max(10, Math.round(Number(config.height ?? config.grid?.height ?? 20) || 20));
  const seed = String(config.seed ?? 'anchor-flow-coupled-sampling-demo');
  const scenarioId = normalizeFlowCoupledSamplingScenarioId(config.scenarioId ?? config.id);
  const rng = createSeededRng(`${seed}:${scenarioId}:flow-coupled-sampling`);
  const noise = backgroundNoise(width, height, rng);

  let globalPriorityField = normalizeField(addFields(
    scaleField(noise, 0.14),
    gaussianPatch(width, height, 0.68, 0.48, 0.14, 0.9)
  ));
  let futurePriorityField = globalPriorityField;
  let flowField = createVectorGrid(width, height, { u: 0.22, v: 0 });
  let hazardField = createScalarField(width, height, 0);
  let accessibleMask = createScalarField(width, height, 1);
  let recentSamplePenaltyField = createScalarField(width, height, 0);
  let gliders = defaultGliders(width, height);
  let selectedGliderId = 'glider-a';

  if (scenarioId === 'currentAssistedTarget') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.08),
      gaussianPatch(width, height, 0.76, 0.48, 0.13, 1),
      gaussianPatch(width, height, 0.46, 0.68, 0.14, 0.34)
    ));
    futurePriorityField = normalizeField(addFields(globalPriorityField, gaussianPatch(width, height, 0.8, 0.48, 0.12, 0.35)));
    flowField = createVectorGrid(width, height, (_x, y) => ({
      u: 0.5,
      v: 0.05 * Math.sin((y / Math.max(1, height - 1)) * Math.PI * 2)
    }));
    gliders = [{ ...gliders[0], x: width * 0.15, y: height * 0.5, speed: 2.05, timeBudget: 12, energyBudget: 0.86 }];
  }

  if (scenarioId === 'currentOpposedTarget') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.08),
      gaussianPatch(width, height, 0.78, 0.48, 0.12, 1),
      gaussianPatch(width, height, 0.4, 0.72, 0.14, 0.55)
    ));
    futurePriorityField = normalizeField(addFields(globalPriorityField, gaussianPatch(width, height, 0.42, 0.72, 0.14, 0.18)));
    flowField = createVectorGrid(width, height, (_x, y) => ({
      u: -0.52,
      v: 0.04 * Math.cos((y / Math.max(1, height - 1)) * Math.PI * 2)
    }));
    gliders = [{ ...gliders[0], x: width * 0.16, y: height * 0.5, speed: 2.0, timeBudget: 10.5, energyBudget: 0.78 }];
  }

  if (scenarioId === 'crossCurrentRisk') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.08),
      gaussianPatch(width, height, 0.72, 0.5, 0.14, 1),
      gaussianPatch(width, height, 0.46, 0.32, 0.13, 0.45)
    ));
    futurePriorityField = normalizeField(addFields(globalPriorityField, gaussianPatch(width, height, 0.75, 0.62, 0.16, 0.22)));
    flowField = createVectorGrid(width, height, (x) => ({
      u: 0.06,
      v: 0.58 * (0.75 + 0.25 * Math.sin((x / Math.max(1, width - 1)) * Math.PI))
    }));
    gliders = [{ ...gliders[0], x: width * 0.15, y: height * 0.5, speed: 2.15, timeBudget: 11.5, energyBudget: 0.82 }];
  }

  if (scenarioId === 'downstreamIntercept') {
    const currentPatch = gaussianPatch(width, height, 0.42, 0.48, 0.14, 0.82);
    const futurePatch = gaussianPatch(width, height, 0.7, 0.48, 0.15, 1);
    globalPriorityField = normalizeField(addFields(scaleField(noise, 0.08), currentPatch, gaussianPatch(width, height, 0.3, 0.72, 0.14, 0.35)));
    futurePriorityField = normalizeField(addFields(scaleField(noise, 0.04), futurePatch, scaleField(currentPatch, 0.18)));
    flowField = createVectorGrid(width, height, (_x, y) => ({
      u: 0.43,
      v: 0.09 * Math.sin((y / Math.max(1, height - 1)) * Math.PI)
    }));
    gliders = [{ ...gliders[0], x: width * 0.2, y: height * 0.52, speed: 2.1, timeBudget: 13, energyBudget: 0.86 }];
  }

  if (scenarioId === 'hazardGap') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.06),
      gaussianPatch(width, height, 0.78, 0.5, 0.16, 1),
      gaussianPatch(width, height, 0.42, 0.28, 0.14, 0.42)
    ));
    futurePriorityField = normalizeField(addFields(globalPriorityField, gaussianPatch(width, height, 0.82, 0.5, 0.12, 0.2)));
    hazardField = hazardBandWithGap(width, height, 0.5, 0.16, 0.48, 0.16);
    accessibleMask = createScalarField(width, height, (col, row) => hazardField[row][col] > 0.72 ? 0 : 1);
    flowField = createVectorGrid(width, height, (x, y) => ({
      u: 0.34,
      v: ((y / Math.max(1, height - 1)) - 0.5) * 0.18 - 0.06 * Math.sin((x / Math.max(1, width - 1)) * Math.PI)
    }));
    gliders = [{ ...gliders[0], x: width * 0.14, y: height * 0.52, speed: 2.05, timeBudget: 14, energyBudget: 0.84 }];
  }

  if (scenarioId === 'staleNearVsValuableFar') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.08),
      gaussianPatch(width, height, 0.34, 0.58, 0.13, 0.7),
      gaussianPatch(width, height, 0.82, 0.34, 0.15, 1)
    ));
    futurePriorityField = normalizeField(addFields(globalPriorityField, gaussianPatch(width, height, 0.35, 0.58, 0.12, 0.28)));
    recentSamplePenaltyField = normalizeField(addFields(
      gaussianPatch(width, height, 0.56, 0.5, 0.1, 0.24),
      gaussianPatch(width, height, 0.82, 0.34, 0.12, 0.1)
    ));
    flowField = createVectorGrid(width, height, (x, y) => ({
      u: 0.1 + 0.12 * Math.sin((y / Math.max(1, height - 1)) * Math.PI),
      v: -0.06 + 0.08 * Math.cos((x / Math.max(1, width - 1)) * Math.PI)
    }));
    gliders = [{ ...gliders[0], x: width * 0.18, y: height * 0.62, speed: 2.0, timeBudget: 9.5, energyBudget: 0.72 }];
  }

  if (scenarioId === 'twoGliderRedundancyPreview') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.08),
      gaussianPatch(width, height, 0.62, 0.45, 0.16, 1),
      gaussianPatch(width, height, 0.36, 0.68, 0.13, 0.55)
    ));
    futurePriorityField = normalizeField(addFields(globalPriorityField, gaussianPatch(width, height, 0.36, 0.68, 0.13, 0.22)));
    recentSamplePenaltyField = normalizeField(addFields(
      gaussianPatch(width, height, 0.62, 0.45, 0.14, 0.52),
      gaussianPatch(width, height, 0.5, 0.44, 0.12, 0.22)
    ));
    flowField = createVectorGrid(width, height, (_x, y) => ({
      u: 0.22,
      v: 0.18 * Math.sin((y / Math.max(1, height - 1)) * Math.PI * 2)
    }));
    gliders = [
      { id: 'glider-a', label: 'Glider A', x: width * 0.16, y: height * 0.58, speed: 2.05, timeBudget: 12, energyBudget: 0.82, color: '#65d2ff' },
      { id: 'glider-b', label: 'Glider B', x: width * 0.58, y: height * 0.43, speed: 2.05, timeBudget: 12, energyBudget: 0.82, color: '#ffd166' }
    ];
  }

  if (scenarioId === 'mixedFlowMission') {
    globalPriorityField = normalizeField(addFields(
      scaleField(noise, 0.12),
      gaussianPatch(width, height, 0.28, 0.34, 0.13, 0.58),
      gaussianPatch(width, height, 0.62, 0.48, 0.16, 0.9),
      gaussianPatch(width, height, 0.82, 0.72, 0.13, 0.72)
    ));
    futurePriorityField = normalizeField(addFields(
      scaleField(noise, 0.04),
      gaussianPatch(width, height, 0.7, 0.5, 0.15, 0.92),
      gaussianPatch(width, height, 0.32, 0.34, 0.12, 0.42),
      gaussianPatch(width, height, 0.78, 0.68, 0.12, 0.5)
    ));
    hazardField = normalizeField(addFields(
      gaussianPatch(width, height, 0.48, 0.46, 0.11, 0.88),
      gaussianPatch(width, height, 0.76, 0.26, 0.08, 0.7)
    ));
    accessibleMask = createScalarField(width, height, (col, row) => hazardField[row][col] > 0.8 ? 0 : 1);
    recentSamplePenaltyField = normalizeField(addFields(
      gaussianPatch(width, height, 0.28, 0.34, 0.11, 0.42),
      gaussianPatch(width, height, 0.62, 0.48, 0.09, 0.24)
    ));
    flowField = createVectorGrid(width, height, (x, y) => {
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      return {
        u: 0.28 * Math.cos((ny - 0.42) * Math.PI) + 0.08,
        v: 0.26 * Math.sin((nx + ny) * Math.PI * 1.4)
      };
    });
    gliders = [
      { id: 'glider-a', label: 'Glider A', x: width * 0.14, y: height * 0.56, speed: 2.0, timeBudget: 12.5, energyBudget: 0.8, color: '#65d2ff' },
      { id: 'glider-b', label: 'Glider B', x: width * 0.84, y: height * 0.78, speed: 2.0, timeBudget: 12.5, energyBudget: 0.82, color: '#ffd166' }
    ];
  }

  return {
    width,
    height,
    seed,
    scenarioId,
    scenarioLabel: flowCoupledSamplingScenarioLabel(scenarioId),
    globalPriorityField: normalizeField(globalPriorityField),
    futurePriorityField: normalizeField(futurePriorityField),
    flowField,
    hazardField: normalizeField(hazardField),
    accessibleMask: normalizeField(accessibleMask),
    recentSamplePenaltyField: normalizeField(recentSamplePenaltyField),
    gliders,
    selectedGliderId,
    teachingNotes: FLOW_COUPLED_SAMPLING_SCENARIO_METADATA[scenarioId]?.teachingNotes ?? '',
    notA: 'Synthetic educational flow-coupled action-value scenario; not a calibrated glider dynamics model, operational ocean forecast, route planner, mission scoring engine, or production vehicle controller.'
  };
}

function defaultGliders(width, height) {
  return [{
    id: 'glider-a',
    label: 'Glider A',
    x: width * 0.16,
    y: height * 0.52,
    speed: 2,
    timeBudget: 12,
    energyBudget: 0.82,
    flowAssistScale: 0.42,
    color: '#65d2ff'
  }];
}

function backgroundNoise(width, height, rng) {
  const c1 = { x: 0.22 + rng() * 0.12, y: 0.28 + rng() * 0.18 };
  const c2 = { x: 0.68 + rng() * 0.12, y: 0.62 + rng() * 0.12 };
  return normalizeField(createScalarField(width, height, (col, row) => {
    const nx = width > 1 ? col / (width - 1) : 0;
    const ny = height > 1 ? row / (height - 1) : 0;
    return 0.08
      + 0.16 * gaussian(nx, ny, c1.x, c1.y, 0.22)
      + 0.12 * gaussian(nx, ny, c2.x, c2.y, 0.28)
      + 0.05 * Math.sin((nx * 1.7 + ny * 1.2) * Math.PI);
  }));
}

function gaussianPatch(width, height, cx, cy, radius, strength) {
  return createScalarField(width, height, (col, row) => {
    const nx = width > 1 ? col / (width - 1) : 0;
    const ny = height > 1 ? row / (height - 1) : 0;
    return strength * gaussian(nx, ny, cx, cy, radius);
  });
}

function hazardBandWithGap(width, height, centerY, thickness, gapCenterX, gapRadius) {
  return normalizeField(createScalarField(width, height, (col, row) => {
    const nx = width > 1 ? col / (width - 1) : 0;
    const ny = height > 1 ? row / (height - 1) : 0;
    const band = Math.exp(-(((ny - centerY) ** 2) / (2 * thickness ** 2)));
    const gap = Math.exp(-(((nx - gapCenterX) ** 2) / (2 * gapRadius ** 2)));
    return clamp01(band * (1 - 0.9 * gap));
  }));
}

function addFields(...fields) {
  const height = Math.max(...fields.map((field) => Array.isArray(field) ? field.length : 0), 1);
  const width = Math.max(...fields.map((field) => Array.isArray(field?.[0]) ? field[0].length : 0), 1);
  return createScalarField(width, height, (col, row) => fields.reduce((sum, field) => sum + Number(field?.[row]?.[col] ?? 0), 0));
}

function scaleField(field, scale) {
  return createScalarField(field?.[0]?.length ?? 1, field?.length ?? 1, (col, row) => Number(field?.[row]?.[col] ?? 0) * scale);
}

function gaussian(x, y, cx, cy, radius) {
  return Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * Math.max(0.0001, radius) ** 2)));
}
