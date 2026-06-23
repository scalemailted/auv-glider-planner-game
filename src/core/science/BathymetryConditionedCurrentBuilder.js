import { createOceanCurrentField4D } from './OceanCurrentField4D.js';
import { createWetMaskFromBathymetry, projectCoastlineNoNormalVelocity, terrainBoundaryDigest } from './CurrentTerrainBoundaryCondition.js';
import { computeCurrentFieldScientificDiagnostics } from './CurrentFieldScientificDiagnostics.js';

export const BATHYMETRY_CONDITIONED_CURRENT_BUILDER_VERSION = 'bathymetry-conditioned-current-builder-flow-r2a-3';

export function createBathymetryConditionedCurrentField(options = {}) {
  const level = options.level ?? {};
  const grid = options.grid ?? level.world?.grid ?? { width: 8, height: 8 };
  const width = Math.max(1, Number(grid.width ?? 8));
  const height = Math.max(1, Number(grid.height ?? 8));
  const spacingEastMeters = finite(options.spacingEastMeters ?? level.world?.grid?.cellSizeMeters ?? level.world?.cellSizeMeters, 1);
  const spacingNorthMeters = finite(options.spacingNorthMeters ?? level.world?.grid?.cellSizeMeters ?? level.world?.cellSizeMeters, spacingEastMeters);
  const eastAxisMeters = axis(options.eastAxisMeters, width, (i) => i * spacingEastMeters);
  const northAxisMeters = axis(options.northAxisMeters, height, (i) => i * spacingNorthMeters);
  const bottomDepthMeters = normalizeBottomDepth(level, width, height, options.bottomDepthMeters, options.depthAxisMeters);
  const landMask = normalizeLandMask(level, width, height, bottomDepthMeters, options.landMask);
  const wetMask = options.wetMask ?? createWetMaskFromBathymetry({ bottomDepthMeters, landMask, width, height });
  const depthAxisMeters = normalizeDepthAxis(options.depthAxisMeters, bottomDepthMeters, level, options);
  const timeAxisSeconds = normalizeTimeAxis(options.timeAxisSeconds, level);
  const params = defaultParameters(options, bottomDepthMeters, eastAxisMeters, northAxisMeters);
  const enabledComponents = normalizeEnabledComponents(options.components ?? options.enabledComponents);
  const u = [];
  const v = [];
  for (let ti = 0; ti < timeAxisSeconds.length; ti += 1) {
    const timeU = [];
    const timeV = [];
    const timeSeconds = timeAxisSeconds[ti];
    for (let zi = 0; zi < depthAxisMeters.length; zi += 1) {
      const layerU = [];
      const layerV = [];
      const depthMeters = depthAxisMeters[zi];
      for (let y = 0; y < height; y += 1) {
        const rowU = [];
        const rowV = [];
        for (let x = 0; x < width; x += 1) {
          if (wetMask[y]?.[x] === false || depthMeters > Number(bottomDepthMeters[y]?.[x] ?? 0) + 1e-6) {
            rowU.push(0);
            rowV.push(0);
            continue;
          }
          const vector = evaluateSyntheticComponents({ x, y, depthMeters, timeSeconds, eastAxisMeters, northAxisMeters, bottomDepthMeters, wetMask, params, enabledComponents });
          const projected = projectCoastlineNoNormalVelocity({ u: vector.u, v: vector.v, wetMask, x, y });
          rowU.push(round(projected.u));
          rowV.push(round(projected.v));
        }
        layerU.push(rowU);
        layerV.push(rowV);
      }
      timeU.push(layerU);
      timeV.push(layerV);
    }
    u.push(timeU);
    v.push(timeV);
  }
  const componentMetadata = componentMetadataFor(enabledComponents, params);
  const field = createOceanCurrentField4D({
    id: options.id ?? `scientific-synthetic-current-${width}x${height}x${depthAxisMeters.length}x${timeAxisSeconds.length}`,
    label: options.label ?? 'Scientifically constrained synthetic current field',
    grid: { width, height },
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    uEastMetersPerSecond: u,
    vNorthMetersPerSecond: v,
    wetMask,
    bottomDepthMeters,
    seed: params.seed,
    sourceMetadata: {
      sourceTier: 'scientificallyConstrainedSynthetic',
      sourceType: 'synthetic',
      sourceId: options.id ?? 'bathymetry-conditioned-synthetic-current',
      sourceLabel: options.label ?? 'Scientifically constrained synthetic current field',
      equationFamily: 'bathymetryConditionedStreamfunctionSyntheticV1',
      coordinateFrame: 'localEastNorthDown',
      depthDependent: true,
      timeDependent: true,
      usesBathymetryMask: true,
      usesCoastlineBoundary: true,
      usesIsobathSteering: true,
      includesVerticalVelocity: false,
      calibratedForecast: false,
      validatedAgainstObservation: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      expectedDiagnostics: {
        divergenceRmsMaximum: options.divergenceRmsMaximum ?? 0.12,
        coastlineNormalSpeedRmsMaximum: options.coastlineNormalSpeedRmsMaximum ?? 0.035
      },
      components: componentMetadata,
      parameters: params,
      references: ['FLOW-R2A.3 educational synthetic current contract'],
      warnings: [
        'Scientifically constrained synthetic current field. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data.',
        'Bathymetry constrains and steers this fixture; it does not imply generic downhill flow.',
        'Cross-shelf flow appears only in declared components such as tide and canyon exchange.'
      ]
    },
    boundaryFlags: {
      rendererOwnsCurrent: false,
      displayLayerChangesCurrent: false,
      changesOfficialScoring: false,
      usesNewPlanner: false,
      usesWebGpu: false,
      terrainBoundaryDigest: terrainBoundaryDigest({ wetMask, bottomDepthMeters }),
      wetMaskSource: landMask ? 'bathymetryAndTerrain' : 'bottomDepthMeters'
    }
  });
  field.scientificDiagnostics = computeCurrentFieldScientificDiagnostics(field);
  return field;
}

