import { createSeededRng } from '../../random/SeededRng.js';
import { frameFromLayers, stepSamplingProcess } from '../sampling/SamplingProcessEvolution.js';
import {
  advectSemiLagrangian,
  centroidOfMass,
  clamp01,
  createGrid,
  fieldStats,
  gradientMagnitude,
  laplacian,
  normalizeField
} from './CoupledFieldMath.js';

export const ANALYTIC_SCALAR_PROCESS_ENGINE_IDS = [
  'caGridProcessBaseline',
  'gaussianPatchMovingHotspot',
  'sourceDiffusionDecay',
  'advectionDiffusionDecay',
  'growthDiffusionDecay',
  'frontBoundaryApproximation'
];

export const ANALYTIC_SCALAR_PROCESS_ENGINE_METADATA = [
  engine({
    id: 'caGridProcessBaseline',
    label: 'CA / Grid-Process Baseline',
    claimLevel: 'teachingCaBaseline',
    description: 'A deterministic local-rule baseline adapted from the existing Process Lab CA stepper.',
    equation: 'X(t+1) = F_CA(X(t), local neighborhood)',
    inWords: 'Cells update from local neighbor rules; the scalar view maps active CA states to sample value.',
    parameters: ['ruleId', 'stepsPerSecond'],
    defaultParameters: { ruleId: 'localBirthDeath', stepsPerSecond: 1 },
    requiredInputs: ['initial state layer'],
    outputFields: ['scalarField', 'stateLayer', 'samplingValueField'],
    stabilityNotes: 'Uses the existing deterministic CA process stepper; no continuous stability claim is made.',
    scientificBoundary: 'This is a local-rule process analogy, not a calibrated ocean process model.',
    notA: 'Not advection, diffusion, hydrodynamics, forecast uncertainty, or a calibrated ocean model.',
    teachingUse: 'Baseline for comparing local-rule CA behavior against analytical scalar update functions.'
  }),
  engine({
    id: 'gaussianPatchMovingHotspot',
    label: 'Gaussian Patch / Moving Hotspot',
    claimLevel: 'analyticalSynthetic',
    description: 'A compact scalar patch moves deterministically under flow plus a small prescribed drift.',
    equation: 'C(x,y,t) = A exp(-||p - center(t)||^2 / (2r^2)); center(t+dt)=center(t)+dt*F(center,t)+drift',
    inWords: 'A smooth hotspot moves through the domain while retaining a Gaussian shape.',
    parameters: ['amplitude', 'radius', 'centerX', 'centerY', 'driftU', 'driftV', 'flowScale'],
    defaultParameters: { amplitude: 1, radius: 0.16, centerX: 0.36, centerY: 0.52, driftU: 0.025, driftV: -0.008, flowScale: 0.18 },
    requiredInputs: ['flow sampler'],
    outputFields: ['scalarField', 'gradientStrength', 'boundaryStrength'],
    stabilityNotes: 'Closed-form bounded Gaussian field; center is clamped to the normalized domain.',
    scientificBoundary: 'Synthetic moving scalar feature for teaching transport intuition.',
    notA: 'Not an eddy-resolving bloom, thermal forecast, or particle model.',
    teachingUse: 'Moving hotspot, bloom patch, thermal anomaly, or eddy-carried feature preview.'
  }),
  engine({
    id: 'sourceDiffusionDecay',
    label: 'Source + Diffusion + Decay',
    claimLevel: 'analyticalSynthetic',
    description: 'A fixed source injects scalar material while diffusion smooths and decay removes it.',
    equation: 'C_next = C + dt*D*Laplacian(C) + dt*source(x,y,t) - dt*decay*C',
    inWords: 'A source adds material, diffusion spreads it, and decay weakens it.',
    parameters: ['diffusion', 'decay', 'sourceStrength', 'sourceRadius', 'sourceX', 'sourceY'],
    defaultParameters: { diffusion: 0.18, decay: 0.045, sourceStrength: 0.18, sourceRadius: 0.11, sourceX: 0.25, sourceY: 0.58 },
    requiredInputs: ['initial scalar field'],
    outputFields: ['scalarField', 'sourceProximity', 'gradientStrength', 'boundaryStrength'],
    stabilityNotes: 'Small explicit diffusion coefficient and clamp keep the teaching field bounded.',
    scientificBoundary: 'Synthetic plume/source process, not calibrated chemistry or discharge.',
    notA: 'Not a physical river model, chemistry model, or uncertainty model.',
    teachingUse: 'River input, turbidity source, chemical source, or plume-source intuition.'
  }),
  engine({
    id: 'advectionDiffusionDecay',
    label: 'Advection + Diffusion + Decay',
    claimLevel: 'flowCoupledSynthetic',
    description: 'A scalar field is transported by the known visible flow, smoothed by diffusion, and weakened by decay.',
    equation: 'C_next = C - dt*advection(C,F) + dt*D*Laplacian(C) + dt*source - dt*decay*C',
    inWords: 'Flow moves the scalar field, diffusion smooths it, source adds material, and decay weakens it.',
    parameters: ['flowScale', 'diffusion', 'decay', 'sourceStrength', 'sourceRadius', 'sourceX', 'sourceY'],
    defaultParameters: { flowScale: 0.18, diffusion: 0.08, decay: 0.035, sourceStrength: 0.06, sourceRadius: 0.1, sourceX: 0.25, sourceY: 0.58 },
    requiredInputs: ['initial scalar field', 'flow sampler'],
    outputFields: ['scalarField', 'sourceProximity', 'gradientStrength', 'boundaryStrength'],
    stabilityNotes: 'Semi-Lagrangian backtrace is used for stable educational advection.',
    scientificBoundary: 'Synthetic scalar advection sandbox using the known demo flow field.',
    notA: 'Not Navier-Stokes, ROMS, HYCOM, Delft3D, CFD, or a calibrated forecast.',
    teachingUse: 'Oracle coupled sampling spaces where the process and flow are known.'
  }),
  engine({
    id: 'growthDiffusionDecay',
    label: 'Growth + Diffusion + Decay',
    claimLevel: 'analyticalSynthetic',
    description: 'Logistic growth expands active scalar regions while diffusion smooths and decay removes value.',
    equation: 'C_next = C + dt*D*Laplacian(C) + dt*growth*C*(1-C) - dt*decay*C + dt*source',
    inWords: 'Existing signal grows into nearby capacity, diffusion spreads it, and decay limits it.',
    parameters: ['growth', 'diffusion', 'decay', 'sourceStrength', 'sourceRadius', 'sourceX', 'sourceY'],
    defaultParameters: { growth: 0.22, diffusion: 0.08, decay: 0.035, sourceStrength: 0.035, sourceRadius: 0.13, sourceX: 0.38, sourceY: 0.46 },
    requiredInputs: ['initial scalar field'],
    outputFields: ['scalarField', 'sourceProximity', 'gradientStrength', 'boundaryStrength'],
    stabilityNotes: 'Logistic growth and clamp keep the scalar field bounded in [0,1].',
    scientificBoundary: 'Synthetic bloom/recovery process, not a calibrated ecosystem model.',
    notA: 'Not biogeochemistry, nutrient dynamics, or a hidden-state estimator.',
    teachingUse: 'Bloom expansion, biological patch growth, or recovery/decay intuition.'
  }),
  engine({
    id: 'frontBoundaryApproximation',
    label: 'Front / Boundary Approximation',
    claimLevel: 'analyticalSynthetic',
    description: 'A deterministic level-set-like front creates a scalar side, gradient strength, and boundary band.',
    equation: 'C(x,y,t) = sigmoid((x - front(y,t))/width); boundary = exp(-distance^2/(2*band^2))',
    inWords: 'A moving threshold boundary separates two water-mass-like regions and highlights the edge.',
    parameters: ['frontX', 'frontWidth', 'bandWidth', 'meander', 'driftSpeed'],
    defaultParameters: { frontX: 0.52, frontWidth: 0.045, bandWidth: 0.055, meander: 0.08, driftSpeed: 0.018 },
    requiredInputs: ['time'],
    outputFields: ['scalarField', 'gradientStrength', 'boundaryStrength'],
    stabilityNotes: 'Analytical bounded sigmoid and Gaussian boundary band.',
    scientificBoundary: 'Synthetic front/boundary teaching approximation.',
    notA: 'Not thermocline physics, stratified ocean modeling, or calibrated water-mass analysis.',
    teachingUse: 'Salinity front, temperature front, thermocline, water-mass boundary, or plume boundary analog.'
  })
];

