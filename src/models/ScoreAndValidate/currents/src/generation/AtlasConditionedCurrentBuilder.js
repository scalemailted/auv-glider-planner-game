const OceanCurrentField4D = require('../OceanCurrentField4D.js')
const CurrentFieldScientificDiagnostics = require('../CurrentFieldScientificDiagnostics.js')
const BathymetryConditionedCurrentBuilder = require('./BathymetryConditionedCurrentBuilder.js')
const ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION = 'atlas-conditioned-current-builder-field-regen-r1';

const REGIME_COMPONENTS = Object.freeze({
  coastParallelShelfCurrent: ['alongShelfJet', 'shelfBreakJet', 'depthShear'],
  weakLandConstraint: ['calmOrWeakCurrentRegion'],
  basinRecirculation: ['mesoscaleEddy', 'translatingEddy', 'calmOrWeakCurrentRegion'],
  mouthInflowOutflow: ['barotropicTide', 'localizedCanyonExchange'],
  islandWake: ['islandWakeApproximation', 'mesoscaleEddy'],
  broadBackgroundCurrent: ['barotropicTide', 'optionalWindDrivenSurfaceShear'],
  mesoscaleEddy: ['mesoscaleEddy', 'translatingEddy'],
  straitJet: ['localizedCanyonExchange', 'barotropicTide', 'shelfBreakJet'],
  tidalReversal: ['barotropicTide']
});

 function createAtlasConditionedCurrentField(options = {}) {
  return buildAtlasConditionedCurrentArtifact(options).currentArtifact;
}

 function buildAtlasConditionedCurrentArtifact(options = {}) {
  const recipe = options.regionalMissionRecipe ?? {};
  const flowInputs = options.flowGenerationInputs ?? recipe.flowGenerationInputs ?? {};
  const bathymetry = normalizeBathymetry(options);
  if (!bathymetry.bottomDepthMeters.length || !bathymetry.bottomDepthMeters[0]?.length) {
    throw new Error('Atlas-conditioned current generation requires bottomDepthMeters.');
  }
  const currentRegimeHints = uniqueStrings(options.currentRegimeHints ?? flowInputs.currentRegimeHints ?? recipe.currentRegimeHints ?? recipe.currentRegime ?? []);
  const featureRecords = Array.isArray(options.featureRecords) ? options.featureRecords : [];
  const depthAxisMeters = normalizeDepthAxis(options.depthAxisMeters ?? flowInputs.depthAxisMeters, bathymetry.bottomDepthMeters);
  const timeAxisSeconds = normalizeTimeAxis(options.timeAxisSeconds ?? flowInputs.timeAxisSeconds, options.missionDurationSeconds ?? flowInputs.missionDurationSeconds ?? recipe.missionDurationSeconds);
  const componentPlan = atlasCurrentComponentPlan({
    currentRegimeHints,
    featureRecords,
    openBoundarySides: options.openBoundarySides ?? flowInputs.openBoundarySides ?? recipe.openBoundarySides,
    seed: options.seed ?? recipe.randomSeed ?? flowInputs.recipeDigest ?? 'atlas-current'
  });
  const base = BathymetryConditionedCurrentBuilder.createBathymetryConditionedCurrentField({
    id: options.id ?? `atlas-conditioned-current-${stableToken(recipe.recipeDigest ?? flowInputs.recipeDigest ?? 'field')}`,
    label: options.label ?? 'Atlas-conditioned synthetic 4D current field',
    grid: { width: bathymetry.width, height: bathymetry.height },
    eastAxisMeters: bathymetry.eastAxisMeters,
    northAxisMeters: bathymetry.northAxisMeters,
    bottomDepthMeters: bathymetry.bottomDepthMeters,
    wetMask: bathymetry.wetMask,
    landMask: bathymetry.landMask,
    depthAxisMeters,
    timeAxisSeconds,
    validTimeStartSeconds: timeAxisSeconds[0] ?? 0,
    validTimeEndSeconds: timeAxisSeconds.at(-1) ?? 0,
    temporalBoundaryMode: 'bounded',
    missionDurationSeconds: Math.max(1, Number(timeAxisSeconds.at(-1) ?? 0) - Number(timeAxisSeconds[0] ?? 0)),
    backendId: CURRENT_GENERATION_BACKEND_V3_ID,
    components: componentPlan.enabledComponents,
    seed: numericSeed(options.seed ?? recipe.randomSeed ?? flowInputs.recipeDigest ?? 'atlas-current'),
    ...componentPlan.parameters
  });
  const sourceId = options.id ?? `atlas-conditioned-current-${stableToken(recipe.recipeDigest ?? flowInputs.recipeDigest ?? 'field')}`;
  const sourceLabel = options.sourceLabel ?? options.label ?? 'Atlas-conditioned synthetic 4D current field';
  const sourceMetadata = {
    ...(base.sourceMetadata ?? {}),
    ...(options.sourceMetadata ?? {}),
    sourceId,
    sourceLabel,
    label: sourceLabel,
    sourceTier: options.sourceTier ?? options.sourceMetadata?.sourceTier ?? 'scientificallyConstrainedSynthetic',
    sourceType: options.sourceType ?? options.sourceMetadata?.sourceType ?? 'atlas-conditioned-synthetic-current',
    equationFamily: options.equationFamily ?? options.sourceMetadata?.equationFamily ?? 'atlasConditionedReducedOrderStreamfunctionSyntheticV1',
    generatorBackend: options.generatorBackend ?? options.sourceMetadata?.generatorBackend ?? 'atlasConditionedCurrentBuilder',
    generatorVersion: options.generatorVersion ?? options.sourceMetadata?.generatorVersion ?? ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION,
    environmentGeneratorBackendId: CURRENT_GENERATION_BACKEND_V3_ID,
    atlasDigest: flowInputs.atlasDigest ?? recipe.atlasDigest ?? null,
    windowDigest: flowInputs.windowDigest ?? recipe.windowDigest ?? null,
    recipeDigest: flowInputs.recipeDigest ?? recipe.recipeDigest ?? null,
    bathymetryArtifactDigest: flowInputs.bathymetryArtifactDigest ?? options.bathymetryArtifact?.artifactDigest ?? null,
    wetLandMaskDigest: flowInputs.wetLandMaskIdentity?.wetMaskDigest ?? null,
    referenceFixtureId: options.referenceFixtureId ?? options.sourceMetadata?.referenceFixtureId ?? flowInputs.referenceFixtureId ?? null,
    fieldPolicy: options.fieldPolicy ?? options.sourceMetadata?.fieldPolicy ?? flowInputs.fieldPolicy ?? null,
    currentRegimeHints,
    currentRegimeComponents: componentPlan.componentMetadata,
    componentIds: componentPlan.enabledComponents,
    components: componentPlan.componentMetadata,
    openBoundarySides: uniqueStrings(options.openBoundarySides ?? flowInputs.openBoundarySides ?? recipe.openBoundarySides ?? []),
    depthDependent: true,
    timeDependent: true,
    usesBathymetryMask: true,
    usesCoastlineBoundary: true,
    usesOpenBoundaryMetadata: true,
    usesStreamfunctionCore: true,
    usesRealHycom: false,
    usesRealMarineCopernicus: false,
    calibratedForecast: false,
    validatedAgainstObservation: false,
    hiddenTruthIncluded: false,
    publicSafe: true,
    references: [
      ...(Array.isArray(options.references) ? options.references : []),
      'FIELD-REGEN-R1 atlas-conditioned current regeneration',
      'packages/currents bathymetry-conditioned 4D current backend'
    ],
    warnings: uniqueStrings([
      ...(base.sourceMetadata?.warnings ?? []),
      ...(Array.isArray(options.warnings) ? options.warnings : []),
      'Atlas-conditioned synthetic currents for deterministic benchmark use. Not a calibrated HYCOM, Marine Copernicus, operational forecast, or certified navigation product.',
      'Current vectors are generated from bathymetry, masks, coastline/open-boundary metadata, regime hints, streamfunction-style coherent components, depth profiles, and canonical mission time.'
    ])
  };
  const currentArtifact = OceanCurrentField4D.createOceanCurrentField4D({
    id: sourceMetadata.sourceId,
    label: sourceMetadata.sourceLabel,
    grid: { width: bathymetry.width, height: bathymetry.height },
    eastAxisMeters: base.eastAxisMeters,
    northAxisMeters: base.northAxisMeters,
    depthAxisMeters: base.depthAxisMeters,
    timeAxisSeconds: base.timeAxisSeconds,
    temporalBoundaryMode: base.temporalBoundaryMode,
    temporalPeriodSeconds: base.temporalPeriodSeconds,
    validTimeStartSeconds: base.validTimeStartSeconds,
    validTimeEndSeconds: base.validTimeEndSeconds,
    uEastMetersPerSecond: base.uEastMetersPerSecond,
    vNorthMetersPerSecond: base.vNorthMetersPerSecond,
    wDownMetersPerSecond: base.wDownMetersPerSecond,
    wetMask: base.wetMask,
    bottomDepthMeters: base.bottomDepthMeters,
    sourceMetadata,
    boundaryFlags: {
      ...(base.boundaryFlags ?? {}),
      atlasConditioned: true,
      rendererOwnsCurrent: false,
      displayLayerChangesCurrent: false,
      changesOfficialScoring: false,
      hiddenTruthExposed: false
    }
  });
  currentArtifact.scientificDiagnostics = CurrentFieldScientificDiagnostics.computeCurrentFieldScientificDiagnostics(currentArtifact);
  currentArtifact.digest = OceanCurrentField4D.oceanCurrentField4DDigest(currentArtifact);
  const validation = OceanCurrentField4D.validateOceanCurrentField4D(currentArtifact);
  const summary = OceanCurrentField4D.oceanCurrentField4DSummary(currentArtifact);
  return {
    type: 'anchor.currents.atlas-conditioned-current-builder-result',
    version: ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION,
    currentArtifact,
    currentArtifactDigest: currentArtifact.digest,
    currentFieldSummary: summary,
    currentDiagnostics: currentArtifact.scientificDiagnostics,
    validation,
    componentPlan,
    claimBoundary: {
      synthetic: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false
    },
    hiddenTruthExposed: false
  };
}

 function atlasCurrentComponentPlan(options = {}) {
  const currentRegimeHints = uniqueStrings(options.currentRegimeHints);
  const components = new Set();
  for (const hint of currentRegimeHints) {
    for (const component of REGIME_COMPONENTS[hint] ?? []) components.add(component);
  }
  if (!components.size) {
    ['alongShelfJet', 'barotropicTide', 'mesoscaleEddy', 'calmOrWeakCurrentRegion'].forEach((id) => components.add(id));
  }
  if (currentRegimeHints.includes('straitJet') || currentRegimeHints.includes('mouthInflowOutflow')) components.add('localizedCanyonExchange');
  if (currentRegimeHints.includes('coastParallelShelfCurrent')) components.add('shelfBreakJet');
  const parameters = parametersForRegime(currentRegimeHints, options.featureRecords ?? [], options.seed);
  return {
    type: 'anchor.currents.atlas-current-component-plan',
    version: ATLAS_CONDITIONED_CURRENT_BUILDER_VERSION,
    currentRegimeHints,
    enabledComponents: [...components],
    parameters,
    componentMetadata: [...components].map((id) => ({
      id,
      sourceRegimeHints: currentRegimeHints.filter((hint) => (REGIME_COMPONENTS[hint] ?? []).includes(id)),
      provenance: 'RegionalMissionRecipe.currentRegimeHints',
      reducedOrderRole: reducedOrderRoleForComponent(id),
      syntheticNotCalibrated: true
    }))
  };
}

