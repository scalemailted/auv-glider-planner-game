import { createOceanCurrentField4D } from '../OceanCurrentField4D.js';
import { createWetMaskFromBathymetry, projectCoastlineNoNormalVelocity, terrainBoundaryDigest } from '../CurrentTerrainBoundaryCondition.js';
import { computeCurrentFieldScientificDiagnostics } from '../CurrentFieldScientificDiagnostics.js';
import {
  CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION,
  createCurrentVerticalStructureDescriptor,
  applyVerticalProfileSequence
} from './CurrentVerticalProfileContract.js';

export const BATHYMETRY_CONDITIONED_CURRENT_BUILDER_VERSION = 'bathymetry-conditioned-current-builder-flow-pkg-r2';
export const CURRENT_GENERATION_BACKEND_V2_ID = 'cpuBathymetryConditionedSyntheticV2';
export const CURRENT_GENERATION_BACKEND_V3_ID = 'cpuBathymetryConditionedSyntheticV3';

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
  const temporalBoundary = normalizeTemporalBoundaryOptions(options, level);
  const timeAxisSeconds = normalizeTimeAxis(options.timeAxisSeconds, level, temporalBoundary);
  const params = defaultParameters({
    ...options,
    durationSeconds: temporalBoundary.temporalPeriodSeconds ?? Math.max(1, temporalBoundary.validTimeEndSeconds - temporalBoundary.validTimeStartSeconds)
  }, bottomDepthMeters, eastAxisMeters, northAxisMeters);
  const generatorBackendId = normalizeCurrentGenerationBackendId(options.environmentGeneratorBackendId ?? options.backendId ?? options.generatorBackendId);
  const isV3Backend = generatorBackendId === CURRENT_GENERATION_BACKEND_V3_ID;
  const verticalStructure = isV3Backend ? createCurrentVerticalStructureDescriptor(options.verticalStructure ?? { id: options.verticalStructureId ?? 'mixedRegionalBaroclinicV1' }) : null;
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
          const vector = isV3Backend
            ? evaluateSyntheticComponentsV3({ x, y, depthMeters, timeSeconds, eastAxisMeters, northAxisMeters, bottomDepthMeters, wetMask, params, enabledComponents, verticalStructure })
            : evaluateSyntheticComponents({ x, y, depthMeters, timeSeconds, eastAxisMeters, northAxisMeters, bottomDepthMeters, wetMask, params, enabledComponents });
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
  const componentMetadata = isV3Backend ? componentMetadataForV3(enabledComponents, params, verticalStructure) : componentMetadataFor(enabledComponents, params);
  const componentIds = componentMetadata.map((component) => component.id);
  const field = createOceanCurrentField4D({
    id: options.id ?? `scientific-synthetic-current-${width}x${height}x${depthAxisMeters.length}x${timeAxisSeconds.length}`,
    label: options.label ?? 'Scientifically constrained synthetic current field',
    grid: { width, height },
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    temporalBoundaryMode: temporalBoundary.temporalBoundaryMode,
    temporalPeriodSeconds: temporalBoundary.temporalPeriodSeconds,
    validTimeStartSeconds: temporalBoundary.validTimeStartSeconds,
    validTimeEndSeconds: temporalBoundary.validTimeEndSeconds,
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
      equationFamily: isV3Backend ? 'bathymetryConditionedDepthStructuredSyntheticV3' : 'bathymetryConditionedStreamfunctionSyntheticV2',
      coordinateFrame: 'localEastNorthDown',
      depthDependent: isV3Backend ? verticalStructure.id !== 'barotropicDepthUniform' : true,
      timeDependent: true,
      temporalBoundaryMode: temporalBoundary.temporalBoundaryMode,
      temporalPeriodSeconds: temporalBoundary.temporalPeriodSeconds,
      validTimeStartSeconds: temporalBoundary.validTimeStartSeconds,
      validTimeEndSeconds: temporalBoundary.validTimeEndSeconds,
      usesBathymetryMask: true,
      usesCoastlineBoundary: true,
      usesIsobathSteering: true,
      includesVerticalVelocity: false,
      calibratedForecast: false,
      validatedAgainstObservation: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      calmThresholdMetersPerSecond: params.calmThresholdMetersPerSecond,
      displayMagnitudeRangeMetersPerSecond: {
        min: params.calmThresholdMetersPerSecond,
        max: params.displayMagnitudeMaximumMetersPerSecond
      },
      perturbationPolicy: {
        deterministic: true,
        lowFrequencyOnly: true,
        correlationLengthMeters: round(Math.min(params.domainEastMeters, params.domainNorthMeters) / 3),
        maximumSpeedMetersPerSecond: params.perturbationSpeed,
        notCellwiseRandomDirections: true
      },
      expectedDiagnostics: {
        divergenceRmsMaximum: options.divergenceRmsMaximum ?? 0.12,
        coastlineNormalSpeedRmsMaximum: options.coastlineNormalSpeedRmsMaximum ?? 0.035,
        cellwiseDirectionNoiseScoreMaximum: options.cellwiseDirectionNoiseScoreMaximum ?? 0.5,
        highFrequencyEnergyFractionMaximum: options.highFrequencyEnergyFractionMaximum ?? 0.55
      },
      componentIds,
      components: componentMetadata,
      parameters: isV3Backend ? params : stripV3OnlyParameters(params),
      environmentGeneratorBackendId: generatorBackendId,
      environmentGeneratorBackendVersion: options.environmentGeneratorBackendVersion ?? (isV3Backend ? BATHYMETRY_CONDITIONED_CURRENT_BUILDER_VERSION : null),
      ...(isV3Backend ? {
        generatorBackend: generatorBackendId,
        generatorVersion: BATHYMETRY_CONDITIONED_CURRENT_BUILDER_VERSION,
        verticalStructureId: verticalStructure.id,
        verticalStructureVersion: verticalStructure.version,
        verticalProfileFamilies: verticalStructure.profileFamilies,
        verticalStructure,
        currentVerticalProfileContractVersion: CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION,
        sourceDepthRegime: 'depthStructured',
        mixedRegionalRegimeId: 'mixedRegionalBaroclinicV1',
        barotropicControl: verticalStructure.id === 'barotropicDepthUniform',
        rendererOwnsVerticalStructure: false,
        displayChangesVerticalStructure: false
      } : {}),
      environmentManifestDigest: options.environmentManifestDigest ?? null,
      environmentArtifactDigest: options.environmentArtifactDigest ?? null,
      references: ['FLOW-R2A.5 production 4D current dynamics contract'],
      warnings: [
        'Scientifically constrained synthetic current field. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data.',
        'Bathymetry constrains and steers this fixture; it does not imply generic downhill flow.',
        'Cross-shelf flow appears only in declared components such as tide and localized canyon exchange.',
        'Component perturbations are deterministic low-frequency terms, not independent cellwise random directions.',
        ...(isV3Backend ? ['Depth structure comes from declared coherent vertical profiles, not random slab noise.'] : [])
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
  'depthShear',
  'barotropicTide',
  'mesoscaleEddy',
  'translatingEddy',
  'calmOrWeakCurrentRegion',
  'localizedCanyonExchange',
  'shelfBreakJet',
  'islandWakeApproximation',
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
  const slowPhase = phase * 0.5 + params.seed * 0.017;
  const bottom = Number(bottomDepthMeters[y]?.[x] ?? params.maximumBottomDepthMeters);
  const depthNorm = Math.max(0, Math.min(1, Number(depthMeters) / Math.max(1, bottom)));
  const depthDecay = Math.exp(-Number(depthMeters) / Math.max(1, params.depthDecayMeters));
  const terrain = bathymetryFrame(bottomDepthMeters, wetMask, x, y, eastAxisMeters, northAxisMeters);
  let u = 0;
  let v = 0;
  const add = (du, dv) => { u += du; v += dv; };
  const shelfWeight = gaussian(bottom, params.shelfBreakDepthMeters, params.shelfBreakWidthMeters);
  if (enabledComponents.has('alongShelfJet')) {
    const speed = params.alongShelfJetSpeed * (0.45 + 0.55 * shelfWeight) * (1 - params.depthShearStrength * depthNorm) * (1 + 0.18 * Math.sin(phase + 0.3));
    add(terrain.tangentX * speed, terrain.tangentY * speed);
  }
  if (enabledComponents.has('shelfBreakJet')) {
    const speed = params.shelfBreakJetSpeed * shelfWeight * (0.7 + 0.3 * Math.cos(phase + 0.7)) * (1 - 0.42 * depthNorm);
    add(terrain.tangentX * speed, terrain.tangentY * speed);
  }
  if (enabledComponents.has('barotropicTide')) {
    add(params.tideEastAmplitude * Math.sin(phase), params.tideNorthAmplitude * Math.sin(phase + Math.PI / 4));
  }
  if (enabledComponents.has('depthShear')) {
    const shear = params.depthShearSpeed * (depthNorm - 0.34) * (0.9 + 0.1 * Math.cos(phase + 1.1));
    add(terrain.tangentX * shear, terrain.tangentY * shear);
  }
  if (enabledComponents.has('mesoscaleEddy')) {
    const eddy = eddyVector({ xFrac, yFrac, cx: 0.66, cy: 0.58, radius: 0.22, strength: params.eddyStrength * (0.7 + 0.3 * depthDecay) * (0.86 + 0.14 * Math.cos(slowPhase)) });
    add(eddy.u, eddy.v);
  }
  if (enabledComponents.has('translatingEddy')) {
    const cx = 0.25 + 0.18 * (0.5 + 0.5 * Math.sin(slowPhase));
    const cy = 0.34 + 0.08 * Math.cos(slowPhase);
    const eddy = eddyVector({ xFrac, yFrac, cx, cy, radius: 0.18, strength: params.translatingEddyStrength * (0.72 + 0.28 * depthDecay) });
    add(eddy.u, eddy.v);
  }
  if (enabledComponents.has('islandWakeApproximation')) {
    const island = gaussian2(xFrac, yFrac, params.islandCenterX, params.islandCenterY, 0.16, 0.12);
    add(-params.islandWakeSpeed * island * (0.78 + 0.22 * Math.sin(phase)) * depthDecay, params.islandWakeSpeed * 0.35 * island * Math.cos(phase) * depthDecay);
  }
  if (enabledComponents.has('localizedCanyonExchange')) {
    const canyon = gaussian2(xFrac, yFrac, params.canyonCenterX, params.canyonCenterY, params.canyonWidth, params.canyonLength);
    const speed = params.canyonExchangeSpeed * canyon * Math.sin(phase + 0.4) * (0.38 + 0.62 * depthDecay);
    add(terrain.normalX * speed, terrain.normalY * speed);
  }
  if (enabledComponents.has('optionalWindDrivenSurfaceShear')) {
    const speed = params.windSurfaceSpeed * Math.exp(-Number(depthMeters) / Math.max(1, params.windDecayMeters)) * (0.84 + 0.16 * Math.sin(phase + 1.2));
    add(speed, -0.25 * speed);
  }
  if (params.perturbationSpeed > 0) {
    const p = params.perturbationSpeed
      * Math.sin((xFrac * 2.2 + yFrac * 1.6 + params.seed * 0.013) * Math.PI * 2)
      * Math.cos(slowPhase + depthMeters * 0.004);
    add(p * terrain.tangentX, p * terrain.tangentY);
  }
  if (enabledComponents.has('calmOrWeakCurrentRegion')) {
    const calm = gaussian2(xFrac, yFrac, params.calmCenterX, params.calmCenterY, params.calmWidthX, params.calmWidthY);
    const slack = 0.5 + 0.5 * Math.cos(phase - 0.35);
    const damping = Math.max(0.035, 1 - params.calmDampingStrength * calm * (0.82 + 0.18 * slack));
    u *= damping;
    v *= damping;
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
    alongShelfJet: componentDefinition('alongShelfJet', 'isobath-parallel streamfunction jet', 'Continental shelf along-coast jet', 'Uses bathymetry gradient to form an isobath tangent; bathymetry does not create downhill flow.', 'Surface-to-midwater current weakens with normalized depth.', 'Slow deterministic modulation over canonical mission time.', 'Shelf and shelf-break wet cells.', 'Synthetic shelf-jet analogue with simplified coastline projection.'),
    depthShear: componentDefinition('depthShear', 'depth-dependent isobath-parallel shear', 'Vertical shear between surface and deeper water masses', 'Uses the same local isobath frame as the shelf jet.', 'Velocity changes sign/strength with normalized physical depth.', 'Weak canonical-time modulation only.', 'Wet volume above seabed.', 'Educational shear term, not a calibrated vertical profile.'),
    barotropicTide: componentDefinition('barotropicTide', 'sinusoidal barotropic u/v forcing', 'Depth-independent tidal reversal', 'Masked by wet volume and coastline projection.', 'Depth invariant before boundary projection.', 'Reverses deterministically over mission duration.', 'All wet cells.', 'Not a harmonic tide product.'),
    mesoscaleEddy: componentDefinition('mesoscaleEddy', 'Gaussian rotational streamfunction cell', 'Mesoscale recirculation cell', 'Masked by wet volume; may cross isobaths as a declared eddy.', 'Decays with depth.', 'Strength changes slowly with canonical time.', 'Declared offshore eddy envelope.', 'Gaussian envelope is synthetic.'),
    translatingEddy: componentDefinition('translatingEddy', 'time-translating Gaussian rotational cell', 'Moving eddy feature', 'Masked by wet volume; movement is declared, deterministic, and smooth.', 'Decays with depth.', 'Center translates deterministically with canonical mission time.', 'Declared moving-eddy envelope.', 'Not assimilated from observations.'),
    calmOrWeakCurrentRegion: componentDefinition('calmOrWeakCurrentRegion', 'Gaussian weak-flow damping envelope', 'Sheltered or slack-current region', 'Damps declared components locally without assigning a direction to calm water.', 'Applies at all physical depths, with source vectors still sampled by depth.', 'Strongest near a deterministic slack phase.', 'Declared weak-flow envelope.', 'Not a real harbor or observed stagnation product.'),
    localizedCanyonExchange: componentDefinition('localizedCanyonExchange', 'localized cross-isobath exchange term', 'Submarine canyon exchange analogue', 'Uses bathymetry normal only inside the declared canyon envelope.', 'Surface-to-midwater weighted exchange.', 'Tide-phased deterministic exchange.', 'Declared canyon geometry only.', 'This is a localized synthetic exchange term, not a regional forecast.'),
    shelfBreakJet: componentDefinition('shelfBreakJet', 'Gaussian shelf-break speed maximum', 'Shelf-break current core', 'Uses declared shelf-break depth and local isobath tangent.', 'Weaker at depth.', 'Slow deterministic modulation.', 'Shelf-break depth band.', 'Numerical mask can introduce small divergence residuals.'),
    islandWakeApproximation: componentDefinition('islandWakeApproximation', 'localized wake perturbation', 'Island or seamount wake analogy', 'Localized by declared feature center and masked by wet volume.', 'Surface intensified.', 'Oscillates weakly with canonical time.', 'Declared wake envelope.', 'Approximate display/benchmark term.'),
    optionalWindDrivenSurfaceShear: componentDefinition('optionalWindDrivenSurfaceShear', 'surface-intensified vector shear', 'Wind-driven surface current analogy', 'Independent of bathymetry except wet mask and boundary projection.', 'Exponential decay with depth.', 'Weak deterministic modulation.', 'Upper water column.', 'Optional synthetic forcing, not a weather product.')
  };
  return Object.entries(definitions).filter(([id]) => enabled.has(id)).map(([id, definition]) => ({
    ...definition,
    parameters: paramsForComponent(id, params),
    notAForecastWarning: 'Scientifically constrained synthetic current field. Not a calibrated ocean forecast.',
    notA: 'Not a calibrated regional forecast, not real HYCOM data, and not Marine Copernicus data.'
  }));
}

function componentDefinition(id, equationFamily, physicalAnalogy, bathymetryInteraction, depthBehavior, temporalBehavior, validRegion, knownLimitations) {
  return {
    id,
    equationFamily,
    equation: equationFamily,
    physicalAnalogy,
    intendedPhysicalAnalogy: physicalAnalogy,
    bathymetryInteraction,
    depthBehavior,
    temporalBehavior,
    timeBehavior: temporalBehavior,
    validRegion,
    knownLimitations
  };
}

function paramsForComponent(id, params) {
  const keys = {
    alongShelfJet: ['alongShelfJetSpeed', 'depthShearStrength'],
    shelfBreakJet: ['shelfBreakJetSpeed', 'shelfBreakDepthMeters', 'shelfBreakWidthMeters'],
    barotropicTide: ['tideEastAmplitude', 'tideNorthAmplitude', 'durationSeconds'],
    depthShear: ['depthShearSpeed'],
    mesoscaleEddy: ['eddyStrength'],
    translatingEddy: ['translatingEddyStrength'],
    calmOrWeakCurrentRegion: ['calmThresholdMetersPerSecond', 'calmCenterX', 'calmCenterY', 'calmWidthX', 'calmWidthY', 'calmDampingStrength'],
    localizedCanyonExchange: ['canyonExchangeSpeed', 'canyonCenterX', 'canyonCenterY', 'canyonWidth', 'canyonLength'],
    islandWakeApproximation: ['islandWakeSpeed', 'islandCenterX', 'islandCenterY'],
    optionalWindDrivenSurfaceShear: ['windSurfaceSpeed', 'windDecayMeters']
  }[id] ?? [];
  return Object.fromEntries(keys.map((key) => [key, params[key]]));
}

function defaultParameters(options, bottomDepthMeters, eastAxisMeters, northAxisMeters) {
  const depths = bottomDepthMeters.flat().map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const maxDepth = depths.length ? Math.max(...depths) : 700;
  const duration = Math.max(1, Number(options.durationSeconds ?? canonicalMissionDurationSeconds(options.level ?? {}, options, null) ?? 2400));
  return {
    seed: numericSeed(options.seed ?? options.level?.meta?.seed ?? options.level?.seed, 43),
    durationSeconds: duration,
    maximumBottomDepthMeters: maxDepth,
    depthDecayMeters: finite(options.depthDecayMeters, 220),
    shelfBreakDepthMeters: finite(options.shelfBreakDepthMeters, Math.max(120, maxDepth * 0.42)),
    shelfBreakWidthMeters: finite(options.shelfBreakWidthMeters, Math.max(70, maxDepth * 0.18)),
    alongShelfJetSpeed: finite(options.alongShelfJetSpeed, 0.19),
    shelfBreakJetSpeed: finite(options.shelfBreakJetSpeed, 0.11),
    tideEastAmplitude: finite(options.tideEastAmplitude, 0.095),
    tideNorthAmplitude: finite(options.tideNorthAmplitude, 0.065),
    depthShearStrength: finite(options.depthShearStrength, 0.45),
    depthShearSpeed: finite(options.depthShearSpeed, 0.078),
    eddyStrength: finite(options.eddyStrength, 0.62),
    translatingEddyStrength: finite(options.translatingEddyStrength, 0.48),
    islandWakeSpeed: finite(options.islandWakeSpeed, 0.05),
    islandCenterX: finite(options.islandCenterX, 0.72),
    islandCenterY: finite(options.islandCenterY, 0.28),
    canyonExchangeSpeed: finite(options.canyonExchangeSpeed, 0.11),
    canyonCenterX: finite(options.canyonCenterX, 0.5),
    canyonCenterY: finite(options.canyonCenterY, 0.58),
    canyonWidth: finite(options.canyonWidth, 0.075),
    canyonLength: finite(options.canyonLength, 0.24),
    calmThresholdMetersPerSecond: finite(options.calmThresholdMetersPerSecond, 0.035),
    calmCenterX: finite(options.calmCenterX, 0.61),
    calmCenterY: finite(options.calmCenterY, 0.38),
    calmWidthX: finite(options.calmWidthX, 0.105),
    calmWidthY: finite(options.calmWidthY, 0.12),
    calmDampingStrength: finite(options.calmDampingStrength, 0.98),
    displayMagnitudeMaximumMetersPerSecond: finite(options.displayMagnitudeMaximumMetersPerSecond, 0.45),
    windSurfaceSpeed: finite(options.windSurfaceSpeed, 0.036),
    windDecayMeters: finite(options.windDecayMeters, 45),
    surfaceDecayMeters: finite(options.surfaceDecayMeters, 82),
    surfaceDeepFloor: finite(options.surfaceDeepFloor, 0.38),
    linearShearUEast: finite(options.linearShearUEast, -0.065),
    linearShearVNorth: finite(options.linearShearVNorth, 0.082),
    thermoclineJetStrength: finite(options.thermoclineJetStrength, 0.095),
    thermoclineJetWidthMeters: finite(options.thermoclineJetWidthMeters, 24),
    bottomBoundaryThicknessMeters: finite(options.bottomBoundaryThicknessMeters, 42),
    bottomBoundaryMinimumScale: finite(options.bottomBoundaryMinimumScale, 0.24),
    eddyVerticalDecayMeters: finite(options.eddyVerticalDecayMeters, 130),
    perturbationSpeed: finite(options.perturbationSpeed, 0.004),
    domainEastMeters: Math.max(1, Number(eastAxisMeters.at(-1) ?? 0) - Number(eastAxisMeters[0] ?? 0)),
    domainNorthMeters: Math.max(1, Number(northAxisMeters.at(-1) ?? 0) - Number(northAxisMeters[0] ?? 0))
  };
}

function stripV3OnlyParameters(params = {}) {
  const copy = { ...params };
  for (const key of [
    'surfaceDecayMeters',
    'surfaceDeepFloor',
    'linearShearUEast',
    'linearShearVNorth',
    'thermoclineJetStrength',
    'thermoclineJetWidthMeters',
    'bottomBoundaryThicknessMeters',
    'bottomBoundaryMinimumScale',
    'eddyVerticalDecayMeters'
  ]) delete copy[key];
  return copy;
}
function normalizeCurrentGenerationBackendId(value) {
  const id = String(value ?? CURRENT_GENERATION_BACKEND_V2_ID).trim() || CURRENT_GENERATION_BACKEND_V2_ID;
  return id === CURRENT_GENERATION_BACKEND_V3_ID ? CURRENT_GENERATION_BACKEND_V3_ID : CURRENT_GENERATION_BACKEND_V2_ID;
}

function evaluateSyntheticComponentsV3(context) {
  const { x, y, depthMeters, timeSeconds, eastAxisMeters, northAxisMeters, bottomDepthMeters, wetMask, params, enabledComponents, verticalStructure } = context;
  const surfaceVector = evaluateSyntheticComponents({ ...context, depthMeters: 0 });
  if (verticalStructure?.id === 'barotropicDepthUniform') return surfaceVector;
  const bottom = Number(bottomDepthMeters[y]?.[x] ?? params.maximumBottomDepthMeters);
  const terrain = bathymetryFrame(bottomDepthMeters, wetMask, x, y, eastAxisMeters, northAxisMeters);
  const xMeters = Number(eastAxisMeters[x] ?? x);
  const yMeters = Number(northAxisMeters[y] ?? y);
  const xSpan = Math.max(1, Number(eastAxisMeters.at(-1) ?? xMeters) - Number(eastAxisMeters[0] ?? 0));
  const ySpan = Math.max(1, Number(northAxisMeters.at(-1) ?? yMeters) - Number(northAxisMeters[0] ?? 0));
  const xFrac = (xMeters - Number(eastAxisMeters[0] ?? 0)) / xSpan;
  const yFrac = (yMeters - Number(northAxisMeters[0] ?? 0)) / ySpan;
  const depthNorm = Math.max(0, Math.min(1, Number(depthMeters) / Math.max(1, bottom)));
  const duration = Math.max(1, params.durationSeconds);
  const phase = 2 * Math.PI * (Number(timeSeconds) / duration);
  let u = 0;
  let v = 0;
  const add = (du, dv) => { u += du; v += dv; };

  if (enabledComponents.has('barotropicTide')) {
    const tideU = params.tideEastAmplitude * Math.sin(phase);
    const tideV = params.tideNorthAmplitude * Math.sin(phase + Math.PI / 4);
    const tide = applyVerticalProfileSequence({ u: tideU, v: tideV }, {
      verticalStructure: createCurrentVerticalStructureDescriptor({ id: 'barotropicDepthUniform', profileFamilies: ['barotropicDepthUniform', 'bottomBoundaryDecay'] }),
      depthMeters,
      bottomDepthMeters: bottom,
      parameters: { bottomBoundaryThicknessMeters: params.bottomBoundaryThicknessMeters, bottomBoundaryMinimumScale: 0.58 }
    });
    add(tide.u, tide.v);
  }

  if (enabledComponents.has('alongShelfJet')) {
    const shelfWeight = gaussian(bottom, params.shelfBreakDepthMeters, params.shelfBreakWidthMeters);
    const speed = params.alongShelfJetSpeed * (0.5 + 0.65 * shelfWeight) * (1 + 0.18 * Math.sin(phase + 0.3));
    const jet = applyVerticalProfileSequence({ u: terrain.tangentX * speed, v: terrain.tangentY * speed }, {
      verticalStructure,
      depthMeters,
      bottomDepthMeters: bottom,
      parameters: {
        surfaceDecayMeters: params.surfaceDecayMeters,
        surfaceDeepFloor: params.surfaceDeepFloor,
        linearShearUEast: params.linearShearUEast * terrain.tangentX,
        linearShearVNorth: params.linearShearVNorth * terrain.tangentY,
        thermoclineJetStrength: params.thermoclineJetStrength,
        thermoclineJetWidthMeters: params.thermoclineJetWidthMeters,
        bottomBoundaryThicknessMeters: params.bottomBoundaryThicknessMeters,
        bottomBoundaryMinimumScale: params.bottomBoundaryMinimumScale
      }
    });
    add(jet.u, jet.v);
  }

  if (enabledComponents.has('shelfBreakJet')) {
    const shelfWeight = gaussian(bottom, params.shelfBreakDepthMeters, params.shelfBreakWidthMeters);
    const speed = params.shelfBreakJetSpeed * shelfWeight * (0.7 + 0.3 * Math.cos(phase + 0.7));
    const jet = applyVerticalProfileSequence({ u: terrain.tangentX * speed, v: terrain.tangentY * speed }, {
      verticalStructure: createCurrentVerticalStructureDescriptor({ id: 'thermoclineShearV1', profileFamilies: ['thermoclineJet', 'bottomBoundaryDecay'] }),
      depthMeters,
      bottomDepthMeters: bottom,
      parameters: {
        thermoclineJetStrength: params.thermoclineJetStrength * 0.7,
        thermoclineJetWidthMeters: params.thermoclineJetWidthMeters,
        bottomBoundaryThicknessMeters: params.bottomBoundaryThicknessMeters,
        bottomBoundaryMinimumScale: params.bottomBoundaryMinimumScale
      }
    });
    add(jet.u, jet.v);
  }

  if (enabledComponents.has('optionalWindDrivenSurfaceShear')) {
    const wind = applyVerticalProfileSequence({ u: params.windSurfaceSpeed * (0.84 + 0.16 * Math.sin(phase + 1.2)), v: -0.25 * params.windSurfaceSpeed }, {
      verticalStructure: createCurrentVerticalStructureDescriptor({ id: 'surfaceIntensifiedWindV1', profileFamilies: ['surfaceIntensifiedExponential'] }),
      depthMeters,
      bottomDepthMeters: bottom,
      parameters: { surfaceDecayMeters: params.windDecayMeters, surfaceDeepFloor: 0.08 }
    });
    add(wind.u, wind.v);
  }

  if (enabledComponents.has('mesoscaleEddy')) {
    const depthScale = 0.28 + 0.72 * Math.exp(-Number(depthMeters) / Math.max(1, params.eddyVerticalDecayMeters));
    const eddy = eddyVector({ xFrac, yFrac, cx: 0.66, cy: 0.58, radius: 0.22, strength: params.eddyStrength * depthScale * (0.86 + 0.14 * Math.cos(phase * 0.5 + params.seed * 0.017)) });
    add(eddy.u, eddy.v);
  }

  if (enabledComponents.has('translatingEddy')) {
    const cx = 0.25 + 0.18 * (0.5 + 0.5 * Math.sin(phase * 0.5 + params.seed * 0.017));
    const cy = 0.34 + 0.08 * Math.cos(phase * 0.5 + params.seed * 0.017);
    const depthScale = 0.32 + 0.68 * Math.exp(-Number(depthMeters) / Math.max(1, params.eddyVerticalDecayMeters));
    const eddy = eddyVector({ xFrac, yFrac, cx, cy, radius: 0.18, strength: params.translatingEddyStrength * depthScale });
    add(eddy.u, eddy.v);
  }

  if (enabledComponents.has('localizedCanyonExchange')) {
    const canyon = gaussian2(xFrac, yFrac, params.canyonCenterX, params.canyonCenterY, params.canyonWidth, params.canyonLength);
    const midDeep = Math.exp(-Math.pow((depthNorm - 0.58) / 0.28, 2));
    const speed = params.canyonExchangeSpeed * canyon * Math.sin(phase + 0.4) * (0.28 + 0.92 * midDeep);
    add(terrain.normalX * speed, terrain.normalY * speed);
  }

  if (enabledComponents.has('islandWakeApproximation')) {
    const island = gaussian2(xFrac, yFrac, params.islandCenterX, params.islandCenterY, 0.16, 0.12);
    const scale = Math.exp(-Number(depthMeters) / Math.max(1, params.surfaceDecayMeters));
    add(-params.islandWakeSpeed * island * (0.78 + 0.22 * Math.sin(phase)) * scale, params.islandWakeSpeed * 0.35 * island * Math.cos(phase) * scale);
  }

  if (params.perturbationSpeed > 0) {
    const p = params.perturbationSpeed
      * Math.sin((xFrac * 2.2 + yFrac * 1.6 + params.seed * 0.013) * Math.PI * 2)
      * Math.cos(phase * 0.5 + depthMeters * 0.004);
    add(p * terrain.tangentX, p * terrain.tangentY);
  }

  const bottomProfile = applyVerticalProfileSequence({ u, v }, {
    verticalStructure: createCurrentVerticalStructureDescriptor({ id: 'bottomBoundaryDecayV1', profileFamilies: ['bottomBoundaryDecay'] }),
    depthMeters,
    bottomDepthMeters: bottom,
    parameters: { bottomBoundaryThicknessMeters: params.bottomBoundaryThicknessMeters, bottomBoundaryMinimumScale: params.bottomBoundaryMinimumScale }
  });
  u = bottomProfile.u;
  v = bottomProfile.v;

  if (enabledComponents.has('calmOrWeakCurrentRegion')) {
    const calm = gaussian2(xFrac, yFrac, params.calmCenterX, params.calmCenterY, params.calmWidthX, params.calmWidthY);
    const slack = 0.5 + 0.5 * Math.cos(phase - 0.35);
    const damping = Math.max(0.035, 1 - params.calmDampingStrength * calm * (0.82 + 0.18 * slack));
    u *= damping;
    v *= damping;
  }

  if (Math.hypot(u, v) < 1e-8) return surfaceVector;
  return { u, v };
}

function componentMetadataForV3(enabledComponents, params, verticalStructure) {
  return componentMetadataFor(enabledComponents, params).map((component) => ({
    ...component,
    verticalSupport: verticalStructure.componentSupport?.[component.id] ?? component.depthBehavior,
    verticalProfileFamilies: verticalStructure.profileFamilies,
    depthBehavior: verticalStructure.componentSupport?.[component.id] ?? component.depthBehavior,
    profileContractVersion: CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION
  }));
}
function normalizeEnabledComponents(value) {
  const aliases = { canyonExchangeApproximation: 'localizedCanyonExchange', weakFlowRegion: 'calmOrWeakCurrentRegion' };
  if (!value) return new Set(DEFAULT_COMPONENTS);
  if (Array.isArray(value)) return new Set(value.map((id) => aliases[id] ?? id));
  if (value instanceof Set) return new Set([...value].map((id) => aliases[id] ?? id));
  if (typeof value === 'object') return new Set(DEFAULT_COMPONENTS.filter((id) => value[id] !== false && value[Object.entries(aliases).find(([, target]) => target === id)?.[0]] !== false));
  return new Set(DEFAULT_COMPONENTS);
}

function normalizeDepthAxis(explicit, bottomDepthMeters, level, options = {}) {
  if (Array.isArray(explicit) && explicit.length) return uniqueSorted(explicit);
  const maxBottom = Math.max(1, ...bottomDepthMeters.flat().map(Number).filter(Number.isFinite));
  const requested = [0, 10, 35, 75, 150, 300, 600].filter((depth) => depth <= maxBottom + 1e-6);
  if (requested.length < 4) requested.push(Math.min(maxBottom, 20), Math.min(maxBottom, 50), Math.min(maxBottom, 100));
  return uniqueSorted(requested).filter((depth, index, array) => index === 0 || depth > array[index - 1]);
}

function normalizeTimeAxis(explicit, level = {}, temporalBoundary = {}) {
  const start = finite(temporalBoundary.validTimeStartSeconds, 0);
  const end = Math.max(start + 1e-6, finite(temporalBoundary.validTimeEndSeconds, canonicalMissionDurationSeconds(level, temporalBoundary, explicit)));
  const generatedAxis = missionTimeAxis(start, end, 7);
  if (Array.isArray(explicit) && explicit.length) {
    const base = uniqueSorted(explicit);
    const mode = normalizeTemporalBoundaryMode(temporalBoundary.temporalBoundaryMode);
    if (mode === 'periodic' || temporalBoundary.allowShortTimeAxis === true) return base;
    if (Number(base.at(-1) ?? start) + 1e-6 < end) return uniqueSorted([...base, ...generatedAxis]);
    return base;
  }
  return generatedAxis;
}

function normalizeTemporalBoundaryOptions(options = {}, level = {}) {
  const explicit = options.timeAxisSeconds;
  const mode = normalizeTemporalBoundaryMode(options.temporalBoundaryMode ?? options.sourceMetadata?.temporalBoundaryMode ?? 'bounded');
  const sortedExplicit = Array.isArray(explicit) && explicit.length ? uniqueSorted(explicit) : [];
  const start = finite(options.validTimeStartSeconds ?? options.sourceMetadata?.validTimeStartSeconds, sortedExplicit.length ? Number(sortedExplicit[0]) : 0);
  const end = Math.max(start + 1e-6, finite(options.validTimeEndSeconds ?? options.sourceMetadata?.validTimeEndSeconds, canonicalMissionDurationSeconds(level, options, explicit)));
  const period = mode === 'periodic' ? Math.max(1e-6, finite(options.temporalPeriodSeconds ?? options.sourceMetadata?.temporalPeriodSeconds, end - start || 1)) : null;
  return {
    temporalBoundaryMode: mode,
    temporalPeriodSeconds: period,
    validTimeStartSeconds: start,
    validTimeEndSeconds: end,
    allowShortTimeAxis: options.allowShortTimeAxis === true
  };
}

function canonicalMissionDurationSeconds(level = {}, options = {}, explicit = null) {
  const explicitMax = Array.isArray(explicit) && explicit.length ? Math.max(...explicit.map(Number).filter(Number.isFinite)) : null;
  const values = [
    options.missionDurationSeconds,
    level.world?.operationalDomain?.time?.durationSeconds,
    level.operationalDomain?.time?.durationSeconds,
    level.meta?.generationConfig?.operationalDomain?.time?.durationSeconds,
    level.world?.time?.durationSeconds,
    level.world?.time?.duration,
    explicitMax,
    2400
  ];
  return Math.max(1, finite(values.find((value) => Number.isFinite(Number(value))), 2400));
}

function missionTimeAxis(start, end, count = 7) {
  const span = Math.max(1e-6, Number(end) - Number(start));
  return Array.from({ length: count }, (_value, index) => round(Number(start) + span * index / Math.max(1, count - 1), 3));
}

function normalizeTemporalBoundaryMode(value) {
  return String(value ?? '').trim() === 'periodic' ? 'periodic' : 'bounded';
}

function normalizeBottomDepth(level = {}, width, height, explicit, depthAxisMeters) {
  const source = explicit ?? level.bathymetry?.depthMeters ?? level.layers?.bottomDepthMeters ?? level.layers?.depthMeters ?? level.world?.bathymetry?.depthMeters ?? null;
  const fallback = Math.max(220, ...(Array.isArray(depthAxisMeters) ? depthAxisMeters : [0]).map(Number).filter(Number.isFinite)) + 50;
  if (Array.isArray(source) && Array.isArray(source[0])) {
    return resample2d(source, width, height, fallback).map((row) => row.map((value) => Math.max(0, value)));
  }
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const shelf = 45 + x * 18 + y * 7;
    const basin = 280 + x * 36 + y * 19;
    const blend = Math.min(1, Math.max(0, (x - width * 0.42) / Math.max(1, width * 0.3)));
    const canyon = Math.exp(-Math.pow((x / Math.max(1, width - 1)) - 0.5, 2) / 0.012) * Math.exp(-Math.pow((y / Math.max(1, height - 1)) - 0.62, 2) / 0.08) * 170;
    return round(shelf * (1 - blend) + basin * blend + canyon);
  }));
}

function resample2d(source = [], width = 1, height = 1, fallback = 0) {
  const sourceHeight = source.length;
  const sourceWidth = source[0]?.length ?? 0;
  if (!sourceHeight || !sourceWidth) return Array.from({ length: height }, () => Array.from({ length: width }, () => finite(fallback, 0)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const sx = width <= 1 ? 0 : (x / Math.max(1, width - 1)) * (sourceWidth - 1);
    const sy = height <= 1 ? 0 : (y / Math.max(1, height - 1)) * (sourceHeight - 1);
    const x0 = Math.max(0, Math.min(sourceWidth - 1, Math.floor(sx)));
    const x1 = Math.max(0, Math.min(sourceWidth - 1, Math.ceil(sx)));
    const y0 = Math.max(0, Math.min(sourceHeight - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(sourceHeight - 1, Math.ceil(sy)));
    const fx = sx - x0;
    const fy = sy - y0;
    const a = finite(source?.[y0]?.[x0], fallback);
    const b = finite(source?.[y0]?.[x1], a);
    const c = finite(source?.[y1]?.[x0], a);
    const d = finite(source?.[y1]?.[x1], c);
    return round((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy);
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

function numericSeed(value, fallback = 0) {
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 100000;
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
