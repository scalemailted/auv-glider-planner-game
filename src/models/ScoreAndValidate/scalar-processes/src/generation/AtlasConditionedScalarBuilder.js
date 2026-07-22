const ScalarField4D = require('../ScalarField4D.js')
const ScalarFieldDiagnostics = require('../ScalarFieldDiagnostics.js')
const ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION = 'atlas-conditioned-scalar-builder-field-regen-r1';

 function createAtlasConditionedScalarField(options = {}) {
  return buildAtlasConditionedScalarArtifact(options).scalarArtifact;
}

 function buildAtlasConditionedScalarArtifact(options = {}) {
  const recipe = options.regionalMissionRecipe ?? {};
  const flowInputs = options.flowGenerationInputs ?? recipe.flowGenerationInputs ?? {};
  const bathymetry = normalizeBathymetry(options);
  if (!bathymetry.bottomDepthMeters.length || !bathymetry.bottomDepthMeters[0]?.length) {
    throw new Error('Atlas-conditioned scalar generation requires bottomDepthMeters.');
  }
  const scalarRegimeHints = uniqueStrings(options.scalarRegimeHints ?? flowInputs.scalarRegimeHints ?? recipe.scalarRegimeHints ?? recipe.scalarRegime ?? []);
  const featureRecords = Array.isArray(options.featureRecords) ? options.featureRecords : [];
  const currentArtifact = options.currentArtifact ?? options.currentField4D ?? null;
  const depthAxisMeters = normalizeDepthAxis(options.depthAxisMeters ?? flowInputs.depthAxisMeters ?? currentArtifact?.depthAxisMeters, bathymetry.bottomDepthMeters);
  const timeAxisSeconds = normalizeTimeAxis(options.timeAxisSeconds ?? flowInputs.timeAxisSeconds ?? currentArtifact?.timeAxisSeconds, options.missionDurationSeconds ?? flowInputs.missionDurationSeconds ?? recipe.missionDurationSeconds);
  const componentPlan = atlasScalarComponentPlan({ scalarRegimeHints, featureRecords, seed: options.seed ?? recipe.randomSeed ?? flowInputs.recipeDigest ?? 'atlas-scalar' });
  const scalarValue = buildScalarCube({
    bathymetry,
    depthAxisMeters,
    timeAxisSeconds,
    scalarRegimeHints,
    featureRecords,
    currentArtifact,
    componentPlan,
    seed: options.seed ?? recipe.randomSeed ?? flowInputs.recipeDigest ?? 'atlas-scalar'
  });
  const sourceId = options.id ?? `atlas-conditioned-scalar-${stableToken(recipe.recipeDigest ?? flowInputs.recipeDigest ?? 'field')}`;
  const sourceLabel = options.sourceLabel ?? options.label ?? 'Atlas-conditioned synthetic scalar science field';
  const sourceMetadata = {
    ...(options.sourceMetadata ?? {}),
    sourceId,
    fieldId: sourceId,
    label: sourceLabel,
    sourceTier: options.sourceTier ?? options.sourceMetadata?.sourceTier ?? 'scientificallyConstrainedSynthetic',
    sourceType: options.sourceType ?? options.sourceMetadata?.sourceType ?? 'atlas-conditioned-synthetic-scalar',
    processKind: options.processKind ?? options.sourceMetadata?.processKind ?? 'atlasConditionedScalarRegimeSyntheticV1',
    equationFamily: options.equationFamily ?? options.sourceMetadata?.equationFamily ?? 'atlasConditionedScalarRegimeSyntheticV1',
    generatorBackend: options.generatorBackend ?? options.sourceMetadata?.generatorBackend ?? 'atlasConditionedScalarBuilder',
    generatorVersion: options.generatorVersion ?? options.sourceMetadata?.generatorVersion ?? ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION,
    atlasDigest: flowInputs.atlasDigest ?? recipe.atlasDigest ?? null,
    windowDigest: flowInputs.windowDigest ?? recipe.windowDigest ?? null,
    recipeDigest: flowInputs.recipeDigest ?? recipe.recipeDigest ?? null,
    bathymetryArtifactDigest: flowInputs.bathymetryArtifactDigest ?? options.bathymetryArtifact?.artifactDigest ?? null,
    currentArtifactDigest: options.currentArtifactDigest ?? currentArtifact?.digest ?? null,
    referenceFixtureId: options.referenceFixtureId ?? options.sourceMetadata?.referenceFixtureId ?? flowInputs.referenceFixtureId ?? null,
    fieldPolicy: options.fieldPolicy ?? options.sourceMetadata?.fieldPolicy ?? flowInputs.fieldPolicy ?? null,
    scalarRegimeHints,
    scalarRegimeComponents: componentPlan.componentMetadata,
    sourceZones: componentPlan.sourceZones,
    synthetic: true,
    publicSafe: true,
    hiddenTruthIncluded: false,
    visibilityTier: 'publicScenario',
    calibratedForecast: false,
    calibratedOceanForecast: false,
    calibratedBiogeochemicalForecast: false,
    usesRealHycom: false,
    usesRealMarineCopernicus: false,
    depthDependent: true,
    timeDependent: true,
    units: 'normalized science value',
    warnings: uniqueStrings([
      ...(Array.isArray(options.warnings) ? options.warnings : []),
      'Atlas-conditioned synthetic scalar field for deterministic benchmark use; not a calibrated ocean forecast, ecological forecast, biogeochemical forecast, or operational product.',
      'Scalar hotspots are generated from atlas regime hints, bathymetry, masks, feature zones, and generated synthetic currents.'
    ])
  };
  const scalarArtifact = ScalarField4D.createScalarField4D({
    id: sourceMetadata.fieldId,
    label: sourceMetadata.label,
    xAxis: bathymetry.eastAxisMeters,
    yAxis: bathymetry.northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    scalarValue,
    sourceMetadata,
    boundaryFlags: {
      rendererOwnsScalarTruth: false,
      displayLayerChangesScalarTruth: false,
      changesOfficialScoring: false,
      ownsVehiclePhysics: false,
      ownsObservationNoise: false,
      ownsBathymetry: false,
      ownsCurrents: false,
      hiddenTruthExposed: false
    }
  });
  scalarArtifact.diagnostics = ScalarFieldDiagnostics.computeScalarFieldDiagnostics(scalarArtifact);
  scalarArtifact.digest = ScalarField4D.scalarField4DDigest(scalarArtifact);
  const validation = ScalarField4D.validateScalarField4D(scalarArtifact);
  const summary = ScalarField4D.scalarField4DSummary(scalarArtifact);
  const hotspotArtifact = createHotspotArtifact({
    scalarArtifact,
    scalarRegimeHints,
    featureRecords,
    recipe,
    flowInputs,
    seed: options.seed ?? recipe.randomSeed ?? flowInputs.recipeDigest ?? 'atlas-scalar'
  });
  return {
    type: 'anchor.scalar-processes.atlas-conditioned-scalar-builder-result',
    version: ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION,
    scalarArtifact,
    scalarArtifactDigest: scalarArtifact.digest,
    scalarFieldSummary: summary,
    scalarDiagnostics: scalarArtifact.diagnostics,
    hotspotArtifact,
    hotspotArtifactDigest: hotspotArtifact.hotspotDigest,
    validation,
    componentPlan,
    claimBoundary: {
      synthetic: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      ecologicalForecast: false,
      hiddenTruthExposed: false,
      simulationChanged: false,
      scoringChanged: false
    },
    hiddenTruthExposed: false
  };
}

 function atlasScalarComponentPlan(options = {}) {
  const scalarRegimeHints = uniqueStrings(options.scalarRegimeHints);
  const sourceZones = sourceZonesFromFeatures(options.featureRecords ?? [], scalarRegimeHints, options.seed);
  const componentMetadata = scalarRegimeHints.length ? scalarRegimeHints : ['shelfNutrientPatch'];
  return {
    type: 'anchor.scalar-processes.atlas-scalar-component-plan',
    version: ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION,
    scalarRegimeHints: componentMetadata,
    sourceZones,
    componentMetadata: componentMetadata.map((id) => ({
      id,
      reducedOrderRole: scalarRole(id),
      provenance: 'RegionalMissionRecipe.scalarRegimeHints',
      syntheticNotCalibrated: true
    }))
  };
}