export function analyticScalarProcessEngineMetadata(id) {
  const normalized = normalizeAnalyticEngineId(id);
  return ANALYTIC_SCALAR_PROCESS_ENGINE_METADATA.find((entry) => entry.id === normalized) ?? ANALYTIC_SCALAR_PROCESS_ENGINE_METADATA[0];
}

export function normalizeAnalyticEngineId(id) {
  const raw = String(id ?? '');
  const aliases = {
    ca: 'caGridProcessBaseline',
    caGrid: 'caGridProcessBaseline',
    gaussianPatch: 'gaussianPatchMovingHotspot',
    movingHotspot: 'gaussianPatchMovingHotspot',
    sourceDiffusion: 'sourceDiffusionDecay',
    advection: 'advectionDiffusionDecay',
    growth: 'growthDiffusionDecay',
    frontBoundary: 'frontBoundaryApproximation',
    front: 'frontBoundaryApproximation'
  };
  const candidate = aliases[raw] ?? raw;
  return ANALYTIC_SCALAR_PROCESS_ENGINE_IDS.includes(candidate) ? candidate : 'advectionDiffusionDecay';
}

export function defaultAnalyticScalarEngineParameters(id) {
  return { ...analyticScalarProcessEngineMetadata(id).defaultParameters };
}

