import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';
import { bathymetryArtifactAdapterSummary, createBathymetryArtifactFromField } from './BathymetryArtifactAdapter.js';
import {
  ENVIRONMENT_STUDIO_LIMITS,
  ENVIRONMENT_STUDIO_STATUS
} from '../editor/EnvironmentStudioContracts.js';
import { sampleAtlasLayer } from '../editor/SyntheticOceanAtlas.js';
import {
  clamp,
  domainWarp2D,
  fractalBrownianMotion2D,
  gaussian2D,
  lerp,
  ridgedNoise2D,
  round,
  smoothstep,
  worleyDistance2D
} from '../editor/SyntheticAtlasNoise.js';

export const WINDOW_CONDITIONED_BATHYMETRY_BUILDER_TYPE = 'anchor.window-conditioned-bathymetry-builder-result';
export const WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION = 'window-conditioned-bathymetry-builder-r1-1';
export const WINDOW_CONDITIONED_BATHYMETRY_FIELD_TYPE = 'anchor.window-conditioned-bathymetry-field';

const FEATURE_FAMILIES = Object.freeze([
  'continentalShelf',
  'shelfBreak',
  'deepBasin',
  'submarineCanyon',
  'islandSeamount',
  'riverDelta',
  'ridgeSill',
  'gulfBay',
  'openOceanCorridor'
]);