function parametersForRegime(hints = [], featureRecords = [], seed = '') {
  const strait = hints.includes('straitJet') || hints.includes('tidalReversal');
  const gulf = hints.includes('basinRecirculation') || hints.includes('mouthInflowOutflow');
  const island = hints.includes('islandWake');
  const openOcean = hints.includes('broadBackgroundCurrent') || hints.includes('mesoscaleEddy');
  const canyon = centerForFeature(featureRecords, ['submarineCanyon', 'ridgeSill', 'straitSill']) ?? seededCenter(seed, 0.5, 0.58);
  const islandCenter = centerForFeature(featureRecords, ['islandSeamount']) ?? seededCenter(`${seed}:island`, 0.72, 0.28);
  const basin = centerForFeature(featureRecords, ['deepBasin', 'gulfBay']) ?? seededCenter(`${seed}:basin`, 0.62, 0.4);
  return {
    alongShelfJetSpeed: strait ? 0.12 : gulf ? 0.15 : 0.19,
    shelfBreakJetSpeed: strait ? 0.15 : 0.11,
    tideEastAmplitude: strait ? 0.13 : gulf ? 0.085 : 0.065,
    tideNorthAmplitude: strait ? 0.1 : gulf ? 0.075 : 0.055,
    eddyStrength: openOcean ? 0.68 : gulf ? 0.5 : 0.42,
    translatingEddyStrength: openOcean ? 0.52 : gulf ? 0.34 : 0.26,
    islandWakeSpeed: island ? 0.085 : 0.035,
    canyonExchangeSpeed: strait ? 0.18 : gulf ? 0.12 : 0.08,
    depthShearSpeed: strait ? 0.095 : 0.072,
    windSurfaceSpeed: openOcean ? 0.045 : 0.028,
    calmCenterX: basin.x,
    calmCenterY: basin.y,
    canyonCenterX: canyon.x,
    canyonCenterY: canyon.y,
    islandCenterX: islandCenter.x,
    islandCenterY: islandCenter.y,
    perturbationSpeed: 0.0035,
    displayMagnitudeMaximumMetersPerSecond: strait ? 0.58 : 0.48
  };
}

