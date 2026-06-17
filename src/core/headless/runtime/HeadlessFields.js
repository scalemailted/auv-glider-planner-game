import { createSeededRng, seededUnit } from '../../random/SeededRng.js';
import { createHeadlessFieldDescriptor } from '../HeadlessFieldSchema.js';
import { clamp01, createHeadlessGrid, createScalarField3d, field3dStats, normalizeField3d, sampleNearest3d } from './HeadlessGrid.js';
import { createDefaultHeadlessRuntimeConfig } from './HeadlessRuntimeConfig.js';
import { computeHeadlessSamplingPriority } from './HeadlessPriority.js';

export function createHeadlessFieldPack(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  return createCoastalBloomFrontFieldPack(config);
}

export function createCoastalBloomFrontFieldPack(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const hiddenTruth = createHiddenTruthField(config);
  const forecast = createForecastField(hiddenTruth, config);
  const belief = createInitialBeliefField(forecast, config);
  const uncertainty = createUncertaintyField(config);
  const pUnknown = createHiddenEventProbabilityField(config);
  const hazard = createHazardField(config);
  const constraintMask = createConstraintMask(config);
  const staleness = createStalenessField(config);
  const boundaryStrength = createBoundaryStrengthField(config, hiddenTruth);
  const flow = createFlowFields(config);
  const fields = {
    T_hiddenTruth: hiddenTruth,
    E_forecast: forecast,
    mu_belief: belief,
    U_uncertainty: uncertainty,
    P_unknown: pUnknown,
    F_u: flow.F_u,
    F_v: flow.F_v,
    hazard,
    constraintMask,
    staleness,
    boundaryStrength
  };
  const pack = {
    type: 'anchor.headless.field-pack',
    version: 'headless-runtime-fields-h1',
    scenario: config.scenario ?? 'coastalBloomFront',
    seed: config.seed ?? 'demo-001',
    grid,
    waterColumnConfig: config.waterColumnConfig ?? null,
    fieldOrder: ['T_hiddenTruth', 'E_forecast', 'mu_belief', 'U_uncertainty', 'P_unknown', 'A_global', 'F_u', 'F_v', 'hazard', 'constraintMask', 'staleness', 'boundaryStrength'],
    fields,
    fieldVisibility: {
      T_hiddenTruth: 'hiddenTruth',
      E_forecast: 'forecastOnly',
      mu_belief: 'beliefOnly',
      U_uncertainty: 'beliefOnly',
      P_unknown: 'beliefOnly',
      A_global: 'publicScenario',
      F_u: 'forecastOnly',
      F_v: 'forecastOnly',
      hazard: 'publicScenario',
      constraintMask: 'publicScenario',
      staleness: 'beliefOnly',
      boundaryStrength: 'publicScenario'
    },
    fieldDescriptors: [],
    diagnostics: {},
    boundary: {
      calibratedOceanForecast: false,
      syntheticTeachingScenario: true,
      note: 'Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.'
    },
    notes: [
      'Synthetic deterministic coastal front and bloom field for educational headless testing.',
      'Not calibrated HYCOM, ROMS, Delft3D, or operational ocean forecast output.'
    ]
  };
  pack.fields.A_global = computeHeadlessSamplingPriority(pack, config);
  pack.fieldDescriptors = pack.fieldOrder.map((id) => createHeadlessFieldDescriptor({
    id,
    depthLayers: grid.depthLayers,
    shape: [grid.depthCount, grid.height, grid.width],
    source: id === 'T_hiddenTruth' ? 'synthetic-hidden-truth' : 'h1-node-headless-runtime'
  }));
  pack.diagnostics = buildFieldPackDiagnostics(pack);
  return pack;
}

export function createHiddenTruthField(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const seed = config.seed ?? 'demo-001';
  const field = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    const depthFactor = 1 - (z / Math.max(1, grid.depthCount - 1)) * 0.34;
    for (let y = 0; y < grid.height; y += 1) {
      const ny = grid.height <= 1 ? 0 : y / (grid.height - 1);
      for (let x = 0; x < grid.width; x += 1) {
        const nx = grid.width <= 1 ? 0 : x / (grid.width - 1);
        const frontX = 0.44 + 0.09 * Math.sin((ny * Math.PI * 2) + z * 0.45);
        const front = logistic((nx - frontX) * 14);
        const bloom = Math.exp(-(((nx - 0.34) ** 2) / 0.018 + ((ny - 0.56) ** 2) / 0.038));
        const shelf = Math.exp(-(((nx - 0.2) ** 2) / 0.06 + ((ny - 0.82) ** 2) / 0.05));
        const noise = centeredNoise(seed, 'truth', x, y, z) * 0.018;
        field[z][y][x] = clamp01(0.16 + 0.38 * front + 0.34 * bloom * depthFactor + 0.12 * shelf - 0.08 * z + noise);
      }
    }
  }
  return field;
}

export function createForecastField(hiddenTruth, configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const field = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const shifted = sampleNearest3d(hiddenTruth, x - 2, y + 1, z);
        const smoothing = (
          shifted
          + sampleNearest3d(hiddenTruth, x - 1, y + 1, z)
          + sampleNearest3d(hiddenTruth, x - 2, y, z)
        ) / 3;
        const bias = 0.035 - 0.02 * (z / Math.max(1, grid.depthCount - 1));
        field[z][y][x] = clamp01(0.9 * smoothing + bias);
      }
    }
  }
  return field;
}

export function createInitialBeliefField(forecast, configInput = {}) {
  const grid = createHeadlessGrid(configInput.grid ?? configInput);
  return createScalarField3d(grid, 0).map((layer, z) => layer.map((row, y) => row.map((_value, x) => clamp01(sampleNearest3d(forecast, x, y, z)))));
}