function buildScalarCube(context) {
  const { bathymetry, depthAxisMeters, timeAxisSeconds } = context;
  const width = bathymetry.width;
  const height = bathymetry.height;
  const maxDepth = Math.max(1, ...bathymetry.bottomDepthMeters.flat().map(Number).filter(Number.isFinite));
  const domainSpan = { east: Math.max(1, bathymetry.eastAxisMeters.at(-1) ?? width - 1), north: Math.max(1, bathymetry.northAxisMeters.at(-1) ?? height - 1) };
  return timeAxisSeconds.map((timeSeconds, ti) => {
    const timeFrac = timeAxisSeconds.length > 1 ? ti / (timeAxisSeconds.length - 1) : 0;
    return depthAxisMeters.map((depthMeters) => {
      const depthNormGlobal = clamp(depthMeters / maxDepth, 0, 1);
      return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
        const bottom = Number(bathymetry.bottomDepthMeters[y]?.[x] ?? 0);
        if (bathymetry.wetMask[y]?.[x] === false || depthMeters > bottom + 1e-6) return 0;
        const xNorm = width > 1 ? x / (width - 1) : 0;
        const yNorm = height > 1 ? y / (height - 1) : 0;
        const depthNorm = clamp(depthMeters / Math.max(1, bottom), 0, 1);
        const speed = currentSpeedAt(context.currentArtifact, ti, depthMeters, y, x);
        let value = 0.08 + 0.04 * Math.sin((xNorm * 2.1 + yNorm * 1.7 + timeFrac) * Math.PI);
        value += shelfNutrient(context, { xNorm, yNorm, depthNorm, depthNormGlobal, bottom, maxDepth });
        value += riverPlume(context, { xNorm, yNorm, depthNorm, timeFrac });
        value += bloomPatch(context, { xNorm, yNorm, depthNorm, timeFrac });
        value += thermoclineHotspot(context, { xNorm, yNorm, depthMeters, timeFrac });
        value += mixingFront(context, { xNorm, yNorm, speed, depthNorm });
        value += eddyTrappedHotspot(context, { xNorm, yNorm, depthNorm, timeFrac });
        value += islandWakePatch(context, { xNorm, yNorm, depthNorm, speed });
        value += sparseOpenOceanPatch(context, { xNorm, yNorm, depthNorm, timeFrac });
        return round(clamp(value, 0, 1));
      }));
    });
  });
}