export function evaluateSyntheticCurrentAt(options = {}) {
  return evaluateSyntheticComponents(options);
}

export function bathymetryConditionedComponentCatalog() {
  return componentMetadataFor(new Set(DEFAULT_COMPONENTS), defaultParameters({}, [[700]], [0], [0]));
}

const DEFAULT_COMPONENTS = Object.freeze([
  'alongShelfJet',
  'shelfBreakJet',
  'barotropicTide',
  'depthShear',
  'mesoscaleEddy',
  'translatingEddy',
  'islandWakeApproximation',
  'canyonExchangeApproximation',
  'optionalWindDrivenSurfaceShear'
]);

function evaluateSyntheticComponents(context) {
  const { x, y, depthMeters, timeSeconds, eastAxisMeters, northAxisMeters, bottomDepthMeters, wetMask, params, enabledComponents } = context;
  const xMeters = Number(eastAxisMeters[x] ?? x);
  const yMeters = Number(northAxisMeters[y] ?? y);
  const xSpan = Math.max(1, Number(eastAxisMeters.at(-1) ?? xMeters) - Number(eastAxisMeters[0] ?? 0));
  const ySpan = Math.max(1, Number(northAxisMeters.at(-1) ?? yMeters) - Number(northAxisMeters[0] ?? 0));
  const xFrac = (xMeters - Number(eastAxisMeters[0] ?? 0)) / xSpan;
  const yFrac = (yMeters - Number(northAxisMeters[0] ?? 0)) / ySpan;
  const duration = Math.max(1, params.durationSeconds);
  const phase = 2 * Math.PI * (Number(timeSeconds) / duration);
  const bottom = Number(bottomDepthMeters[y]?.[x] ?? params.maximumBottomDepthMeters);
  const depthNorm = Math.max(0, Math.min(1, Number(depthMeters) / Math.max(1, bottom)));
  const depthDecay = Math.exp(-Number(depthMeters) / Math.max(1, params.depthDecayMeters));
  const terrain = bathymetryFrame(bottomDepthMeters, wetMask, x, y, eastAxisMeters, northAxisMeters);
  let u = 0;
  let v = 0;
  const add = (du, dv) => { u += du; v += dv; };
  const shelfWeight = gaussian(bottom, params.shelfBreakDepthMeters, params.shelfBreakWidthMeters);
  if (enabledComponents.has('alongShelfJet')) {
    const speed = params.alongShelfJetSpeed * (0.58 + 0.42 * shelfWeight) * (1 - params.depthShearStrength * depthNorm) * (0.92 + 0.08 * Math.cos(phase));
    add(terrain.tangentX * speed, terrain.tangentY * speed);
  }
  if (enabledComponents.has('shelfBreakJet')) {
    const speed = params.shelfBreakJetSpeed * shelfWeight * (0.75 + 0.25 * Math.cos(phase + 0.7)) * (1 - 0.45 * depthNorm);
    add(terrain.tangentX * speed, terrain.tangentY * speed);
  }
  if (enabledComponents.has('barotropicTide')) {
    add(params.tideEastAmplitude * Math.sin(phase), params.tideNorthAmplitude * Math.cos(phase));
  }
  if (enabledComponents.has('depthShear')) {
    const shear = params.depthShearSpeed * (depthNorm - 0.35);
    add(terrain.tangentX * shear, terrain.tangentY * shear);
  }
  if (enabledComponents.has('mesoscaleEddy')) {
    const eddy = eddyVector({ xFrac, yFrac, cx: 0.66, cy: 0.58, radius: 0.22, strength: params.eddyStrength * (0.65 + 0.35 * depthDecay) });
    add(eddy.u, eddy.v);
  }
  if (enabledComponents.has('translatingEddy')) {
    const cx = 0.25 + 0.18 * (0.5 + 0.5 * Math.sin(phase * 0.5));
    const cy = 0.34 + 0.08 * Math.cos(phase * 0.5);
    const eddy = eddyVector({ xFrac, yFrac, cx, cy, radius: 0.18, strength: params.translatingEddyStrength * (0.7 + 0.3 * depthDecay) });
    add(eddy.u, eddy.v);
  }
  if (enabledComponents.has('islandWakeApproximation')) {
    const island = gaussian2(xFrac, yFrac, params.islandCenterX, params.islandCenterY, 0.16, 0.12);
    add(-params.islandWakeSpeed * island * (0.8 + 0.2 * Math.sin(phase)) * depthDecay, params.islandWakeSpeed * 0.35 * island * Math.cos(phase) * depthDecay);
  }
  if (enabledComponents.has('canyonExchangeApproximation')) {
    const canyon = gaussian2(xFrac, yFrac, params.canyonCenterX, params.canyonCenterY, params.canyonWidth, params.canyonLength);
    const speed = params.canyonExchangeSpeed * canyon * Math.sin(phase + 0.4) * (0.45 + 0.55 * depthDecay);
    add(terrain.normalX * speed, terrain.normalY * speed);
  }
  if (enabledComponents.has('optionalWindDrivenSurfaceShear')) {
    const speed = params.windSurfaceSpeed * Math.exp(-Number(depthMeters) / Math.max(1, params.windDecayMeters)) * (0.85 + 0.15 * Math.sin(phase + 1.2));
    add(speed, -0.25 * speed);
  }
  if (params.perturbationSpeed > 0) {
    const p = params.perturbationSpeed * Math.sin((xFrac * 3.1 + yFrac * 2.7 + params.seed * 0.013) * Math.PI * 2) * Math.cos(phase + depthMeters * 0.004);
    add(p * terrain.tangentX, p * terrain.tangentY);
  }
  return { u, v };
}