export function buildWindowConditionedBathymetry(recipeInput = {}, options = {}) {
  const recipe = normalizeRecipe(recipeInput);
  const dimensions = dimensionsFromRecipe(recipe, options);
  if (dimensions.cellCount > ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount) {
    throw new Error(`Window-conditioned bathymetry grid ${dimensions.columns} x ${dimensions.rows} exceeds maxDomainCellCount ${ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount}.`);
  }

  const atlas = options.atlas?.layers ? options.atlas : null;
  const attempts = [];
  let best = null;
  const maxAttempts = Math.max(1, Math.min(3, Math.round(Number(options.maxAttempts ?? 3))));
  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const seed = `${recipe.randomSeed ?? 'window-bathymetry'}:attempt:${attemptIndex}`;
    const candidate = createBathymetryCandidate(recipe, {
      ...options,
      atlas,
      seed,
      dimensions,
      attemptIndex
    });
    attempts.push(compactAttempt(candidate));
    if (!best || candidate.validationReport.numericScore > best.validationReport.numericScore) best = candidate;
    if (candidate.validationReport.status === ENVIRONMENT_STUDIO_STATUS.PASS) break;
  }

  const selected = best ?? attempts[0];
  const artifact = createBathymetryArtifactFromField(selected.bathymetryField, {
    id: `window-conditioned-${stableToken(recipe.recipeDigest ?? recipe.windowDigest)}-bathymetry`,
    operationalDomain: {
      horizontal: {
        widthMeters: recipe.domainSize.widthMeters,
        heightMeters: recipe.domainSize.heightMeters
      }
    },
    sourceMetadata: {
      sourceType: 'deterministicSyntheticAtlasWindow',
      atlasDigest: recipe.atlasDigest,
      windowDigest: recipe.windowDigest,
      recipeDigest: recipe.recipeDigest,
      builderVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
      calibratedBathymetry: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    },
    provenance: {
      generatedBy: 'src/core/generation/WindowConditionedBathymetryBuilder.js',
      generatorVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
      deterministicSeed: selected.seed,
      synthetic: true,
      calibratedBathymetry: false,
      operationalNavigationProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  });

  const resultBase = {
    type: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_TYPE,
    version: '1.1.0',
    builderVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
    recipeDigest: recipe.recipeDigest ?? null,
    atlasDigest: recipe.atlasDigest ?? null,
    windowDigest: recipe.windowDigest ?? null,
    selectedAttempt: selected.attemptIndex,
    generationAttempts: attempts,
    bathymetryField: selected.bathymetryField,
    bathymetryArtifact: artifact,
    bathymetryArtifactSummary: bathymetryArtifactAdapterSummary(artifact),
    bathymetryArtifactDigest: artifact.artifactDigest,
    wetLandMask: {
      wetMask: selected.bathymetryField.wetMask,
      landMask: selected.bathymetryField.landMask,
      landSeaMask: selected.bathymetryField.landSeaMask
    },
    coastlineSummary: selected.coastlineSummary,
    featureSummary: selected.featureSummary,
    featureRecords: selected.featureRecords,
    validationReport: selected.validationReport,
    provenance: {
      generatedBy: 'src/core/generation/WindowConditionedBathymetryBuilder.js',
      generatorVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
      deterministicSeed: selected.seed,
      recipeDigest: recipe.recipeDigest ?? null,
      atlasDigest: recipe.atlasDigest ?? null,
      windowDigest: recipe.windowDigest ?? null,
      attemptCount: attempts.length,
      sourceModel: 'structured procedural atlas window with distance fields, feature primitives, seeded placement, controlled roughness, smoothing, and validation',
      rawNoiseTerrain: false,
      synthetic: true,
      calibratedBathymetry: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    },
    claimBoundary: {
      synthetic: true,
      deterministicSyntheticAtlas: true,
      bottomSurface2_5D: true,
      realEarthMap: false,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(resultBase, 'builderDigest');
}

export function compactWindowConditionedBathymetryResult(result = {}) {
  return {
    type: 'anchor.window-conditioned-bathymetry-builder-summary',
    builderVersion: result.builderVersion ?? WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
    builderDigest: result.builderDigest ?? null,
    recipeDigest: result.recipeDigest ?? null,
    atlasDigest: result.atlasDigest ?? null,
    windowDigest: result.windowDigest ?? null,
    bathymetryArtifactDigest: result.bathymetryArtifactDigest ?? result.bathymetryArtifact?.artifactDigest ?? null,
    bathymetryArtifactSummary: result.bathymetryArtifactSummary ?? null,
    generationAttempts: result.generationAttempts ?? [],
    selectedAttempt: result.selectedAttempt ?? 0,
    coastlineSummary: result.coastlineSummary ?? null,
    featureSummary: result.featureSummary ?? null,
    featureRecords: result.featureRecords ?? [],
    validationReport: result.validationReport ?? null,
    datasetTags: result.datasetTags ?? null,
    hiddenTruthExposed: false,
    calibratedBathymetry: false,
    operationalForecast: false
  };
}

export function validateWindowConditionedBathymetry(result = {}) {
  return result.validationReport ?? validateCandidateField(result.bathymetryField ?? {}, result.featureRecords ?? [], result.coastlineSummary ?? {}, {});
}

function createBathymetryCandidate(recipe, options = {}) {
  const seed = String(options.seed ?? recipe.randomSeed ?? 'window-bathymetry');
  const dimensions = options.dimensions ?? dimensionsFromRecipe(recipe, options);
  const rows = dimensions.rows;
  const columns = dimensions.columns;
  const bounds = normalizeBounds(recipe.selectedWindow?.bounds ?? recipe.selectedWindow ?? {});
  const maxDepthMeters = maxDepthForRecipe(recipe, options);
  const bottomDepthMeters = emptyGrid(rows, columns, 0);
  const landMask = emptyGrid(rows, columns, false);
  const wetMask = emptyGrid(rows, columns, false);
  const landSeaMask = emptyGrid(rows, columns, 'land');
  const sampled = emptyGrid(rows, columns, null);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const nx = columns <= 1 ? 0 : x / (columns - 1);
      const ny = rows <= 1 ? 0 : y / (rows - 1);
      const ax = lerp(bounds.xMin, bounds.xMax, nx);
      const ay = lerp(bounds.yMin, bounds.yMax, ny);
      const fields = atlasFieldsAt(options.atlas, recipe, ax, ay);
      sampled[y][x] = fields;
      const warp = domainWarp2D(`${seed}:regional`, nx, ny, { strength: 0.045, frequency: 1.7 });
      const rough = fractalBrownianMotion2D(`${seed}:rough`, warp.x * 5.4, warp.y * 5.4, { octaves: 4 });
      const ridgeTexture = ridgedNoise2D(`${seed}:ridge`, nx * 4.8, ny * 4.8, { octaves: 3 });
      const basinTexture = 1 - worleyDistance2D(`${seed}:basin-cells`, nx, ny, { cells: 5 });
      const land = fields.landOceanMask >= 0.58 || (fields.islandSeamount > 0.84 && fields.distanceToCoast < 0.045);
      const shelfProfile = 8
        + maxDepthMeters * (0.12 + 0.36 * smoothstep(0.02, 0.48, fields.distanceToCoast))
        + maxDepthMeters * 0.18 * (1 - fields.continentalShelf);
      let depth = shelfProfile;
      depth += maxDepthMeters * 0.42 * fields.deepBasin;
      depth += maxDepthMeters * 0.28 * fields.canyonPotential * (0.35 + fields.shelfBreak * 0.65);
      depth += maxDepthMeters * 0.08 * fields.openOceanCorridor;
      depth += maxDepthMeters * 0.04 * basinTexture * fields.deepBasin;
      depth -= maxDepthMeters * 0.26 * fields.islandSeamount;
      depth -= maxDepthMeters * 0.18 * fields.straitSillInfluence * (0.55 + ridgeTexture * 0.45);
      depth -= maxDepthMeters * 0.18 * fields.riverMouthInfluence * (0.5 + fields.continentalShelf);
      depth -= maxDepthMeters * 0.08 * fields.gulfBayInfluence;
      depth += (rough - 0.5) * maxDepthMeters * (0.035 + fields.shelfBreak * 0.035 + fields.canyonPotential * 0.025);

      if (land) {
        landMask[y][x] = true;
        landSeaMask[y][x] = 'land';
        bottomDepthMeters[y][x] = 0;
      } else {
        const minimumWetDepth = fields.riverMouthInfluence > 0.55 ? 3 : 5;
        bottomDepthMeters[y][x] = round(clamp(depth, minimumWetDepth, maxDepthMeters));
        wetMask[y][x] = true;
        landSeaMask[y][x] = 'water';
      }
    }
  }

  const smoothed = slopeLimit(smoothDepthGrid(bottomDepthMeters, wetMask, 2), wetMask, maxDepthMeters * 0.12);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      bottomDepthMeters[y][x] = wetMask[y][x] ? round(Math.max(3, smoothed[y][x])) : 0;
    }
  }

  const coastline = coastlineSegments(wetMask, dimensions);
  const coastlineSummary = summarizeCoastline(coastline, wetMask, dimensions);
  const featureRecords = featureRecordsFromFields({
    recipe,
    sampled,
    bottomDepthMeters,
    wetMask,
    dimensions,
    maxDepthMeters
  });
  const featureSummary = summarizeFeatures(featureRecords, sampled, bottomDepthMeters, wetMask, dimensions, maxDepthMeters);
  const bathymetryField = {
    type: WINDOW_CONDITIONED_BATHYMETRY_FIELD_TYPE,
    version: '1.1.0',
    seed,
    width: columns,
    height: rows,
    bottomDepthMeters,
    depthMeters: bottomDepthMeters,
    landMask,
    wetMask,
    landSeaMask,
    coastline,
    terrainFeatures: {
      featureRecords,
      featureSummary
    },
    featureIds: featureRecords.map((record) => record.type),
    operationalDomain: {
      horizontal: {
        widthMeters: dimensions.widthMeters,
        heightMeters: dimensions.heightMeters
      }
    },
    physicalExtentMeters: {
      east: dimensions.widthMeters,
      north: dimensions.heightMeters
    },
    sourceMetadata: {
      sourceType: 'deterministicSyntheticAtlasWindow',
      builderVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
      atlasDigest: recipe.atlasDigest ?? null,
      windowDigest: recipe.windowDigest ?? null,
      recipeDigest: recipe.recipeDigest ?? null,
      atlasFieldStats: recipe.atlasFieldStats ?? null,
      datasetTags: recipe.datasetTags ?? null,
      hiddenTruthExposed: false,
      calibratedBathymetry: false,
      operationalForecast: false
    },
    provenance: {
      generatedBy: 'src/core/generation/WindowConditionedBathymetryBuilder.js',
      generatorVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
      deterministicSeed: seed,
      attemptIndex: options.attemptIndex ?? 0,
      structuredComposition: [
        'base shelf-to-basin profile',
        'deep basin depressions',
        'submarine canyon incisions',
        'ridge/sill shoaling',
        'island/seamount shoaling',
        'river/delta shallow lobes',
        'controlled roughness',
        'deterministic smoothing and slope limiting'
      ],
      rawNoiseTerrain: false,
      synthetic: true,
      hiddenTruthExposed: false
    }
  };
  const validationReport = validateCandidateField(bathymetryField, featureRecords, coastlineSummary, recipe);
  return {
    attemptIndex: options.attemptIndex ?? 0,
    seed,
    bathymetryField,
    coastlineSummary,
    featureSummary,
    featureRecords,
    validationReport
  };
}