export function createAnalyticScalarProcessInitialState(config = {}) {
  const engineId = normalizeAnalyticEngineId(config.engineId);
  const metadata = analyticScalarProcessEngineMetadata(engineId);
  const width = Math.max(1, Math.round(Number(config.width ?? config.grid?.width ?? 18) || 18));
  const height = Math.max(1, Math.round(Number(config.height ?? config.grid?.height ?? 12) || 12));
  const seed = String(config.seed ?? `anchor-coupled:${engineId}`);
  const parameters = { ...metadata.defaultParameters, ...(config.parameters ?? {}) };
  const rng = createSeededRng(seed);
  const scalarField = config.scalarField
    ? normalizeInputField(config.scalarField, width, height)
    : initialScalarField(engineId, { width, height, parameters, rng });
  const caLayers = engineId === 'caGridProcessBaseline' ? createCaBaselineLayers({ width, height, seed }) : null;
  return {
    engineId,
    width,
    height,
    time: 0,
    dt: 1,
    dx: 1 / width,
    dy: 1 / height,
    seed,
    parameters,
    scalarField,
    center: initialCenter(parameters, rng),
    caLayers,
    stepIndex: 0
  };
}

export function stepAnalyticScalarProcessEngine(context = {}) {
  const state = context.state ?? createAnalyticScalarProcessInitialState(context);
  const engineId = normalizeAnalyticEngineId(context.engineId ?? state.engineId);
  const metadata = analyticScalarProcessEngineMetadata(engineId);
  const parameters = { ...metadata.defaultParameters, ...(state.parameters ?? {}), ...(context.parameters ?? {}) };
  const width = Math.max(1, Math.round(Number(context.width ?? state.width ?? 18) || 18));
  const height = Math.max(1, Math.round(Number(context.height ?? state.height ?? 12) || 12));
  const dt = Math.max(0, Number(context.dt ?? state.dt ?? 1) || 0);
  const time = Math.max(0, Number(context.time ?? state.time ?? 0) || 0);
  const flowSampler = normalizeFlowSampler(context.flowSampler);
  const inputField = normalizeInputField(state.scalarField, width, height);
  const base = { engineId, metadata, parameters, width, height, dt, time, flowSampler, inputField, state };
  const result = engineId === 'gaussianPatchMovingHotspot' ? stepGaussianPatch(base)
    : engineId === 'sourceDiffusionDecay' ? stepSourceDiffusionDecay(base)
      : engineId === 'advectionDiffusionDecay' ? stepAdvectionDiffusionDecay(base)
        : engineId === 'growthDiffusionDecay' ? stepGrowthDiffusionDecay(base)
          : engineId === 'frontBoundaryApproximation' ? stepFrontBoundary(base)
            : stepCaBaseline(base);
  return withCommonOutputs(result, base);
}