function bathymetryFrame(bottomDepthMeters = [], wetMask = [], x = 0, y = 0, eastAxisMeters = [], northAxisMeters = []) {
  const width = bottomDepthMeters[0]?.length ?? 1;
  const height = bottomDepthMeters.length ?? 1;
  const x0 = Math.max(0, x - 1);
  const x1 = Math.min(width - 1, x + 1);
  const y0 = Math.max(0, y - 1);
  const y1 = Math.min(height - 1, y + 1);
  const dx = Math.max(1e-9, Number(eastAxisMeters[x1] ?? x1) - Number(eastAxisMeters[x0] ?? x0));
  const dy = Math.max(1e-9, Number(northAxisMeters[y1] ?? y1) - Number(northAxisMeters[y0] ?? y0));
  const gradX = (Number(bottomDepthMeters[y]?.[x1] ?? bottomDepthMeters[y]?.[x]) - Number(bottomDepthMeters[y]?.[x0] ?? bottomDepthMeters[y]?.[x])) / dx;
  const gradY = (Number(bottomDepthMeters[y1]?.[x] ?? bottomDepthMeters[y]?.[x]) - Number(bottomDepthMeters[y0]?.[x] ?? bottomDepthMeters[y]?.[x])) / dy;
  const gl = Math.hypot(gradX, gradY);
  if (!Number.isFinite(gl) || gl <= 1e-12) return { normalX: 0, normalY: 1, tangentX: 1, tangentY: 0 };
  const normalX = gradX / gl;
  const normalY = gradY / gl;
  let tangentX = -normalY;
  let tangentY = normalX;
  if (wetMask?.[y]?.[x - 1] === false || wetMask?.[y]?.[x + 1] === false) {
    tangentX = 0;
    tangentY = tangentY >= 0 ? 1 : -1;
  }
  return { normalX, normalY, tangentX, tangentY };
}