function validateCandidateField(field = {}, featureRecords = [], coastlineSummary = {}, recipe = {}) {
  const depths = field.bottomDepthMeters ?? [];
  const wetMask = field.wetMask ?? [];
  const rows = depths.length;
  const columns = depths[0]?.length ?? 0;
  const cellCount = rows * columns;
  const flat = depths.flat().map(Number);
  const finiteDepths = flat.every(Number.isFinite);
  const waterDepths = [];
  let wetCount = 0;
  let landCount = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const wet = wetMask[y]?.[x] === true;
      if (wet) {
        wetCount += 1;
        waterDepths.push(Number(depths[y][x]));
      } else {
        landCount += 1;
      }
    }
  }
  const connectedWetCells = largestWetComponent(wetMask);
  const components = wetComponents(wetMask);
  const wetFraction = cellCount ? wetCount / cellCount : 0;
  const landFraction = cellCount ? landCount / cellCount : 0;
  const connectedWetFraction = wetCount ? connectedWetCells / wetCount : 0;
  const minDepthMeters = waterDepths.length ? Math.min(...waterDepths) : 0;
  const maxDepthMeters = waterDepths.length ? Math.max(...waterDepths) : 0;
  const meanDepthMeters = waterDepths.length ? waterDepths.reduce((sum, value) => sum + value, 0) / waterDepths.length : 0;
  const slopes = slopeValues(depths, wetMask);
  const maxSlope = slopes.length ? Math.max(...slopes) : 0;
  const p95Slope = percentile(slopes, 0.95);
  const shallowShelfFraction = waterDepths.length ? waterDepths.filter((value) => value <= Math.max(45, maxDepthMeters * 0.28)).length / waterDepths.length : 0;
  const deepBasinFraction = waterDepths.length ? waterDepths.filter((value) => value >= Math.max(90, maxDepthMeters * 0.58)).length / waterDepths.length : 0;
  const featureDiversity = new Set(featureRecords.map((record) => record.type)).size / FEATURE_FAMILIES.length;
  const deploymentZoneSeparationPotential = estimateDeploymentSeparation(wetMask);
  const multiGliderSuitability = suitabilityFromMetrics({
    wetFraction,
    connectedWetFraction,
    featureDiversity,
    deploymentZoneSeparationPotential,
    intendedGliders: recipe.intendedGliders
  });
  const errors = [];
  const warnings = [];
  if (!finiteDepths) errors.push('Generated bathymetry contains non-finite depth values.');
  if (!waterDepths.length) errors.push('Generated bathymetry contains no navigable wet cells.');
  if (cellCount > ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount) errors.push(`Source grid cell count ${cellCount} exceeds browser limit ${ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount}.`);
  if (wetFraction < 0.2) warnings.push('Generated region has low wet fraction for mission planning.');
  if (connectedWetFraction < 0.55) warnings.push('Navigable wet area is fragmented; route diversity may be poor.');
  if (featureDiversity < 0.25) warnings.push('Generated region has limited bathymetry feature diversity.');
  if (deploymentZoneSeparationPotential < 0.35) warnings.push('Deployment-zone separation potential is low for multi-glider missions.');
  if (maxSlope > Math.max(55, maxDepthMeters * 0.22)) warnings.push('Bathymetry slope heuristic found steep local transitions.');
  const status = errors.length
    ? ENVIRONMENT_STUDIO_STATUS.FAIL
    : warnings.length
      ? ENVIRONMENT_STUDIO_STATUS.WARN
      : ENVIRONMENT_STUDIO_STATUS.PASS;
  const numericScore = clamp(
    0.2
    + wetFraction * 0.16
    + connectedWetFraction * 0.24
    + featureDiversity * 0.22
    + deploymentZoneSeparationPotential * 0.1
    + shallowShelfFraction * 0.04
    + deepBasinFraction * 0.04
  );
  return withDigest({
    type: 'anchor.window-conditioned-bathymetry.validation-report',
    version: '1.1.0',
    builderVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
    valid: errors.length === 0,
    status,
    numericScore: round(numericScore),
    errors,
    warnings,
    metrics: {
      finiteDepths,
      rows,
      columns,
      cellCount,
      minDepthMeters: round(minDepthMeters),
      maxDepthMeters: round(maxDepthMeters),
      meanDepthMeters: round(meanDepthMeters),
      landFraction: round(landFraction),
      wetFraction: round(wetFraction),
      connectedWetFraction: round(connectedWetFraction),
      isolatedWetPockets: Math.max(0, components.length - 1),
      shallowShelfFraction: round(shallowShelfFraction),
      deepBasinFraction: round(deepBasinFraction),
      shelfBreakLengthEstimate: round(featureRecords.find((record) => record.type === 'shelfBreak')?.lengthMeters ?? 0),
      canyonCount: featureRecords.filter((record) => record.type === 'submarineCanyon').length,
      islandSeamountCount: featureRecords.filter((record) => record.type === 'islandSeamount').length,
      ridgeSillCount: featureRecords.filter((record) => record.type === 'ridgeSill').length,
      maxSlope: round(maxSlope),
      slopeP95: round(p95Slope),
      slopeDistribution: slopeDistribution(slopes),
      coastlineComplexity: round(coastlineSummary.coastlineComplexity ?? 0),
      deploymentZoneSeparationPotential: round(deploymentZoneSeparationPotential),
      featureDiversity: round(featureDiversity),
      multiGliderSuitability,
      sourceGridBudget: cellCount <= ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount ? 'PASS' : 'FAIL',
      previewGridBudget: cellCount <= ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount ? 'PASS_DECIMATE_FOR_DISPLAY' : 'FAIL'
    },
    checks: [
      check('finite-depths', finiteDepths, { finiteDepths }),
      check('positive-down-wet-depths', waterDepths.every((value) => value > 0), { minDepthMeters }),
      check('connected-wet-fraction', connectedWetFraction >= 0.55, { connectedWetFraction }),
      check('feature-diversity', featureDiversity >= 0.25, { featureDiversity }),
      check('source-grid-budget', cellCount <= ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount, { cellCount })
    ],
    claimBoundary: {
      synthetic: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  }, 'validationReportDigest');
}