function shelfNutrient(context, sample) {
  if (!hasRegime(context, 'shelfNutrientPatch')) return 0;
  const shelf = clamp(1 - sample.bottom / Math.max(1, sample.maxDepth * 0.45), 0, 1);
  return 0.22 * shelf * Math.exp(-sample.depthNorm * 1.8);
}

function riverPlume(context, sample) {
  if (!hasRegime(context, 'riverPlume')) return 0;
  const source = zoneCenter(context.componentPlan.sourceZones.riverMouthDeltaSourceZones?.[0], 0.16, 0.16);
  const shift = 0.08 * sample.timeFrac;
  return 0.38 * gaussian2(sample.xNorm, sample.yNorm, source.x + shift, source.y + shift * 0.35, 0.18, 0.12) * Math.exp(-sample.depthNorm * 3.2);
}

function bloomPatch(context, sample) {
  if (!hasRegime(context, 'bloomPatch')) return 0;
  const source = zoneCenter(context.componentPlan.sourceZones.deepBasinCenters?.[0], 0.58, 0.44);
  const growth = 0.75 + 0.25 * Math.sin(sample.timeFrac * Math.PI);
  return 0.24 * growth * gaussian2(sample.xNorm, sample.yNorm, source.x, source.y, 0.24, 0.18) * (0.92 - 0.28 * sample.depthNorm);
}

function thermoclineHotspot(context, sample) {
  if (!hasRegime(context, 'thermoclineHotspot')) return 0;
  const zone = zoneCenter(context.componentPlan.sourceZones.shelfBreakZones?.[0], 0.48, 0.52);
  const depthWeight = Math.exp(-Math.pow((sample.depthMeters - 75) / 42, 2));
  return 0.32 * depthWeight * gaussian2(sample.xNorm, sample.yNorm, zone.x, zone.y, 0.28, 0.2);
}

function mixingFront(context, sample) {
  if (!hasRegime(context, 'mixingFront')) return 0;
  const zone = zoneCenter(context.componentPlan.sourceZones.straitSillSegments?.[0] ?? context.componentPlan.sourceZones.shelfBreakZones?.[0], 0.5, 0.5);
  return 0.26 * gaussian2(sample.xNorm, sample.yNorm, zone.x, zone.y, 0.12, 0.34) * (0.45 + 0.55 * clamp(sample.speed / 0.28, 0, 1)) * (0.35 + 0.65 * sample.depthNorm);
}