export function createUncertaintyField(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const field = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      const ny = grid.height <= 1 ? 0 : y / (grid.height - 1);
      for (let x = 0; x < grid.width; x += 1) {
        const nx = grid.width <= 1 ? 0 : x / (grid.width - 1);
        const frontX = 0.44 + 0.09 * Math.sin((ny * Math.PI * 2) + z * 0.45);
        const boundary = Math.exp(-((nx - frontX) ** 2) / 0.012);
        const stalePatch = Math.exp(-(((nx - 0.74) ** 2) / 0.035 + ((ny - 0.24) ** 2) / 0.055));
        field[z][y][x] = clamp01(0.16 + 0.34 * boundary + 0.24 * stalePatch + 0.05 * z);
      }
    }
  }
  return field;
}

export function createHiddenEventProbabilityField(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const field = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      const ny = grid.height <= 1 ? 0 : y / (grid.height - 1);
      for (let x = 0; x < grid.width; x += 1) {
        const nx = grid.width <= 1 ? 0 : x / (grid.width - 1);
        const suspicion = Math.exp(-(((nx - 0.28) ** 2) / 0.022 + ((ny - 0.36) ** 2) / 0.026));
        field[z][y][x] = clamp01(0.04 + 0.52 * suspicion * (1 - 0.16 * z));
      }
    }
  }
  return field;
}

export function createHazardField(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const field = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      const ny = grid.height <= 1 ? 0 : y / (grid.height - 1);
      for (let x = 0; x < grid.width; x += 1) {
        const nx = grid.width <= 1 ? 0 : x / (grid.width - 1);
        const risk = Math.exp(-(((nx - 0.66) ** 2) / 0.014 + ((ny - 0.61) ** 2) / 0.018));
        field[z][y][x] = clamp01(0.02 + 0.78 * risk * (1 - 0.1 * z));
      }
    }
  }
  return field;
}

export function createConstraintMask(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const field = createScalarField3d(grid, 0);
  const coastWidth = Math.max(1, Math.round(grid.width * 0.06));
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        field[z][y][x] = x < coastWidth || (x < coastWidth + 2 && y > grid.height * 0.78) ? 1 : 0;
      }
    }
  }
  return field;
}

export function createStalenessField(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const field = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      const ny = grid.height <= 1 ? 0 : y / (grid.height - 1);
      for (let x = 0; x < grid.width; x += 1) {
        const nx = grid.width <= 1 ? 0 : x / (grid.width - 1);
        const oldPatch = Math.exp(-(((nx - 0.77) ** 2) / 0.045 + ((ny - 0.24) ** 2) / 0.055));
        field[z][y][x] = clamp01(0.28 + 0.36 * oldPatch + 0.06 * z);
      }
    }
  }
  return field;
}

export function createBoundaryStrengthField(configInput = {}, hiddenTruth = null) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const truth = hiddenTruth ?? createHiddenTruthField(config);
  const gradient = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const dx = sampleNearest3d(truth, x + 1, y, z) - sampleNearest3d(truth, x - 1, y, z);
        const dy = sampleNearest3d(truth, x, y + 1, z) - sampleNearest3d(truth, x, y - 1, z);
        gradient[z][y][x] = Math.sqrt(dx * dx + dy * dy);
      }
    }
  }
  return normalizeField3d(gradient);
}

export function headlessFieldPackSummary(fieldPack) {
  const fields = fieldPack?.fields ?? {};
  const stats = Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, field3dStats(field)]));
  return {
    type: fieldPack?.type,
    version: fieldPack?.version,
    scenario: fieldPack?.scenario,
    seed: fieldPack?.seed,
    width: fieldPack?.grid?.width,
    height: fieldPack?.grid?.height,
    depthLayers: fieldPack?.grid?.depthLayers ?? [],
    waterColumnConfig: fieldPack?.waterColumnConfig ?? null,
    fieldIds: Object.keys(fields),
    allFinite: Object.values(stats).every((entry) => entry.invalidCount === 0 && entry.finiteCount > 0),
    stats,
    calibratedOceanForecast: false,
    note: 'Synthetic deterministic field pack; not a calibrated ocean forecast.'
  };
}

function createFlowFields(configInput = {}) {
  const config = configInput?.type === 'anchor.headless.runtime-config' ? configInput : createDefaultHeadlessRuntimeConfig(configInput);
  const grid = createHeadlessGrid(config.grid);
  const F_u = createScalarField3d(grid, 0);
  const F_v = createScalarField3d(grid, 0);
  for (let z = 0; z < grid.depthCount; z += 1) {
    for (let y = 0; y < grid.height; y += 1) {
      const ny = grid.height <= 1 ? 0 : y / (grid.height - 1);
      for (let x = 0; x < grid.width; x += 1) {
        const nx = grid.width <= 1 ? 0 : x / (grid.width - 1);
        const meander = Math.sin((ny * Math.PI * 2) + nx * Math.PI + z * 0.5);
        F_u[z][y][x] = 0.08 + 0.045 * meander - 0.015 * z;
        F_v[z][y][x] = 0.025 + 0.035 * Math.cos(nx * Math.PI * 2 + z * 0.6);
      }
    }
  }
  return { F_u, F_v };
}

function buildFieldPackDiagnostics(fieldPack) {
  return Object.fromEntries(Object.entries(fieldPack.fields).map(([id, field]) => [id, field3dStats(field)]));
}

function centeredNoise(seed, ...parts) {
  return seededUnit(`${seed}:${parts.join(':')}`) * 2 - 1;
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}