function stepGaussianPatch({ state, parameters, width, height, dt, time, flowSampler, engineId, metadata }) {
  const previousCenter = state.center ?? initialCenter(parameters);
  const flow = flowSampler({ x: previousCenter.x, y: previousCenter.y, col: previousCenter.x * width, row: previousCenter.y * height, time });
  const nextCenter = {
    x: clamp01(previousCenter.x + dt * (finiteNumber(flow.u, 0) * finiteNumber(parameters.flowScale, 0.18) + finiteNumber(parameters.driftU, 0.025))),
    y: clamp01(previousCenter.y + dt * (finiteNumber(flow.v, 0) * finiteNumber(parameters.flowScale, 0.18) + finiteNumber(parameters.driftV, -0.008)))
  };
  const scalarField = gaussianField(width, height, nextCenter, parameters);
  return {
    engineId,
    metadata,
    scalarField,
    sourceProximity: gaussianField(width, height, nextCenter, { ...parameters, amplitude: 1, radius: finiteNumber(parameters.radius, 0.16) * 1.4 }),
    nextState: { ...state, scalarField, center: nextCenter, time: time + dt, stepIndex: (state.stepIndex ?? 0) + 1 }
  };
}

function stepSourceDiffusionDecay(base) {
  const source = sourceField(base.width, base.height, base.parameters, base.time);
  const scalarField = reactionStep(base.inputField, source, base.parameters, {
    diffusion: true,
    decay: true,
    source: true,
    growth: false,
    dt: base.dt
  });
  return {
    engineId: base.engineId,
    metadata: base.metadata,
    scalarField,
    sourceProximity: source,
    nextState: { ...base.state, scalarField, time: base.time + base.dt, stepIndex: (base.state.stepIndex ?? 0) + 1 }
  };
}

function stepAdvectionDiffusionDecay(base) {
  const flowScale = finiteNumber(base.parameters.flowScale, 0.18);
  const advected = advectSemiLagrangian(
    base.inputField,
    ({ x, y, col, row }) => base.flowSampler({ x, y, col, row, time: base.time }),
    base.dt * flowScale,
    1 / base.width,
    1 / base.height
  );
  const source = sourceField(base.width, base.height, base.parameters, base.time);
  const scalarField = reactionStep(advected, source, base.parameters, {
    diffusion: true,
    decay: true,
    source: true,
    growth: false,
    dt: base.dt
  });
  return {
    engineId: base.engineId,
    metadata: base.metadata,
    scalarField,
    sourceProximity: source,
    advectedField: advected,
    nextState: { ...base.state, scalarField, time: base.time + base.dt, stepIndex: (base.state.stepIndex ?? 0) + 1 }
  };
}

function stepGrowthDiffusionDecay(base) {
  const source = sourceField(base.width, base.height, base.parameters, base.time);
  const scalarField = reactionStep(base.inputField, source, base.parameters, {
    diffusion: true,
    decay: true,
    source: true,
    growth: true,
    dt: base.dt
  });
  return {
    engineId: base.engineId,
    metadata: base.metadata,
    scalarField,
    sourceProximity: source,
    nextState: { ...base.state, scalarField, time: base.time + base.dt, stepIndex: (base.state.stepIndex ?? 0) + 1 }
  };
}

function stepFrontBoundary({ state, parameters, width, height, dt, time, engineId, metadata }) {
  const scalarField = frontField(width, height, parameters, time + dt);
  const boundaryStrength = frontBoundaryField(width, height, parameters, time + dt);
  return {
    engineId,
    metadata,
    scalarField,
    boundaryStrength,
    sourceProximity: boundaryStrength,
    nextState: { ...state, scalarField, time: time + dt, stepIndex: (state.stepIndex ?? 0) + 1 }
  };
}

function stepCaBaseline({ state, parameters, width, height, dt, time, engineId, metadata }) {
  const caLayers = state.caLayers ?? createCaBaselineLayers({ width, height, seed: state.seed });
  const frame = state.stepIndex > 0 || dt > 0
    ? stepSamplingProcess({ ...caLayers, width, height, globalRuleId: parameters.ruleId ?? 'localBirthDeath', time, dt, seed: state.seed })
    : frameFromLayers({ ...caLayers, width, height, globalRuleId: parameters.ruleId ?? 'localBirthDeath', time, index: 0, seed: state.seed });
  const scalarField = normalizeInputField(frame.samplingValueField ?? stateLayerToScalar(frame.stateLayer), width, height);
  const nextLayers = {
    stateLayer: frame.stateLayer,
    ruleLayer: frame.ruleLayer,
    groupLayer: frame.groupLayer,
    sourceField: frame.sourceField,
    parameterLayer: frame.parameterLayer,
    groupDefinitions: caLayers.groupDefinitions
  };
  return {
    engineId,
    metadata,
    scalarField,
    stateLayer: frame.stateLayer,
    samplingValueField: frame.samplingValueField,
    diagnostics: frame.diagnostics,
    nextState: { ...state, scalarField, caLayers: nextLayers, time: time + dt, stepIndex: (state.stepIndex ?? 0) + 1 }
  };
}