function eddyTrappedHotspot(context, sample) {
  if (!hasRegime(context, 'eddyTrappedHotspot')) return 0;
  const cx = 0.6 + 0.09 * Math.sin(sample.timeFrac * Math.PI * 2);
  const cy = 0.48 + 0.07 * Math.cos(sample.timeFrac * Math.PI * 2);
  return 0.28 * gaussian2(sample.xNorm, sample.yNorm, cx, cy, 0.17, 0.17) * (0.8 - 0.25 * sample.depthNorm);
}

function islandWakePatch(context, sample) {
  if (!hasRegime(context, 'islandWakePatch')) return 0;
  const zone = zoneCenter(context.componentPlan.sourceZones.islandSeamountZones?.[0], 0.72, 0.3);
  return 0.25 * gaussian2(sample.xNorm, sample.yNorm, zone.x - 0.08, zone.y + 0.03, 0.18, 0.12) * (0.3 + 0.7 * Math.exp(-sample.depthNorm * 2)) * (0.6 + 0.4 * clamp(sample.speed / 0.25, 0, 1));
}

function sparseOpenOceanPatch(context, sample) {
  if (!hasRegime(context, 'sparseOpenOceanPatch')) return 0;
  return 0.2 * gaussian2(sample.xNorm, sample.yNorm, 0.68, 0.62, 0.16, 0.16) * (0.8 - 0.22 * sample.depthNorm) * (0.85 + 0.15 * Math.cos(sample.timeFrac * Math.PI * 2));
}

function createHotspotArtifact(options = {}) {
  const field = options.scalarArtifact;
  const width = field.xAxis.length;
  const height = field.yAxis.length;
  const scores = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const values = [];
      for (let t = 0; t < field.timeAxisSeconds.length; t += 1) {
        for (let z = 0; z < field.depthAxisMeters.length; z += 1) values.push(Number(field.scalarValue?.[t]?.[z]?.[y]?.[x]));
      }
      const finite = values.filter(Number.isFinite);
      const mean = finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
      scores.push({ x, y, score: mean });
    }
  }
  scores.sort((a, b) => b.score - a.score);
  const hotspots = [];
  for (const candidate of scores) {
    if (hotspots.length >= 8) break;
    if (candidate.score <= 0) continue;
    if (hotspots.some((entry) => Math.hypot(entry.xIndex - candidate.x, entry.yIndex - candidate.y) < Math.max(4, Math.min(width, height) * 0.08))) continue;
    hotspots.push({
      hotspotId: `hotspot-${hotspots.length + 1}`,
      xIndex: candidate.x,
      yIndex: candidate.y,
      eastMeters: round(field.xAxis[candidate.x] ?? candidate.x),
      northMeters: round(field.yAxis[candidate.y] ?? candidate.y),
      meanScalarValue: round(candidate.score),
      sourceRegimeHints: options.scalarRegimeHints ?? [],
      validationStatus: 'NEEDS_VALIDATION'
    });
  }
  const artifactBase = {
    type: 'anchor.environment-studio.synthetic-hotspot-artifact',
    version: ATLAS_CONDITIONED_SCALAR_BUILDER_VERSION,
    atlasDigest: options.flowInputs?.atlasDigest ?? options.recipe?.atlasDigest ?? null,
    windowDigest: options.flowInputs?.windowDigest ?? options.recipe?.windowDigest ?? null,
    recipeDigest: options.flowInputs?.recipeDigest ?? options.recipe?.recipeDigest ?? null,
    scalarArtifactDigest: field.digest,
    scalarRegimeHints: options.scalarRegimeHints ?? [],
    hotspots,
    publicSafe: true,
    hiddenTruthExposed: false,
    calibratedForecast: false,
    operationalForecast: false,
    status: hotspots.length ? 'CURRENT' : 'WARN'
  };
  return {
    ...artifactBase,
    hotspotDigest: ScalarFieldDiagnostics.scalarFieldDigest(artifactBase)
  };
}

function sourceZonesFromFeatures(records = [], scalarRegimeHints = [], seed = '') {
  return {
    riverMouthDeltaSourceZones: compactFeatures(records, ['riverDelta', 'riverMouth']),
    shelfBreakZones: compactFeatures(records, ['shelfBreak']),
    deepBasinCenters: compactFeatures(records, ['deepBasin', 'gulfBay']),
    islandSeamountZones: compactFeatures(records, ['islandSeamount']),
    straitSillSegments: compactFeatures(records, ['ridgeSill', 'straitSill']),
    fallbackZones: [{
      id: `fallback-${stableToken(seed)}`,
      centerNormalized: seededCenter(seed, scalarRegimeHints.includes('riverPlume') ? 0.18 : 0.55, scalarRegimeHints.includes('riverPlume') ? 0.18 : 0.5)
    }]
  };
}