function componentMetadataFor(enabledComponents, params) {
  const enabled = enabledComponents instanceof Set ? enabledComponents : new Set(enabledComponents ?? DEFAULT_COMPONENTS);
  const definitions = {
    alongShelfJet: ['u/v along local isobath tangent', 'Continental shelf along-coast jet', 'Uses bathymetry gradient as tangent direction; does not flow downhill by default.', 'Speed weakens with depth.', 'Weak deterministic temporal modulation.', 'Synthetic educational approximation, not calibrated.'],
    shelfBreakJet: ['Gaussian speed maximum near shelf-break depth along isobaths', 'Shelf-break current core', 'Uses declared shelf-break depth and isobath tangent.', 'Weaker at depth.', 'Slow deterministic modulation.', 'Numerical mask can introduce divergence residuals.'],
    barotropicTide: ['Uniform u/v sinusoid in time', 'Barotropic tidal reversal', 'Independent of bathymetry except wet mask.', 'Depth invariant.', 'Reverses over mission time.', 'Not a harmonic tide product.'],
    depthShear: ['Isobath-parallel shear proportional to normalized depth', 'Vertical current shear', 'Uses isobath tangent only for direction.', 'Depth dependent by construction.', 'No independent time variation.', 'Educational shear term.'],
    mesoscaleEddy: ['Rotational streamfunction-like eddy', 'Mesoscale recirculation cell', 'Masked by wet volume.', 'Decays with depth.', 'Stationary in this component.', 'Gaussian envelope is synthetic.'],
    translatingEddy: ['Rotational eddy with time-varying center', 'Moving eddy feature', 'Masked by wet volume.', 'Decays with depth.', 'Center moves deterministically.', 'Not assimilated from observations.'],
    islandWakeApproximation: ['Localized wake perturbation around declared island/seamount', 'Island wake analogy', 'Localized by declared feature center.', 'Surface intensified.', 'Oscillates weakly.', 'Approximate display/benchmark term.'],
    canyonExchangeApproximation: ['Localized cross-isobath exchange in canyon region', 'Submarine canyon exchange analogy', 'Explicitly uses bathymetry normal only in declared canyon region.', 'Surface-to-midwater weighted.', 'Tide-phased exchange.', 'This is the only default cross-shelf mechanism.'],
    optionalWindDrivenSurfaceShear: ['Surface-intensified wind shear vector', 'Wind-driven surface current analogy', 'Independent of bathymetry except wet mask.', 'Exponential decay with depth.', 'Weak time modulation.', 'Optional synthetic forcing.']
  };
  return Object.entries(definitions).filter(([id]) => enabled.has(id)).map(([id, values]) => ({
    id,
    equation: values[0],
    intendedPhysicalAnalogy: values[1],
    bathymetryInteraction: values[2],
    depthBehavior: values[3],
    timeBehavior: values[4],
    knownLimitations: values[5],
    notAForecastWarning: 'Scientifically constrained synthetic current field. Not a calibrated ocean forecast.',
    parameters: paramsForComponent(id, params)
  }));
}