function featureRecordsFromFields(context = {}) {
  const records = [];
  const definitions = [
    ['continentalShelf', 'continentalShelf', 0.42, 'Continental shelf'],
    ['shelfBreak', 'shelfBreak', 0.35, 'Shelf break'],
    ['deepBasin', 'deepBasin', 0.45, 'Deep basin'],
    ['submarineCanyon', 'canyonPotential', 0.22, 'Submarine canyon potential'],
    ['islandSeamount', 'islandSeamount', 0.3, 'Island / seamount'],
    ['riverDelta', 'riverMouthInfluence', 0.18, 'River mouth / delta lobe'],
    ['ridgeSill', 'straitSillInfluence', 0.2, 'Ridge / sill'],
    ['gulfBay', 'gulfBayInfluence', 0.24, 'Gulf / bay'],
    ['openOceanCorridor', 'openOceanCorridor', 0.5, 'Open ocean corridor']
  ];
  for (const [type, fieldName, threshold, label] of definitions) {
    const record = featureRecordForLayer(context, type, fieldName, threshold, label);
    if (record) records.push(record);
  }
  if (!records.length) {
    records.push({
      featureId: 'regional-bathymetry-summary',
      type: 'regionalSummary',
      label: 'Regional bathymetry summary',
      approximateCenterMeters: { eastMeters: round(context.dimensions.widthMeters / 2), northMeters: round(context.dimensions.heightMeters / 2) },
      areaSquareMeters: round(context.dimensions.widthMeters * context.dimensions.heightMeters),
      lengthMeters: null,
      depthRangeMeters: [0, round(context.maxDepthMeters ?? 0)],
      slopeRangeMetersPerCell: [0, 0],
      confidence: 0.25,
      relatedTileIds: [],
      validationNotes: 'Fallback feature record for a low-diversity synthetic window.'
    });
  }
  return records;
}