function normalizeBathymetry(options = {}) {
  const source = options.bathymetryArtifact ?? options.bathymetry ?? {};
  const bottomDepthMeters = normalizeGrid(options.bottomDepthMeters ?? source.bottomDepthMeters ?? source.bathymetry?.bottomDepthMeters ?? source.depthMeters ?? source.bathymetry?.depthMeters);
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  const wetMask = normalizeMask(options.wetLandMask?.wetMask ?? options.wetMask ?? source.wetMask ?? source.bathymetry?.wetMask, width, height, true);
  const landMask = normalizeMask(options.wetLandMask?.landMask ?? options.landMask ?? source.landMask ?? source.bathymetry?.landMask, width, height, false);
  return {
    width,
    height,
    bottomDepthMeters,
    wetMask,
    landMask,
    eastAxisMeters: normalizeAxis(options.eastAxisMeters ?? source.eastAxisMeters, width, options.domainWidthMeters),
    northAxisMeters: normalizeAxis(options.northAxisMeters ?? source.northAxisMeters, height, options.domainHeightMeters)
  };
}

function normalizeGrid(value) {
  return Array.isArray(value)
    ? value.map((row) => Array.isArray(row) ? row.map((entry) => finite(entry, 0)) : [])
    : [];
}

function normalizeMask(value, width, height, fallback) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
    const explicit = value?.[y]?.[x];
    return explicit == null ? fallback : Boolean(explicit);
  }));
}