function paramsForComponent(id, params) {
  const keys = {
    alongShelfJet: ['alongShelfJetSpeed', 'depthShearStrength'],
    shelfBreakJet: ['shelfBreakJetSpeed', 'shelfBreakDepthMeters', 'shelfBreakWidthMeters'],
    barotropicTide: ['tideEastAmplitude', 'tideNorthAmplitude', 'durationSeconds'],
    depthShear: ['depthShearSpeed'],
    mesoscaleEddy: ['eddyStrength'],
    translatingEddy: ['translatingEddyStrength'],
    islandWakeApproximation: ['islandWakeSpeed', 'islandCenterX', 'islandCenterY'],
    canyonExchangeApproximation: ['canyonExchangeSpeed', 'canyonCenterX', 'canyonCenterY', 'canyonWidth', 'canyonLength'],
    optionalWindDrivenSurfaceShear: ['windSurfaceSpeed', 'windDecayMeters']
  }[id] ?? [];
  return Object.fromEntries(keys.map((key) => [key, params[key]]));
}

function defaultParameters(options, bottomDepthMeters, eastAxisMeters, northAxisMeters) {
  const depths = bottomDepthMeters.flat().map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const maxDepth = depths.length ? Math.max(...depths) : 700;
  const duration = Math.max(1, Number(options.durationSeconds ?? options.level?.world?.time?.duration ?? 2400));
  return {
    seed: finite(options.seed ?? options.level?.meta?.seed ?? options.level?.seed, 43),
    durationSeconds: duration,
    maximumBottomDepthMeters: maxDepth,
    depthDecayMeters: finite(options.depthDecayMeters, 220),
    shelfBreakDepthMeters: finite(options.shelfBreakDepthMeters, Math.max(120, maxDepth * 0.42)),
    shelfBreakWidthMeters: finite(options.shelfBreakWidthMeters, Math.max(70, maxDepth * 0.18)),
    alongShelfJetSpeed: finite(options.alongShelfJetSpeed, 0.16),
    shelfBreakJetSpeed: finite(options.shelfBreakJetSpeed, 0.12),
    tideEastAmplitude: finite(options.tideEastAmplitude, 0.055),
    tideNorthAmplitude: finite(options.tideNorthAmplitude, 0.035),
    depthShearStrength: finite(options.depthShearStrength, 0.38),
    depthShearSpeed: finite(options.depthShearSpeed, 0.045),
    eddyStrength: finite(options.eddyStrength, 0.075),
    translatingEddyStrength: finite(options.translatingEddyStrength, 0.065),
    islandWakeSpeed: finite(options.islandWakeSpeed, 0.045),
    islandCenterX: finite(options.islandCenterX, 0.72),
    islandCenterY: finite(options.islandCenterY, 0.28),
    canyonExchangeSpeed: finite(options.canyonExchangeSpeed, 0.07),
    canyonCenterX: finite(options.canyonCenterX, 0.5),
    canyonCenterY: finite(options.canyonCenterY, 0.58),
    canyonWidth: finite(options.canyonWidth, 0.075),
    canyonLength: finite(options.canyonLength, 0.24),
    windSurfaceSpeed: finite(options.windSurfaceSpeed, 0.028),
    windDecayMeters: finite(options.windDecayMeters, 45),
    perturbationSpeed: finite(options.perturbationSpeed, 0.006),
    domainEastMeters: Math.max(1, Number(eastAxisMeters.at(-1) ?? 0) - Number(eastAxisMeters[0] ?? 0)),
    domainNorthMeters: Math.max(1, Number(northAxisMeters.at(-1) ?? 0) - Number(northAxisMeters[0] ?? 0))
  };
}