function compactFeatures(records = [], types = []) {
  const maxEast = Math.max(1, ...records.map((entry) => Number(entry.approximateCenterMeters?.eastMeters)).filter(Number.isFinite));
  const maxNorth = Math.max(1, ...records.map((entry) => Number(entry.approximateCenterMeters?.northMeters)).filter(Number.isFinite));
  return records
    .filter((entry) => types.includes(entry.type))
    .slice(0, 6)
    .map((entry) => ({
      id: entry.featureId ?? entry.id ?? entry.type,
      type: entry.type,
      label: entry.label ?? entry.type,
      centerNormalized: {
        x: clamp(Number(entry.approximateCenterMeters?.eastMeters) / maxEast, 0, 1),
        y: clamp(Number(entry.approximateCenterMeters?.northMeters) / maxNorth, 0, 1)
      },
      confidence: round(entry.confidence ?? 1)
    }));
}

function hasRegime(context, id) {
  return context.scalarRegimeHints.includes(id);
}

function currentSpeedAt(currentArtifact, ti, depthMeters, y, x) {
  if (!currentArtifact) return 0;
  const zi = nearestIndex(currentArtifact.depthAxisMeters ?? [], depthMeters);
  const t = Math.min((currentArtifact.timeAxisSeconds?.length ?? 1) - 1, ti);
  const u = Number(currentArtifact.uEastMetersPerSecond?.[t]?.[zi]?.[y]?.[x] ?? 0);
  const v = Number(currentArtifact.vNorthMetersPerSecond?.[t]?.[zi]?.[y]?.[x] ?? 0);
  return Number.isFinite(u) && Number.isFinite(v) ? Math.hypot(u, v) : 0;
}

function normalizeBathymetry(options = {}) {
  const source = options.bathymetryArtifact ?? options.bathymetry ?? {};
  const bottomDepthMeters = normalizeGrid(options.bottomDepthMeters ?? source.bottomDepthMeters ?? source.bathymetry?.bottomDepthMeters ?? source.depthMeters ?? source.bathymetry?.depthMeters);
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  return {
    width,
    height,
    bottomDepthMeters,
    wetMask: normalizeMask(options.wetLandMask?.wetMask ?? options.wetMask ?? source.wetMask ?? source.bathymetry?.wetMask, width, height, true),
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

function nearestIndex(axis = [], value = 0) {
  let best = 0;
  let bestDistance = Infinity;
  axis.forEach((entry, index) => {
    const distance = Math.abs(Number(entry) - Number(value));
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function zoneCenter(zone, fallbackX, fallbackY) {
  return {
    x: clamp(zone?.centerNormalized?.x ?? fallbackX, 0, 1),
    y: clamp(zone?.centerNormalized?.y ?? fallbackY, 0, 1)
  };
}

function seededCenter(seed, x, y) {
  const n = numericSeed(seed, 17);
  return {
    x: clamp(x + (((n % 19) - 9) / 100), 0.08, 0.92),
    y: clamp(y + ((((n >> 4) % 19) - 9) / 100), 0.08, 0.92)
  };
}

function scalarRole(id) {
  return {
    riverPlume: 'surface/shallow source plume near river-mouth or delta zones',
    bloomPatch: 'broad synthetic biological patch with bounded time modulation',
    thermoclineHotspot: 'depth-layer-specific thermocline/midwater hotspot',
    mixingFront: 'front-like gradient near strait, sill, or shelf-break zones',
    eddyTrappedHotspot: 'moving synthetic patch associated with eddy retention',
    islandWakePatch: 'wake-side patch around island or seamount zones',
    shelfNutrientPatch: 'shallow shelf nutrient-like synthetic patch',
    sparseOpenOceanPatch: 'sparse open-ocean benchmark patch'
  }[id] ?? 'atlas-conditioned scalar component';
}

function gaussian2(x, y, cx, cy, sx, sy) {
  const dx = (x - cx) / Math.max(1e-6, sx);
  const dy = (y - cy) / Math.max(1e-6, sy);
  return Math.exp(-0.5 * (dx * dx + dy * dy));
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

module.exports = {createAtlasConditionedScalarField, buildAtlasConditionedScalarArtifact, atlasScalarComponentPlan}