function normalizeAxis(value, count, spanMeters) {
  if (Array.isArray(value) && value.length === count) return value.map((entry) => finite(entry, 0));
  const span = Math.max(1, finite(spanMeters, Math.max(1, count - 1)));
  const step = count > 1 ? span / (count - 1) : 0;
  return Array.from({ length: count }, (_entry, index) => round(index * step));
}

function normalizeDepthAxis(value, bottomDepthMeters) {
  const maxDepth = Math.max(1, ...bottomDepthMeters.flat().map(Number).filter(Number.isFinite));
  const axis = Array.isArray(value) && value.length ? value : [0, 10, 35, 75, 150, 300, 600];
  const filtered = uniqueNumbers(axis).filter((depth) => depth <= maxDepth + 1e-6);
  if (filtered.length >= 2) return filtered;
  return uniqueNumbers([0, Math.min(maxDepth, 20), Math.min(maxDepth, 60), Math.min(maxDepth, 120)]);
}

function normalizeTimeAxis(value, durationSeconds) {
  if (Array.isArray(value) && value.length) return uniqueNumbers(value);
  const duration = Math.max(1, finite(durationSeconds, 7200));
  return Array.from({ length: 7 }, (_entry, index) => round(duration * index / 6));
}

function centerForFeature(records = [], types = []) {
  const record = records.find((entry) => types.includes(entry.type) && entry.approximateCenterMeters);
  if (!record) return null;
  const east = Number(record.approximateCenterMeters.eastMeters);
  const north = Number(record.approximateCenterMeters.northMeters);
  const maxEast = Math.max(1, ...records.map((entry) => Number(entry.approximateCenterMeters?.eastMeters)).filter(Number.isFinite));
  const maxNorth = Math.max(1, ...records.map((entry) => Number(entry.approximateCenterMeters?.northMeters)).filter(Number.isFinite));
  return { x: clamp(east / maxEast, 0.08, 0.92), y: clamp(north / maxNorth, 0.08, 0.92) };
}

function seededCenter(seed, x, y) {
  const n = numericSeed(seed, 17);
  return {
    x: clamp(x + (((n % 19) - 9) / 100), 0.08, 0.92),
    y: clamp(y + ((((n >> 4) % 19) - 9) / 100), 0.08, 0.92)
  };
}

function reducedOrderRoleForComponent(id) {
  return {
    alongShelfJet: 'coast-parallel shelf streamfunction component',
    shelfBreakJet: 'shelf-break jet component',
    depthShear: 'vertical shear profile component',
    barotropicTide: 'bounded tide-like reversal component',
    mesoscaleEddy: 'recirculating eddy component',
    translatingEddy: 'slowly translating eddy component',
    calmOrWeakCurrentRegion: 'sheltered weak-current damping envelope',
    localizedCanyonExchange: 'localized mouth/strait/canyon exchange component',
    islandWakeApproximation: 'island/seamount wake component',
    optionalWindDrivenSurfaceShear: 'surface-intensified background shear component'
  }[id] ?? 'atlas-conditioned current component';
}

function uniqueStrings(value) {
  const source = Array.isArray(value) ? value : [value];
  return [...new Set(source.map((entry) => entry == null ? '' : String(entry).trim()).filter(Boolean))];
}

function uniqueNumbers(value) {
  return [...new Set((Array.isArray(value) ? value : [value]).map(Number).filter(Number.isFinite))]
    .sort((a, b) => a - b)
    .map((entry) => round(entry));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function numericSeed(value, fallback = 1) {
  const text = String(value ?? '');
  if (!text) return fallback;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableToken(value) {
  return String(value ?? 'field').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(-18) || 'field';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, finite(value, min)));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

module.exports = {createAtlasConditionedCurrentField, buildAtlasConditionedCurrentArtifact, atlasCurrentComponentPlan}