function featureRecordForLayer(context, type, fieldName, threshold, label) {
  const { sampled, bottomDepthMeters, wetMask, dimensions } = context;
  const rows = sampled.length;
  const columns = sampled[0]?.length ?? 0;
  let weight = 0;
  let sx = 0;
  let sy = 0;
  let minDepth = Infinity;
  let maxDepth = 0;
  let count = 0;
  let maxField = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (wetMask[y]?.[x] !== true) continue;
      const value = Number(sampled[y]?.[x]?.[fieldName] ?? 0);
      maxField = Math.max(maxField, value);
      if (value < threshold) continue;
      const depth = Number(bottomDepthMeters[y]?.[x] ?? 0);
      weight += value;
      sx += x * value;
      sy += y * value;
      minDepth = Math.min(minDepth, depth);
      maxDepth = Math.max(maxDepth, depth);
      count += 1;
    }
  }
  if (!count || maxField < threshold) return null;
  const cx = weight ? sx / weight : columns / 2;
  const cy = weight ? sy / weight : rows / 2;
  const area = count * cellArea(dimensions, rows, columns);
  const length = ['shelfBreak', 'submarineCanyon', 'ridgeSill', 'openOceanCorridor'].includes(type)
    ? Math.sqrt(area)
    : null;
  return {
    featureId: `atlas-window-${type}`,
    type,
    label,
    approximateCenterMeters: {
      eastMeters: round((cx / Math.max(1, columns - 1)) * dimensions.widthMeters),
      northMeters: round((cy / Math.max(1, rows - 1)) * dimensions.heightMeters)
    },
    areaSquareMeters: round(area),
    lengthMeters: length == null ? null : round(length),
    depthRangeMeters: [round(minDepth), round(maxDepth)],
    slopeRangeMetersPerCell: [0, round(maxDepth - minDepth)],
    confidence: round(clamp(maxField)),
    relatedTileIds: ['regional-bathymetry'],
    validationNotes: 'Derived from sampled Synthetic Ocean Atlas fields and generated positive-down bathymetry.'
  };
}