function reactionStep(field, source, parameters, options) {
  const width = field[0]?.length ?? 1;
  const height = field.length;
  const lap = options.diffusion ? laplacian(field) : createGrid(width, height, 0);
  const dt = finiteNumber(options.dt, 1);
  const diffusion = finiteNumber(parameters.diffusion, 0);
  const decay = finiteNumber(parameters.decay, 0);
  const growth = finiteNumber(parameters.growth, 0);
  const sourceStrength = finiteNumber(parameters.sourceStrength, 0);
  return createGrid(width, height, (col, row) => {
    const current = field[row][col];
    const next = current
      + dt * diffusion * lap[row][col]
      + (options.source ? dt * sourceStrength * source[row][col] : 0)
      + (options.growth ? dt * growth * current * (1 - current) : 0)
      - (options.decay ? dt * decay * current : 0);
    return clamp01(next);
  });
}

function withCommonOutputs(result, { engineId, metadata, parameters, width, height, dt, time }) {
  const scalarField = normalizeInputField(result.scalarField, width, height);
  const gradientStrength = gradientMagnitude(scalarField);
  const boundaryStrength = result.boundaryStrength ? normalizeInputField(result.boundaryStrength, width, height) : gradientStrength;
  const stats = fieldStats(scalarField);
  const centroid = centroidOfMass(scalarField);
  return {
    engineId,
    engineLabel: metadata.label,
    claimLevel: metadata.claimLevel,
    metadata,
    parameters,
    dt,
    dx: 1 / width,
    dy: 1 / height,
    timeSeconds: time + dt,
    width,
    height,
    scalarField,
    processField: scalarField,
    futureProcessField: scalarField,
    gradientStrength,
    boundaryStrength,
    sourceProximity: result.sourceProximity ? normalizeInputField(result.sourceProximity, width, height) : null,
    advectedField: result.advectedField ? normalizeInputField(result.advectedField, width, height) : null,
    stateLayer: result.stateLayer ?? null,
    samplingValueField: result.samplingValueField ?? null,
    diagnostics: {
      ...(result.diagnostics ?? {}),
      stats,
      centroid,
      bounded: stats.min >= -1e-9 && stats.max <= 1 + 1e-9
    },
    nextState: {
      ...(result.nextState ?? {}),
      engineId,
      width,
      height,
      parameters,
      scalarField,
      dt
    }
  };
}

function initialScalarField(engineId, { width, height, parameters, rng }) {
  if (engineId === 'frontBoundaryApproximation') return frontField(width, height, parameters, 0);
  if (engineId === 'caGridProcessBaseline') return stateLayerToScalar(createCaBaselineLayers({ width, height, seed: 'initial' }).stateLayer);
  const center = initialCenter(parameters, rng);
  return gaussianField(width, height, center, {
    amplitude: 0.72,
    radius: engineId === 'growthDiffusionDecay' ? 0.13 : 0.16
  });
}

function initialCenter(parameters, rng = null) {
  const jitter = typeof rng === 'function' ? () => (rng() - 0.5) * 0.04 : () => 0;
  return {
    x: clamp01(finiteNumber(parameters.centerX ?? parameters.sourceX, 0.36) + jitter()),
    y: clamp01(finiteNumber(parameters.centerY ?? parameters.sourceY, 0.52) + jitter())
  };
}

function gaussianField(width, height, center, parameters) {
  const amplitude = finiteNumber(parameters.amplitude, 1);
  const radius = Math.max(0.01, finiteNumber(parameters.radius, 0.16));
  return createGrid(width, height, (col, row) => {
    const x = (col + 0.5) / width;
    const y = (row + 0.5) / height;
    const distanceSquared = (x - center.x) ** 2 + (y - center.y) ** 2;
    return clamp01(amplitude * Math.exp(-distanceSquared / (2 * radius ** 2)));
  });
}