function normalizeEnabledComponents(value) {
  if (!value) return new Set(DEFAULT_COMPONENTS);
  if (Array.isArray(value)) return new Set(value);
  if (value instanceof Set) return value;
  if (typeof value === 'object') return new Set(DEFAULT_COMPONENTS.filter((id) => value[id] !== false));
  return new Set(DEFAULT_COMPONENTS);
}

function normalizeDepthAxis(explicit, bottomDepthMeters, level, options = {}) {
  if (Array.isArray(explicit) && explicit.length) return uniqueSorted(explicit);
  const maxBottom = Math.max(1, ...bottomDepthMeters.flat().map(Number).filter(Number.isFinite));
  const requested = [0, 10, 35, 75, 150, 300, 600].filter((depth) => depth <= maxBottom + 1e-6);
  if (requested.length < 4) requested.push(Math.min(maxBottom, 20), Math.min(maxBottom, 50), Math.min(maxBottom, 100));
  return uniqueSorted(requested).filter((depth, index, array) => index === 0 || depth > array[index - 1]);
}

function normalizeTimeAxis(explicit, level = {}) {
  if (Array.isArray(explicit) && explicit.length) return uniqueSorted(explicit);
  const duration = Math.max(900, finite(level.world?.time?.duration, 2400));
  return [0, duration / 3, (duration * 2) / 3, duration].map((value) => round(value, 3));
}

function normalizeBottomDepth(level = {}, width, height, explicit, depthAxisMeters) {
  const source = explicit ?? level.bathymetry?.depthMeters ?? level.layers?.bottomDepthMeters ?? level.layers?.depthMeters ?? level.world?.bathymetry?.depthMeters ?? null;
  const fallback = Math.max(220, ...(Array.isArray(depthAxisMeters) ? depthAxisMeters : [0]).map(Number).filter(Number.isFinite)) + 50;
  if (Array.isArray(source) && Array.isArray(source[0])) {
    return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => Math.max(0, finite(source?.[y]?.[x], fallback))));
  }
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const shelf = 45 + x * 18 + y * 7;
    const basin = 280 + x * 36 + y * 19;
    const blend = Math.min(1, Math.max(0, (x - width * 0.42) / Math.max(1, width * 0.3)));
    const canyon = Math.exp(-Math.pow((x / Math.max(1, width - 1)) - 0.5, 2) / 0.012) * Math.exp(-Math.pow((y / Math.max(1, height - 1)) - 0.62, 2) / 0.08) * 170;
    return round(shelf * (1 - blend) + basin * blend + canyon);
  }));
}

function normalizeLandMask(level = {}, width, height, bottomDepthMeters, explicit) {
  const source = explicit ?? level.layers?.terrain ?? level.terrain?.landMask ?? null;
  if (Array.isArray(source) && Array.isArray(source[0])) return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => Boolean(source?.[y]?.[x]) || Number(bottomDepthMeters?.[y]?.[x] ?? 0) <= 0));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => x === 0 && y < Math.ceil(height * 0.82)));
}

function axis(values, count, fallback) {
  if (Array.isArray(values) && values.length) return uniqueSorted(values);
  return Array.from({ length: count }, (_value, index) => fallback(index));
}

function uniqueSorted(values) {
  return [...new Set(values.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

function eddyVector({ xFrac, yFrac, cx, cy, radius, strength }) {
  const dx = xFrac - cx;
  const dy = yFrac - cy;
  const weight = Math.exp(-(dx * dx + dy * dy) / Math.max(1e-6, radius * radius));
  return { u: -strength * dy * weight, v: strength * dx * weight };
}

function gaussian(value, center, width) {
  return Math.exp(-Math.pow((Number(value) - Number(center)) / Math.max(1e-9, Number(width)), 2));
}

function gaussian2(x, y, cx, cy, sx, sy) {
  return Math.exp(-Math.pow((x - cx) / Math.max(1e-9, sx), 2) - Math.pow((y - cy) / Math.max(1e-9, sy), 2));
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