function summarizeFeatures(records, sampled, bottomDepthMeters, wetMask, dimensions, maxDepthMeters) {
  const families = [...new Set(records.map((record) => record.type))];
  const depths = bottomDepthMeters.flat().map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return {
    type: 'anchor.window-conditioned-bathymetry.feature-summary',
    builderVersion: WINDOW_CONDITIONED_BATHYMETRY_BUILDER_VERSION,
    featureFamilies: families,
    featureDiversityScore: round(families.length / FEATURE_FAMILIES.length),
    featureRecordCount: records.length,
    shallowShelfFraction: round(depths.length ? depths.filter((value) => value <= maxDepthMeters * 0.28).length / depths.length : 0),
    deepWaterFraction: round(depths.length ? depths.filter((value) => value >= maxDepthMeters * 0.58).length / depths.length : 0),
    canyonLikeGradientCount: records.filter((record) => record.type === 'submarineCanyon').length,
    deepestBasinDepthMeters: round(depths.length ? Math.max(...depths) : 0),
    regionAreaSquareMeters: round(dimensions.widthMeters * dimensions.heightMeters),
    source: 'Synthetic Ocean Atlas sampled layers plus structured bathymetry composition',
    hiddenTruthExposed: false
  };
}

function summarizeCoastline(coastline, wetMask, dimensions) {
  const cellLength = Math.min(
    dimensions.widthMeters / Math.max(1, dimensions.columns - 1),
    dimensions.heightMeters / Math.max(1, dimensions.rows - 1)
  );
  const connectedWet = largestWetComponent(wetMask);
  const wetCount = wetMask.flat().filter(Boolean).length;
  const coastlineLengthMeters = coastline.length * cellLength;
  return {
    type: 'anchor.window-conditioned-bathymetry.coastline-summary',
    segmentCount: coastline.length,
    coastlineLengthEstimateMeters: round(coastlineLengthMeters),
    coastlineComplexity: round(coastline.length / Math.max(1, Math.sqrt(dimensions.cellCount))),
    connectedWetFraction: round(wetCount ? connectedWet / wetCount : 0),
    source: 'wet/land mask adjacency',
    hiddenTruthExposed: false
  };
}

function atlasFieldsAt(atlas, recipe, x, y) {
  const means = recipe.atlasFieldStats?.layerMeans ?? {};
  const sample = (name, fallback = 0) => atlas?.layers?.[name]
    ? sampleAtlasLayer(atlas, name, x, y)
    : Number(means[name] ?? fallback);
  return {
    landOceanMask: clamp(sample('landOceanMask', 0)),
    signedDistanceToCoast: clamp(sample('signedDistanceToCoast', 0), -1, 1),
    distanceToCoast: clamp(sample('distanceToCoast', 0.3)),
    continentalShelf: clamp(sample('continentalShelf', 0.3)),
    shelfBreak: clamp(sample('shelfBreak', 0.1)),
    deepBasin: clamp(sample('deepBasin', 0.35)),
    islandSeamount: clamp(sample('islandSeamount', 0.1)),
    canyonPotential: clamp(sample('canyonPotential', 0.1)),
    riverMouthInfluence: clamp(sample('riverMouthInfluence', 0.05)),
    straitSillInfluence: clamp(sample('straitSillInfluence', 0.05)),
    gulfBayInfluence: clamp(sample('gulfBayInfluence', 0.1)),
    openOceanCorridor: clamp(sample('openOceanCorridor', 0.4)),
    missionSuitability: clamp(sample('missionSuitability', 0.45))
  };
}

function smoothDepthGrid(grid, wetMask, passes = 1) {
  let current = grid.map((row) => [...row]);
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.map((row) => [...row]);
    for (let y = 0; y < current.length; y += 1) {
      for (let x = 0; x < (current[0]?.length ?? 0); x += 1) {
        if (wetMask[y]?.[x] !== true) continue;
        let sum = current[y][x] * 2;
        let count = 2;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (wetMask[ny]?.[nx] !== true) continue;
          sum += current[ny][nx];
          count += 1;
        }
        next[y][x] = round(sum / count);
      }
    }
    current = next;
  }
  return current;
}