function sourceField(width, height, parameters, time = 0) {
  const center = {
    x: clamp01(finiteNumber(parameters.sourceX, 0.25) + Math.sin(time * 0.08) * finiteNumber(parameters.sourceDriftX, 0)),
    y: clamp01(finiteNumber(parameters.sourceY, 0.58) + Math.cos(time * 0.06) * finiteNumber(parameters.sourceDriftY, 0))
  };
  return gaussianField(width, height, center, {
    amplitude: 1,
    radius: Math.max(0.01, finiteNumber(parameters.sourceRadius, 0.11))
  });
}

function frontField(width, height, parameters, time = 0) {
  const frontWidth = Math.max(0.005, finiteNumber(parameters.frontWidth, 0.045));
  return createGrid(width, height, (col, row) => {
    const x = (col + 0.5) / width;
    const y = (row + 0.5) / height;
    const front = frontPosition(y, parameters, time);
    return clamp01(1 / (1 + Math.exp(-(x - front) / frontWidth)));
  });
}

function frontBoundaryField(width, height, parameters, time = 0) {
  const bandWidth = Math.max(0.005, finiteNumber(parameters.bandWidth, 0.055));
  return createGrid(width, height, (col, row) => {
    const x = (col + 0.5) / width;
    const y = (row + 0.5) / height;
    const distance = x - frontPosition(y, parameters, time);
    return clamp01(Math.exp(-(distance ** 2) / (2 * bandWidth ** 2)));
  });
}

function frontPosition(y, parameters, time) {
  const base = finiteNumber(parameters.frontX, 0.52);
  const meander = finiteNumber(parameters.meander, 0.08);
  const drift = finiteNumber(parameters.driftSpeed, 0.018);
  return clamp01(base + meander * Math.sin(y * Math.PI * 2.1 + time * 0.18) + drift * Math.sin(time * 0.09));
}

function createCaBaselineLayers({ width, height, seed }) {
  const stateLayer = createGrid(width, height, 'inactive');
  const sourceField = createGrid(width, height, 0.1);
  const ruleLayer = createGrid(width, height, 'localBirthDeath');
  const groupLayer = createGrid(width, height, 1);
  const rng = createSeededRng(seed ?? 'ca-baseline');
  const cx = Math.max(2, Math.min(width - 3, Math.round(width * (0.35 + rng() * 0.2))));
  const cy = Math.max(2, Math.min(height - 3, Math.round(height * (0.35 + rng() * 0.2))));
  const glider = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
  for (const [dx, dy] of glider) {
    const x = Math.min(width - 1, cx + dx);
    const y = Math.min(height - 1, cy + dy);
    stateLayer[y][x] = 'active';
    sourceField[y][x] = 1;
  }
  return {
    stateLayer,
    ruleLayer,
    groupLayer,
    sourceField,
    parameterLayer: createGrid(width, height, {}),
    groupDefinitions: {
      1: { id: 1, label: 'CA baseline', ruleId: 'localBirthDeath', parameters: { birthNeighbors: 3, surviveMin: 2, surviveMax: 3 } }
    }
  };
}

function stateLayerToScalar(stateLayer) {
  const height = stateLayer?.length ?? 1;
  const width = stateLayer?.[0]?.length ?? 1;
  return createGrid(width, height, (col, row) => {
    const state = stateLayer?.[row]?.[col];
    if (['active', 'signal', 'moving', 'predator', 'prey'].includes(state)) return 0.95;
    if (['susceptible', 'conductor', 'loaded', 'stale'].includes(state)) return 0.35;
    if (['cooling', 'recovering', 'refractory', 'trailing'].includes(state)) return 0.18;
    return 0;
  });
}

function normalizeInputField(field, width, height) {
  const normalized = createGrid(width, height, (col, row) => finiteNumber(field?.[row]?.[col], 0));
  return normalized.map((row) => row.map(clamp01));
}

function normalizeFlowSampler(flowSampler) {
  if (typeof flowSampler === 'function') return flowSampler;
  return () => ({ u: 0, v: 0 });
}

function engine(metadata) {
  return Object.freeze({
    ...metadata,
    parameters: [...metadata.parameters],
    defaultParameters: { ...metadata.defaultParameters },
    requiredInputs: [...metadata.requiredInputs],
    outputFields: [...metadata.outputFields]
  });
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