function slopeLimit(grid, wetMask, maxDelta) {
  const next = grid.map((row) => [...row]);
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[0]?.length ?? 0); x += 1) {
      if (wetMask[y]?.[x] !== true) continue;
      const neighborValues = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (wetMask[ny]?.[nx] === true) neighborValues.push(grid[ny][nx]);
      }
      if (!neighborValues.length) continue;
      const mean = neighborValues.reduce((sum, value) => sum + value, 0) / neighborValues.length;
      next[y][x] = round(clamp(grid[y][x], mean - maxDelta, mean + maxDelta));
    }
  }
  return next;
}

function coastlineSegments(wetMask, dimensions) {
  const segments = [];
  const rows = wetMask.length;
  const columns = wetMask[0]?.length ?? 0;
  const dxMeters = dimensions.widthMeters / Math.max(1, columns - 1);
  const dyMeters = dimensions.heightMeters / Math.max(1, rows - 1);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (wetMask[y]?.[x] !== true) continue;
      for (const [name, ox, oy] of [['west', -1, 0], ['east', 1, 0], ['north', 0, -1], ['south', 0, 1]]) {
        if (wetMask[y + oy]?.[x + ox] === true) continue;
        const x0 = x * dxMeters;
        const y0 = y * dyMeters;
        segments.push({
          id: `coast-${x}-${y}-${name}`,
          source: 'wet-land-adjacency',
          start: { eastMeters: round(x0), northMeters: round(y0) },
          end: { eastMeters: round(x0 + (name === 'north' || name === 'south' ? dxMeters : 0)), northMeters: round(y0 + (name === 'east' || name === 'west' ? dyMeters : 0)) }
        });
      }
    }
  }
  return segments.slice(0, 400);
}

function slopeValues(depths, wetMask) {
  const rows = depths.length;
  const columns = depths[0]?.length ?? 0;
  const values = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (wetMask[y]?.[x] !== true) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (wetMask[ny]?.[nx] === true) values.push(Math.abs(Number(depths[y][x]) - Number(depths[ny][nx])));
      }
    }
  }
  return values;
}

function slopeDistribution(values = []) {
  return {
    p50: round(percentile(values, 0.5)),
    p90: round(percentile(values, 0.9)),
    p95: round(percentile(values, 0.95)),
    max: round(values.length ? Math.max(...values) : 0)
  };
}

function percentile(values = [], q = 0.5) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(q) * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  return lerp(sorted[lo], sorted[hi], index - lo);
}

function wetComponents(wetMask = []) {
  const rows = wetMask.length;
  const columns = wetMask[0]?.length ?? 0;
  const seen = new Set();
  const components = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const key = `${x}:${y}`;
      if (seen.has(key) || wetMask[y]?.[x] !== true) continue;
      let count = 0;
      const stack = [[x, y]];
      seen.add(key);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        count += 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nextKey = `${nx}:${ny}`;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows || seen.has(nextKey) || wetMask[ny]?.[nx] !== true) continue;
          seen.add(nextKey);
          stack.push([nx, ny]);
        }
      }
      components.push(count);
    }
  }
  components.sort((a, b) => b - a);
  return components;
}

function largestWetComponent(wetMask = []) {
  return wetComponents(wetMask)[0] ?? 0;
}

function estimateDeploymentSeparation(wetMask = []) {
  const points = [];
  const rows = wetMask.length;
  const columns = wetMask[0]?.length ?? 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (wetMask[y]?.[x] === true) points.push({ x, y });
    }
  }
  if (points.length < 2) return 0;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const span = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
  return clamp(span / Math.sqrt(columns ** 2 + rows ** 2));
}

function suitabilityFromMetrics(metrics = {}) {
  const gliders = Math.max(1, Math.round(Number(metrics.intendedGliders ?? 1)));
  const score = clamp(
    metrics.connectedWetFraction * 0.38
    + metrics.featureDiversity * 0.26
    + metrics.deploymentZoneSeparationPotential * 0.22
    + metrics.wetFraction * 0.14
    - Math.max(0, gliders - 3) * 0.025
  );
  return {
    score: round(score),
    status: score >= 0.68 ? ENVIRONMENT_STUDIO_STATUS.PASS : score >= 0.42 ? ENVIRONMENT_STUDIO_STATUS.WARN : ENVIRONMENT_STUDIO_STATUS.FAIL,
    intendedGliders: gliders,
    summary: score >= 0.68
      ? 'Generated region has enough connected water, feature diversity, and separation potential for the requested scale.'
      : 'Generated region is usable for inspection but may need regeneration or a different window for the requested scale.'
  };
}

function compactAttempt(candidate = {}) {
  return {
    attemptIndex: candidate.attemptIndex ?? 0,
    seed: candidate.seed,
    status: candidate.validationReport?.status ?? ENVIRONMENT_STUDIO_STATUS.WARN,
    numericScore: candidate.validationReport?.numericScore ?? 0,
    warningCount: candidate.validationReport?.warnings?.length ?? 0,
    failureCount: candidate.validationReport?.errors?.length ?? 0,
    connectedWetFraction: candidate.validationReport?.metrics?.connectedWetFraction ?? 0,
    featureDiversity: candidate.validationReport?.metrics?.featureDiversity ?? 0,
    maxSlope: candidate.validationReport?.metrics?.maxSlope ?? 0,
    validationReportDigest: candidate.validationReport?.validationReportDigest ?? null
  };
}

function dimensionsFromRecipe(recipe = {}, options = {}) {
  const source = recipe.sourceResolution ?? {};
  const domain = recipe.domainSize ?? {};
  const widthMeters = positive(domain.widthMeters ?? options.widthMeters, 80000);
  const heightMeters = positive(domain.heightMeters ?? options.heightMeters, 48000);
  const cellSizeMeters = positive(source.cellSizeMeters ?? options.cellSizeMeters, 1000);
  const columns = positiveInteger(source.columns ?? options.columns, Math.floor(widthMeters / cellSizeMeters) + 1);
  const rows = positiveInteger(source.rows ?? options.rows, Math.floor(heightMeters / cellSizeMeters) + 1);
  return {
    rows,
    columns,
    cellCount: rows * columns,
    widthMeters: round(widthMeters),
    heightMeters: round(heightMeters),
    cellSizeMeters: round(cellSizeMeters)
  };
}

function normalizeRecipe(input = {}) {
  const selectedWindow = input.selectedWindow ?? {};
  return {
    ...input,
    selectedWindow,
    domainSize: {
      widthMeters: positive(input.domainSize?.widthMeters ?? selectedWindow.recommendedDomain?.widthMeters, 80000),
      heightMeters: positive(input.domainSize?.heightMeters ?? selectedWindow.recommendedDomain?.heightMeters, 48000)
    },
    sourceResolution: {
      cellSizeMeters: positive(input.sourceResolution?.cellSizeMeters ?? selectedWindow.recommendedDomain?.sourceResolutionMeters, 1000),
      rows: positiveInteger(input.sourceResolution?.rows ?? selectedWindow.recommendedDomain?.rows, 49),
      columns: positiveInteger(input.sourceResolution?.columns ?? selectedWindow.recommendedDomain?.columns, 81)
    },
    intendedGliders: positiveInteger(input.intendedGliders ?? selectedWindow.recommendedGliders, 1),
    randomSeed: String(input.randomSeed ?? input.seed ?? 'window-bathymetry-r1-1')
  };
}

function normalizeBounds(bounds = {}) {
  const xMin = clamp(bounds.xMin ?? bounds.x ?? 0);
  const yMin = clamp(bounds.yMin ?? bounds.y ?? 0);
  const xMax = clamp(bounds.xMax ?? (Number(bounds.x ?? 0) + Number(bounds.width ?? 0.3)), xMin + 0.01, 1);
  const yMax = clamp(bounds.yMax ?? (Number(bounds.y ?? 0) + Number(bounds.height ?? 0.3)), yMin + 0.01, 1);
  return { xMin, yMin, xMax, yMax };
}

function maxDepthForRecipe(recipe = {}, options = {}) {
  if (Number.isFinite(Number(options.maxDepthMeters))) return Number(options.maxDepthMeters);
  const regime = String(recipe.bathymetryRegime ?? '');
  if (regime.includes('open') || regime.includes('basin')) return 360;
  if (regime.includes('strait')) return 240;
  if (regime.includes('river')) return 180;
  if (regime.includes('island')) return 300;
  return 260;
}

function cellArea(dimensions, rows, columns) {
  return (dimensions.widthMeters / Math.max(1, columns - 1)) * (dimensions.heightMeters / Math.max(1, rows - 1));
}

function emptyGrid(rows, columns, value) {
  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => value));
}

function check(id, passed, details = {}) {
  return { id, passed: passed === true, details };
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positiveInteger(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function stableToken(value = '') {
  return String(value).replace(/^fnv1a32:/, '').slice(0, 10) || 'artifact';
}

function withDigest(value, digestKey) {
  const payload = { ...value };
  delete payload[digestKey];
  return { ...value, [digestKey]: canonicalJsonDigest(canonicalizeJsonValue(payload)) };
}
