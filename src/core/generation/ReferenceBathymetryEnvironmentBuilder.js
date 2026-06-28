import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';
import {
  buildAtlasConditionedCurrentArtifact
} from '../../../packages/currents/src/index.js';
import {
  buildAtlasConditionedScalarArtifact
} from '../../../packages/scalar-processes/src/index.js';
import {
  createEnvironmentArtifact,
  environmentArtifactSummary
} from '../../../packages/environment/src/index.js';

export const REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION = 'reference-bathymetry-environment-builder-field-regen-r1';

export function buildReferenceBathymetryEnvironment(input = {}) {
  const bathymetryArtifact = input.bathymetryArtifact ?? {};
  const bathymetry = normalizeBathymetry(bathymetryArtifact, input.wetLandMask);
  if (!bathymetry.bottomDepthMeters.length || !bathymetry.bottomDepthMeters[0]?.length) {
    throw new Error('Reference bathymetry environment generation requires a non-empty bathymetry artifact.');
  }

  const seed = String(input.seed ?? 'reference-bathymetry-field-regen-r1');
  const referenceFixtureId = String(input.referenceFixtureId ?? input.sourceMetadata?.referenceFixtureId ?? 'reference-fixture-unknown');
  const sourceMetadata = normalizeSourceMetadata(input.sourceMetadata, { referenceFixtureId });
  const fieldPolicy = normalizeFieldPolicy(input.fieldPolicy, sourceMetadata);
  const derivedContext = deriveReferenceContext({
    bathymetry,
    coastlineSummary: input.coastlineSummary,
    slopeStats: input.slopeStats,
    shelfFraction: input.shelfFraction,
    basinFraction: input.basinFraction,
    sourceMetadata,
    seed
  });
  const flowGenerationInputs = {
    ...(input.flowGenerationInputs ?? {}),
    referenceFixtureId,
    sourcePhase: 'FIELD-REGEN-R1-reference-bathymetry-generated',
    fieldPolicy,
    coastlineSummary: input.coastlineSummary ?? derivedContext.coastlineSummary,
    slopeStats: input.slopeStats ?? derivedContext.slopeStats,
    shelfFraction: finiteOrNull(input.shelfFraction) ?? derivedContext.shelfFraction,
    basinFraction: finiteOrNull(input.basinFraction) ?? derivedContext.basinFraction,
    openBoundarySides: uniqueStrings(input.openBoundarySides ?? input.flowGenerationInputs?.openBoundarySides ?? derivedContext.openBoundarySides),
    currentRegimeHints: uniqueStrings(input.currentRegimeHints ?? input.flowGenerationInputs?.currentRegimeHints ?? derivedContext.currentRegimeHints),
    scalarRegimeHints: uniqueStrings(input.scalarRegimeHints ?? input.flowGenerationInputs?.scalarRegimeHints ?? derivedContext.scalarRegimeHints),
    bathymetryArtifactDigest: bathymetry.digest,
    wetLandMaskIdentity: {
      ...(input.flowGenerationInputs?.wetLandMaskIdentity ?? {}),
      source: input.flowGenerationInputs?.wetLandMaskIdentity?.source ?? 'reference-bathymetry-window',
      wetMaskDigest: input.flowGenerationInputs?.wetLandMaskIdentity?.wetMaskDigest ?? canonicalJsonDigest(canonicalizeJsonValue(bathymetry.wetMask)),
      landMaskDigest: input.flowGenerationInputs?.wetLandMaskIdentity?.landMaskDigest ?? canonicalJsonDigest(canonicalizeJsonValue(bathymetry.landMask)),
      hiddenTruthExposed: false
    },
    sourceDataset: input.flowGenerationInputs?.sourceDataset ?? sourceMetadata.sourceDataset ?? null,
    claimBoundary: {
      ...(input.flowGenerationInputs?.claimBoundary ?? {}),
      referenceBathymetryPatch: true,
      currentField4DGenerated: true,
      scalarField4DGenerated: true,
      hotspotsGenerated: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  };

  const featureRecords = [
    ...normalizeFeatureRecords(input.featureRecords),
    ...derivedContext.featureRecords
  ];
  const sharedFieldOptions = {
    regionalMissionRecipe: input.regionalMissionRecipe,
    flowGenerationInputs,
    bathymetryArtifact,
    wetLandMask: {
      wetMask: bathymetry.wetMask,
      landMask: bathymetry.landMask
    },
    featureRecords,
    depthAxisMeters: normalizeAxis(input.depthAxisMeters ?? flowGenerationInputs.depthAxisMeters, [0, 10, 35, 75, 150]),
    timeAxisSeconds: normalizeAxis(input.timeAxisSeconds ?? flowGenerationInputs.timeAxisSeconds, [0, 900, 1800, 2700, 3600, 5400, 7200]),
    currentRegimeHints: flowGenerationInputs.currentRegimeHints,
    scalarRegimeHints: flowGenerationInputs.scalarRegimeHints,
    openBoundarySides: flowGenerationInputs.openBoundarySides,
    missionDurationSeconds: finiteOrNull(input.missionDurationSeconds ?? flowGenerationInputs.missionDurationSeconds),
    seed,
    referenceFixtureId,
    fieldPolicy
  };

  const currentResult = buildAtlasConditionedCurrentArtifact({
    ...sharedFieldOptions,
    id: input.currentArtifactId ?? `reference-bathymetry-current-${stableToken(referenceFixtureId, seed, bathymetry.digest)}`,
    label: 'Reference bathymetry + synthetic bathymetry-conditioned current field',
    sourceLabel: 'Reference bathymetry + synthetic bathymetry-conditioned current field',
    sourceType: 'reference-bathymetry-conditioned-synthetic-current',
    equationFamily: 'referenceBathymetryConditionedReducedOrderStreamfunctionSyntheticV1',
    generatorBackend: 'referenceBathymetryEnvironmentBuilder',
    sourceMetadata: {
      referenceFixtureId,
      sourceDataset: sourceMetadata.sourceDataset,
      sourcePhase: 'FIELD-REGEN-R1',
      fieldPolicy,
      referenceBathymetryPatch: true,
      bathymetryConditionedSynthetic: true
    },
    references: [
      'FIELD-REGEN-R1 reference bathymetry + synthetic bathymetry-conditioned fields',
      'packages/currents bathymetry-conditioned 4D current backend'
    ],
    warnings: [
      'Reference bathymetry + synthetic bathymetry-conditioned fields. Currents are deterministic synthetic benchmark fields, not calibrated forecast currents.'
    ]
  });

  const scalarResult = buildAtlasConditionedScalarArtifact({
    ...sharedFieldOptions,
    currentArtifact: currentResult.currentArtifact,
    currentArtifactDigest: currentResult.currentArtifactDigest,
    id: input.scalarArtifactId ?? `reference-bathymetry-scalar-${stableToken(referenceFixtureId, seed, bathymetry.digest)}`,
    label: 'Reference bathymetry + synthetic bathymetry-conditioned scalar science field',
    sourceLabel: 'Reference bathymetry + synthetic bathymetry-conditioned scalar science field',
    sourceType: 'reference-bathymetry-conditioned-synthetic-scalar',
    processKind: 'referenceBathymetryConditionedScalarSyntheticV1',
    equationFamily: 'referenceBathymetryConditionedScalarSyntheticV1',
    generatorBackend: 'referenceBathymetryEnvironmentBuilder',
    sourceMetadata: {
      referenceFixtureId,
      sourceDataset: sourceMetadata.sourceDataset,
      sourcePhase: 'FIELD-REGEN-R1',
      fieldPolicy,
      referenceBathymetryPatch: true,
      bathymetryConditionedSynthetic: true
    },
    warnings: [
      'Reference bathymetry + synthetic bathymetry-conditioned fields. Scalars and hotspots are deterministic synthetic benchmark fields, not calibrated ecological or ocean forecast products.'
    ]
  });

  const startDropZoneCandidates = createStartDropZoneCandidates({
    bathymetry,
    bathymetryArtifact,
    scalarResult,
    intendedGliders: input.intendedGliders,
    seed
  });
  const hazardCandidates = createHazardCandidates({
    bathymetry,
    bathymetryArtifact,
    currentArtifact: currentResult.currentArtifact,
    currentDiagnostics: currentResult.currentDiagnostics,
    seed
  });
  const environmentComposition = composeEnvironmentArtifact({
    bathymetryArtifact,
    currentArtifact: currentResult.currentArtifact,
    scalarArtifact: scalarResult.scalarArtifact,
    fieldPolicy,
    sourceMetadata,
    referenceFixtureId,
    seed
  });
  const validationReport = validateGeneratedReferenceEnvironment({
    currentResult,
    scalarResult,
    startDropZoneCandidates,
    hazardCandidates,
    environmentComposition
  });
  const dependencyGraph = createReferenceDependencyGraph({
    bathymetryDigest: bathymetry.digest,
    currentResult,
    scalarResult,
    startDropZoneCandidates,
    hazardCandidates,
    environmentComposition,
    validationReport
  });
  const provenance = {
    generatedBy: 'src/core/generation/ReferenceBathymetryEnvironmentBuilder.js',
    generatorVersion: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    deterministicSeed: seed,
    referenceFixtureId,
    sourceMetadata,
    fieldPolicy,
    localAbsolutePathsIncluded: false,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
  const digest = canonicalJsonDigest(canonicalizeJsonValue({
    version: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    referenceFixtureId,
    seed,
    bathymetryArtifactDigest: bathymetry.digest,
    currentArtifactDigest: currentResult.currentArtifactDigest,
    scalarArtifactDigest: scalarResult.scalarArtifactDigest,
    hotspotArtifactDigest: scalarResult.hotspotArtifactDigest,
    startDropZoneCandidateDigest: startDropZoneCandidates.candidateDigest,
    hazardCandidateDigest: hazardCandidates.hazardDigest,
    environmentArtifactDigest: environmentComposition.environmentArtifactDigest,
    environmentArtifactStatus: environmentComposition.status,
    validationStatus: validationReport.status
  }));

  return {
    type: 'anchor.reference-bathymetry.environment-builder-result',
    version: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    status: validationReport.status === 'FAIL' ? 'FAIL' : 'CURRENT',
    referenceFixtureId,
    bathymetryArtifact,
    currentArtifact: currentResult.currentArtifact,
    scalarArtifact: scalarResult.scalarArtifact,
    hotspotArtifact: scalarResult.hotspotArtifact,
    startDropZoneCandidates,
    hazardCandidates,
    environmentArtifact: environmentComposition.environmentArtifact,
    environmentArtifactSummary: environmentComposition.summary,
    environmentArtifactDigest: environmentComposition.environmentArtifactDigest,
    environmentArtifactStatus: environmentComposition.status,
    environmentArtifactReason: environmentComposition.reason,
    currentResult,
    scalarResult,
    validationReport,
    dependencyGraph,
    provenance,
    fieldPolicy,
    digest,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

function normalizeBathymetry(artifact = {}, wetLandMask = {}) {
  const bottomDepthMeters = normalizeGrid(artifact.bottomDepthMeters ?? artifact.depthMeters);
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  const wetMask = normalizeMask(wetLandMask.wetMask ?? artifact.wetMask, bottomDepthMeters, true);
  const landMask = normalizeMask(wetLandMask.landMask ?? artifact.landMask, bottomDepthMeters, false);
  const eastAxisMeters = normalizeNumericAxis(artifact.eastAxisMeters, width, artifact.physicalExtentMeters?.east ?? artifact.operationalDomain?.horizontal?.widthMeters);
  const northAxisMeters = normalizeNumericAxis(artifact.northAxisMeters, height, artifact.physicalExtentMeters?.north ?? artifact.operationalDomain?.horizontal?.heightMeters);
  return {
    bottomDepthMeters,
    wetMask,
    landMask,
    width,
    height,
    eastAxisMeters,
    northAxisMeters,
    digest: artifact.artifactDigest ?? artifact.digest ?? canonicalJsonDigest(canonicalizeJsonValue({ bottomDepthMeters, wetMask, landMask }))
  };
}

function deriveReferenceContext(options = {}) {
  const bathymetry = options.bathymetry;
  const slopeRecords = slopeCells(bathymetry).sort((a, b) => b.slope - a.slope);
  const deepest = wetCells(bathymetry).sort((a, b) => b.depth - a.depth)[0] ?? cellAt(bathymetry, 0.5, 0.5);
  const maxSlope = slopeRecords[0] ?? deepest;
  const shallow = wetCells(bathymetry).filter((cell) => cell.depth <= 250).sort((a, b) => a.depth - b.depth)[0] ?? cellAt(bathymetry, 0.2, 0.2);
  const shelfFraction = finiteOrNull(options.shelfFraction) ?? shallowFraction(bathymetry, 250);
  const basinFraction = finiteOrNull(options.basinFraction) ?? deepFraction(bathymetry, 1500);
  const featureRecords = [
    featureRecord('reference-shelf-break', 'shelfBreak', 'Reference shelf/slope break', maxSlope, bathymetry, 0.85),
    featureRecord('reference-submarine-canyon', 'submarineCanyon', 'Reference canyon or steep-slope corridor', maxSlope, bathymetry, 0.72),
    featureRecord('reference-deep-basin', 'deepBasin', 'Reference deep basin center', deepest, bathymetry, 0.75),
    featureRecord('reference-nearshore-zone', 'riverMouth', 'Reference nearshore input zone', shallow, bathymetry, 0.45)
  ].filter(Boolean);
  const openBoundarySides = openBoundarySidesForMask(bathymetry);
  return {
    coastlineSummary: options.coastlineSummary ?? { segmentCount: coastlineSegmentEstimate(bathymetry), source: 'wet-land-mask-derived' },
    slopeStats: options.slopeStats ?? summarizeNumbers(slopeRecords.map((entry) => entry.slope)),
    shelfFraction,
    basinFraction,
    openBoundarySides,
    currentRegimeHints: uniqueStrings([
      'coastParallelShelfCurrent',
      basinFraction > 0.05 ? 'basinRecirculation' : null,
      openBoundarySides.length >= 2 ? 'broadBackgroundCurrent' : null,
      maxSlope?.slope > 0 ? 'mouthInflowOutflow' : null,
      'mesoscaleEddy'
    ]),
    scalarRegimeHints: uniqueStrings([
      shelfFraction > 0.05 ? 'shelfNutrientPatch' : null,
      'thermoclineHotspot',
      maxSlope?.slope > 0 ? 'mixingFront' : null,
      basinFraction > 0.05 ? 'bloomPatch' : null
    ]),
    featureRecords
  };
}

function createStartDropZoneCandidates(options = {}) {
  const { bathymetry, scalarResult } = options;
  const hotspots = scalarResult.hotspotArtifact?.hotspots ?? [];
  const anchors = hotspots.length
    ? hotspots.slice(0, 6).map((hotspot) => ({
        xNorm: indexNorm(hotspot.xIndex, bathymetry.width),
        yNorm: indexNorm(hotspot.yIndex, bathymetry.height),
        hotspotId: hotspot.hotspotId
      }))
    : [
        { xNorm: 0.15, yNorm: 0.2 },
        { xNorm: 0.85, yNorm: 0.22 },
        { xNorm: 0.2, yNorm: 0.82 },
        { xNorm: 0.82, yNorm: 0.78 }
      ];
  const candidates = [];
  for (const anchor of anchors) {
    const cell = nearestWetCell(bathymetry, anchor.xNorm, anchor.yNorm, candidates);
    if (!cell) continue;
    candidates.push({
      candidateId: `reference-start-drop-candidate-${candidates.length + 1}`,
      xIndex: cell.x,
      yIndex: cell.y,
      eastMeters: round(bathymetry.eastAxisMeters[cell.x] ?? cell.x),
      northMeters: round(bathymetry.northAxisMeters[cell.y] ?? cell.y),
      bottomDepthMeters: round(cell.depth),
      nearestHotspotId: anchor.hotspotId ?? null,
      intendedGliders: positiveInteger(options.intendedGliders, 1),
      validationStatus: 'NEEDS_VALIDATION',
      source: 'reference-bathymetry-environment-builder',
      note: 'Candidate only; launch/drop-zone validation is deferred to mission setup.'
    });
  }
  const diagnostics = {
    candidateCount: candidates.length,
    finiteDepthCandidateCount: candidates.filter((entry) => Number.isFinite(Number(entry.bottomDepthMeters))).length,
    status: candidates.length ? 'NEEDS_VALIDATION' : 'REQUIRES_REGENERATION'
  };
  const base = {
    type: 'anchor.environment-studio.start-drop-zone-candidates',
    version: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    status: 'NEEDS_VALIDATION',
    candidates,
    diagnostics,
    publicSafe: true,
    hiddenTruthExposed: false
  };
  return { ...base, candidateDigest: canonicalJsonDigest(canonicalizeJsonValue(base)) };
}

function createHazardCandidates(options = {}) {
  const { bathymetry, currentArtifact } = options;
  const candidates = [];
  addTopHazards(candidates, hazardScores(bathymetry, 'shallow-near-land-risk'), 'shallow-near-land-risk', bathymetry, 4);
  addTopHazards(candidates, hazardScores(bathymetry, 'steep-slope-risk'), 'steep-slope-risk', bathymetry, 4);
  addTopHazards(candidates, highCurrentScores(bathymetry, currentArtifact), 'high-current-risk', bathymetry, 4);
  addTopHazards(candidates, hazardScores(bathymetry, 'below-bottom-route-risk'), 'below-bottom-route-risk', bathymetry, 3);
  addTopHazards(candidates, lowConnectivityScores(bathymetry), 'low-connectivity-wet-pocket-risk', bathymetry, 3);
  const deduped = dedupeCandidates(candidates, bathymetry).slice(0, 16);
  const diagnostics = {
    candidateCount: deduped.length,
    countByKind: deduped.reduce((counts, entry) => {
      counts[entry.hazardKind] = (counts[entry.hazardKind] ?? 0) + 1;
      return counts;
    }, {}),
    currentSpeedMaximumMetersPerSecond: round(options.currentDiagnostics?.speedMaximum),
    status: deduped.length ? 'CURRENT' : 'REQUIRES_REGENERATION'
  };
  const base = {
    type: 'anchor.environment-studio.synthetic-hazard-candidates',
    version: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    status: deduped.length ? 'CURRENT' : 'REQUIRES_REGENERATION',
    candidates: deduped,
    diagnostics,
    publicSafe: true,
    hiddenTruthExposed: false,
    note: 'Hazard candidates are mission-design diagnostics only; official scoring is unchanged.'
  };
  return { ...base, hazardDigest: canonicalJsonDigest(canonicalizeJsonValue(base)) };
}

function composeEnvironmentArtifact(options = {}) {
  try {
    const environmentArtifact = createEnvironmentArtifact({
      id: `reference-bathymetry-environment-${stableToken(options.referenceFixtureId, options.seed)}`,
      seed: options.seed,
      generatorId: 'referenceBathymetryEnvironmentBuilder',
      generatorVersion: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
      coordinateFrame: 'localEastNorthDown',
      bathymetry: options.bathymetryArtifact,
      currentFields: [options.currentArtifact],
      scalarFields: [options.scalarArtifact],
      fieldRoles: {
        bathymetry: { epistemicRole: 'publicReference', publicVisibility: 'publicScenario' },
        currentFields: {
          [options.currentArtifact.id]: { epistemicRole: 'truth', publicVisibility: 'publicScenario', containsHiddenTruth: false }
        },
        scalarFields: {
          [options.scalarArtifact.id]: { epistemicRole: 'truth', publicVisibility: 'publicScenario', containsHiddenTruth: false }
        }
      },
      sourceMetadata: {
        sourceTier: 'referenceBathymetryPlusSyntheticFields',
        sourceType: 'reference-bathymetry-conditioned-synthetic-environment',
        referenceFixtureId: options.referenceFixtureId,
        sourceDataset: options.sourceMetadata.sourceDataset ?? null,
        fieldPolicy: options.fieldPolicy,
        synthetic: true,
        calibratedOceanProduct: false,
        operationalForecast: false,
        certifiedForNavigation: false
      },
      provenance: {
        generatedBy: 'src/core/generation/ReferenceBathymetryEnvironmentBuilder.js',
        generatorVersion: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
        seed: options.seed,
        referenceFixtureId: options.referenceFixtureId,
        notes: ['Reference bathymetry + synthetic bathymetry-conditioned fields.']
      },
      claimBoundary: {
        synthetic: true,
        referenceBathymetryPatch: true,
        scientificallyConstrainedSynthetic: true,
        calibratedOceanProduct: false,
        operationalForecast: false,
        certifiedForNavigation: false,
        hiddenTruthExposed: false,
        simulationChanged: false,
        scoringChanged: false
      }
    });
    const summary = compactEnvironmentSummary(environmentArtifactSummary(environmentArtifact));
    const status = summary.validationSummary?.status === 'FAIL' ? 'REQUIRES_COMPOSITION' : 'CURRENT';
    return {
      status,
      reason: status === 'CURRENT' ? null : 'Environment package validation returned FAIL; compact component artifacts remain generated.',
      environmentArtifact,
      summary,
      environmentArtifactDigest: environmentArtifact.artifactDigest ?? null,
      validation: environmentArtifact.validationReport ?? null
    };
  } catch (error) {
    const fallback = {
      status: 'REQUIRES_COMPOSITION',
      reason: error?.message ?? String(error),
      componentDigests: {
        bathymetryArtifactDigest: options.bathymetryArtifact?.artifactDigest ?? null,
        currentArtifactDigest: options.currentArtifact?.digest ?? null,
        scalarArtifactDigest: options.scalarArtifact?.digest ?? null
      },
      hiddenTruthExposed: false
    };
    return {
      ...fallback,
      environmentArtifact: null,
      summary: fallback,
      environmentArtifactDigest: canonicalJsonDigest(canonicalizeJsonValue(fallback)),
      validation: { valid: false, status: 'WARN', errors: [], warnings: [fallback.reason] }
    };
  }
}

function validateGeneratedReferenceEnvironment(options = {}) {
  const errors = [];
  const warnings = [];
  const current = options.currentResult?.currentDiagnostics ?? {};
  const scalar = options.scalarResult?.scalarDiagnostics ?? {};
  if (!options.currentResult?.currentArtifactDigest) errors.push('Current artifact digest is missing.');
  if (!options.scalarResult?.scalarArtifactDigest) errors.push('Scalar artifact digest is missing.');
  if (!options.scalarResult?.hotspotArtifactDigest) errors.push('Hotspot artifact digest is missing.');
  if (current.landVectorCount !== 0) errors.push('Current artifact has nonzero land vectors.');
  if (current.belowBottomVectorCount !== 0) errors.push('Current artifact has nonzero below-bottom vectors.');
  if (!Number.isFinite(Number(current.speedMaximum))) errors.push('Current artifact speed diagnostics are not finite.');
  if (!Number.isFinite(Number(scalar.scalarStatistics?.mean ?? scalar.scalarMean))) errors.push('Scalar artifact diagnostics are not finite.');
  if (!options.startDropZoneCandidates?.candidates?.length) warnings.push('No start/drop-zone candidates were generated.');
  if (!options.hazardCandidates?.candidates?.length) warnings.push('No hazard candidates were generated.');
  if (options.environmentComposition?.status !== 'CURRENT') warnings.push(`EnvironmentArtifact composition status: ${options.environmentComposition?.status ?? 'UNKNOWN'}.`);
  const checks = [
    check('current-artifact-generated', Boolean(options.currentResult?.currentArtifactDigest)),
    check('scalar-artifact-generated', Boolean(options.scalarResult?.scalarArtifactDigest)),
    check('hotspot-artifact-generated', Boolean(options.scalarResult?.hotspotArtifactDigest)),
    check('current-land-vectors-zero', current.landVectorCount === 0),
    check('current-below-bottom-vectors-zero', current.belowBottomVectorCount === 0),
    check('current-depth-varying', Number(current.surfaceToDeepVectorDifferenceRms) > 0),
    check('current-time-varying', Number(current.temporalChangeRms) > 0),
    check('hazards-generated-or-honest', Boolean(options.hazardCandidates?.status)),
    check('environment-artifact-current-or-deferred', ['CURRENT', 'REQUIRES_COMPOSITION'].includes(options.environmentComposition?.status)),
    check('no-hidden-truth', true)
  ];
  const base = {
    type: 'anchor.reference-bathymetry.environment-validation-report',
    version: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings,
    checks,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
  return { ...base, validationReportDigest: canonicalJsonDigest(canonicalizeJsonValue(base)) };
}

function compactEnvironmentSummary(value) {
  if (Array.isArray(value)) return value.map(compactEnvironmentSummary);
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    const safeKey = key === 'hiddenTruthFieldCount' ? 'hiddenFieldCount' : key;
    output[safeKey] = compactEnvironmentSummary(entry);
  }
  return output;
}

function createReferenceDependencyGraph(options = {}) {
  const envState = options.environmentComposition?.status ?? 'REQUIRES_COMPOSITION';
  return {
    type: 'anchor.reference-bathymetry.environment-dependency-graph',
    version: REFERENCE_BATHYMETRY_ENVIRONMENT_BUILDER_VERSION,
    nodes: {
      bathymetryArtifact: node('CURRENT', options.bathymetryDigest),
      wetLandMask: node('CURRENT', options.bathymetryDigest),
      coastline: node('CURRENT', options.bathymetryDigest),
      currentArtifact: node('CURRENT', options.currentResult?.currentArtifactDigest),
      scalarArtifact: node('CURRENT', options.scalarResult?.scalarArtifactDigest),
      hotspots: node('CURRENT', options.scalarResult?.hotspotArtifactDigest),
      startsDropZones: node('NEEDS_VALIDATION', options.startDropZoneCandidates?.candidateDigest, 'Candidate starts/drop zones require mission-level validation.'),
      hazards: node(options.hazardCandidates?.status ?? 'REQUIRES_REGENERATION', options.hazardCandidates?.hazardDigest),
      benchmarkBundle: node('REQUIRES_REGENERATION', null, 'Benchmark bundle must be regenerated after field artifacts change.'),
      environmentArtifact: node(envState, options.environmentComposition?.environmentArtifactDigest ?? null, options.environmentComposition?.reason ?? null),
      validationReport: node('CURRENT', options.validationReport?.validationReportDigest ?? null)
    }
  };
}

function node(state, artifactDigest = null, reason = null) {
  return { state, artifactDigest, reason };
}

function normalizeSourceMetadata(input = {}, context = {}) {
  return {
    ...input,
    referenceFixtureId: context.referenceFixtureId,
    sourceDataset: input?.sourceDataset ?? input?.referenceDataset ?? null,
    fixtureStatus: input?.fixtureStatus ?? input?.sourceDataset?.fixtureStatus ?? null,
    localAbsolutePathsIncluded: false,
    hiddenTruthExposed: false
  };
}

function normalizeFieldPolicy(input = {}, sourceMetadata = {}) {
  return {
    label: 'Reference bathymetry + synthetic bathymetry-conditioned fields.',
    bathymetryArtifact: 'REFERENCE_PATCH',
    currentArtifact: 'GENERATE_SYNTHETIC',
    scalarArtifact: 'GENERATE_SYNTHETIC',
    hotspots: 'GENERATE_SYNTHETIC',
    startsDropZones: 'GENERATE_CANDIDATES_NEEDS_VALIDATION',
    hazards: 'GENERATE_CANDIDATES',
    environmentArtifact: 'COMPOSE_IF_PACKAGE_VALID',
    benchmarkBundle: 'REQUIRES_REGENERATION',
    deterministic: true,
    calibratedOceanForecast: false,
    operationalForecast: false,
    certifiedForNavigation: false,
    sourceDatasetName: sourceMetadata.sourceDataset?.name ?? null,
    ...(input ?? {})
  };
}

function hazardScores(bathymetry, kind) {
  const slopes = slopeCells(bathymetry);
  return slopes.map((cell) => {
    const nearLand = adjacentLandCount(bathymetry, cell.x, cell.y);
    const shallowScore = Math.max(0, 1 - cell.depth / 120);
    const slopeScore = cell.slope;
    const score = kind === 'steep-slope-risk'
      ? slopeScore
      : kind === 'below-bottom-route-risk'
        ? slopeScore * Math.max(0, 1 - cell.depth / 400)
        : shallowScore + nearLand * 0.25;
    return { ...cell, score };
  }).filter((cell) => cell.score > 0).sort((a, b) => b.score - a.score);
}

function highCurrentScores(bathymetry, currentArtifact = {}) {
  const speeds = [];
  for (let y = 0; y < bathymetry.height; y += 1) {
    for (let x = 0; x < bathymetry.width; x += 1) {
      if (bathymetry.wetMask[y]?.[x] !== true) continue;
      const u = Number(currentArtifact.uEastMetersPerSecond?.[0]?.[0]?.[y]?.[x] ?? 0);
      const v = Number(currentArtifact.vNorthMetersPerSecond?.[0]?.[0]?.[y]?.[x] ?? 0);
      const speed = Math.hypot(u, v);
      if (Number.isFinite(speed) && speed > 0) speeds.push({ ...cell(bathymetry, x, y), score: speed, currentSpeedMetersPerSecond: round(speed) });
    }
  }
  return speeds.sort((a, b) => b.score - a.score);
}

function lowConnectivityScores(bathymetry) {
  const components = wetComponents(bathymetry);
  const largest = Math.max(0, ...components.map((entry) => entry.length));
  return components
    .filter((entry) => entry.length > 0 && entry.length < largest * 0.25)
    .flatMap((entry) => entry.slice(0, 2).map((point) => ({ ...cell(bathymetry, point.x, point.y), score: 1 - entry.length / Math.max(1, largest) })))
    .sort((a, b) => b.score - a.score);
}

function addTopHazards(target, scores, kind, bathymetry, limit) {
  for (const candidate of scores) {
    if (target.filter((entry) => entry.hazardKind === kind).length >= limit) break;
    if (target.some((entry) => Math.hypot(entry.xIndex - candidate.x, entry.yIndex - candidate.y) < Math.max(3, Math.min(bathymetry.width, bathymetry.height) * 0.05))) continue;
    target.push({
      hazardId: `reference-${kind}-${target.length + 1}`,
      hazardKind: kind,
      xIndex: candidate.x,
      yIndex: candidate.y,
      eastMeters: round(bathymetry.eastAxisMeters[candidate.x] ?? candidate.x),
      northMeters: round(bathymetry.northAxisMeters[candidate.y] ?? candidate.y),
      bottomDepthMeters: round(candidate.depth),
      severity: round(clamp(candidate.score, 0, 1, candidate.score)),
      currentSpeedMetersPerSecond: candidate.currentSpeedMetersPerSecond ?? null,
      validationStatus: 'CURRENT',
      source: 'reference-bathymetry-environment-builder'
    });
  }
}

function dedupeCandidates(candidates, bathymetry) {
  const output = [];
  for (const candidate of candidates) {
    const duplicate = output.some((entry) => entry.hazardKind === candidate.hazardKind && Math.hypot(entry.xIndex - candidate.xIndex, entry.yIndex - candidate.yIndex) < 2);
    if (!duplicate) output.push(candidate);
  }
  return output.map((entry, index) => ({ ...entry, hazardId: `${entry.hazardKind}-${index + 1}` }));
}

function slopeCells(bathymetry) {
  const cells = [];
  for (let y = 0; y < bathymetry.height; y += 1) {
    for (let x = 0; x < bathymetry.width; x += 1) {
      if (bathymetry.wetMask[y]?.[x] !== true) continue;
      const west = depthAt(bathymetry, x - 1, y);
      const east = depthAt(bathymetry, x + 1, y);
      const north = depthAt(bathymetry, x, y - 1);
      const south = depthAt(bathymetry, x, y + 1);
      const dx = Math.max(1, Math.abs((bathymetry.eastAxisMeters[Math.min(bathymetry.width - 1, x + 1)] ?? x + 1) - (bathymetry.eastAxisMeters[Math.max(0, x - 1)] ?? x - 1)));
      const dy = Math.max(1, Math.abs((bathymetry.northAxisMeters[Math.min(bathymetry.height - 1, y + 1)] ?? y + 1) - (bathymetry.northAxisMeters[Math.max(0, y - 1)] ?? y - 1)));
      const slope = Math.hypot((east - west) / dx, (south - north) / dy);
      cells.push({ ...cell(bathymetry, x, y), slope });
    }
  }
  return cells;
}

function wetCells(bathymetry) {
  const cells = [];
  for (let y = 0; y < bathymetry.height; y += 1) {
    for (let x = 0; x < bathymetry.width; x += 1) {
      if (bathymetry.wetMask[y]?.[x] === true) cells.push(cell(bathymetry, x, y));
    }
  }
  return cells;
}

function cell(bathymetry, x, y) {
  return {
    x,
    y,
    depth: Number(bathymetry.bottomDepthMeters[y]?.[x] ?? 0),
    eastMeters: Number(bathymetry.eastAxisMeters[x] ?? x),
    northMeters: Number(bathymetry.northAxisMeters[y] ?? y)
  };
}

function cellAt(bathymetry, xNorm, yNorm) {
  return nearestWetCell(bathymetry, xNorm, yNorm) ?? cell(bathymetry, Math.floor(bathymetry.width / 2), Math.floor(bathymetry.height / 2));
}

function nearestWetCell(bathymetry, xNorm = 0.5, yNorm = 0.5, existing = []) {
  const targetX = xNorm * Math.max(0, bathymetry.width - 1);
  const targetY = yNorm * Math.max(0, bathymetry.height - 1);
  let best = null;
  let bestScore = Infinity;
  for (let y = 0; y < bathymetry.height; y += 1) {
    for (let x = 0; x < bathymetry.width; x += 1) {
      if (bathymetry.wetMask[y]?.[x] !== true) continue;
      const depth = Number(bathymetry.bottomDepthMeters[y]?.[x] ?? 0);
      if (depth <= 20) continue;
      const separationPenalty = existing.some((entry) => Math.hypot(entry.xIndex - x, entry.yIndex - y) < Math.max(4, Math.min(bathymetry.width, bathymetry.height) * 0.08)) ? 50 : 0;
      const shorePenalty = adjacentLandCount(bathymetry, x, y) * 5;
      const score = Math.hypot(x - targetX, y - targetY) + separationPenalty + shorePenalty;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y, depth };
      }
    }
  }
  return best;
}

function wetComponents(bathymetry) {
  const visited = new Set();
  const components = [];
  for (let y = 0; y < bathymetry.height; y += 1) {
    for (let x = 0; x < bathymetry.width; x += 1) {
      const key = `${x}:${y}`;
      if (visited.has(key) || bathymetry.wetMask[y]?.[x] !== true) continue;
      const queue = [{ x, y }];
      const component = [];
      visited.add(key);
      while (queue.length) {
        const point = queue.shift();
        component.push(point);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = point.x + dx;
          const ny = point.y + dy;
          const nextKey = `${nx}:${ny}`;
          if (nx < 0 || ny < 0 || nx >= bathymetry.width || ny >= bathymetry.height || visited.has(nextKey) || bathymetry.wetMask[ny]?.[nx] !== true) continue;
          visited.add(nextKey);
          queue.push({ x: nx, y: ny });
        }
      }
      components.push(component);
    }
  }
  return components;
}

function openBoundarySidesForMask(bathymetry) {
  const northWet = fraction(Array.from({ length: bathymetry.width }, (_entry, x) => bathymetry.wetMask[0]?.[x] === true));
  const southWet = fraction(Array.from({ length: bathymetry.width }, (_entry, x) => bathymetry.wetMask[bathymetry.height - 1]?.[x] === true));
  const westWet = fraction(Array.from({ length: bathymetry.height }, (_entry, y) => bathymetry.wetMask[y]?.[0] === true));
  const eastWet = fraction(Array.from({ length: bathymetry.height }, (_entry, y) => bathymetry.wetMask[y]?.[bathymetry.width - 1] === true));
  return [
    westWet > 0.15 ? 'west' : null,
    eastWet > 0.15 ? 'east' : null,
    northWet > 0.15 ? 'north' : null,
    southWet > 0.15 ? 'south' : null
  ].filter(Boolean);
}

function featureRecord(id, type, label, point, bathymetry, confidence) {
  if (!point) return null;
  return {
    featureId: id,
    id,
    type,
    label,
    approximateCenterMeters: {
      eastMeters: round(point.eastMeters ?? bathymetry.eastAxisMeters[point.x] ?? point.x),
      northMeters: round(point.northMeters ?? bathymetry.northAxisMeters[point.y] ?? point.y)
    },
    confidence: round(confidence),
    source: 'reference-bathymetry-environment-builder'
  };
}

function normalizeFeatureRecords(records = []) {
  return Array.isArray(records) ? records.filter((entry) => entry && typeof entry === 'object') : [];
}

function normalizeGrid(value = []) {
  return Array.isArray(value)
    ? value.map((row) => Array.isArray(row) ? row.map((entry) => finite(entry, 0)) : [])
    : [];
}

function normalizeMask(value, bottomDepthMeters, wetFallback) {
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
    if (value?.[y]?.[x] != null) return Boolean(value[y][x]);
    const depth = Number(bottomDepthMeters[y]?.[x] ?? 0);
    return wetFallback ? depth > 0 : depth <= 0;
  }));
}

function normalizeNumericAxis(value, count, spanMeters) {
  if (Array.isArray(value) && value.length === count) return value.map((entry) => finite(entry, 0));
  const span = Math.max(1, finite(spanMeters, Math.max(1, count - 1)));
  const step = count > 1 ? span / (count - 1) : 0;
  return Array.from({ length: count }, (_entry, index) => round(index * step));
}

function normalizeAxis(value, fallback = []) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return uniqueNumbers(source).sort((a, b) => a - b);
}

function uniqueNumbers(value = []) {
  return [...new Set((value ?? []).map(Number).filter(Number.isFinite).map((entry) => round(entry)))];
}

function uniqueStrings(value = []) {
  return [...new Set((Array.isArray(value) ? value : [value]).filter((entry) => entry != null && entry !== '').map(String))];
}

function summarizeNumbers(values = []) {
  const finiteValues = values.map(Number).filter(Number.isFinite);
  if (!finiteValues.length) return { min: 0, mean: 0, max: 0, finite: false };
  return {
    min: round(Math.min(...finiteValues)),
    mean: round(finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length),
    max: round(Math.max(...finiteValues)),
    finite: true
  };
}

function depthAt(bathymetry, x, y) {
  const cx = Math.max(0, Math.min(bathymetry.width - 1, x));
  const cy = Math.max(0, Math.min(bathymetry.height - 1, y));
  return Number(bathymetry.bottomDepthMeters[cy]?.[cx] ?? 0);
}

function adjacentLandCount(bathymetry, x, y) {
  let count = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= bathymetry.width || ny >= bathymetry.height || bathymetry.landMask[ny]?.[nx] === true) count += 1;
  }
  return count;
}

function shallowFraction(bathymetry, threshold) {
  const cells = wetCells(bathymetry);
  return round(cells.length ? cells.filter((entry) => entry.depth <= threshold).length / cells.length : 0);
}

function deepFraction(bathymetry, threshold) {
  const cells = wetCells(bathymetry);
  return round(cells.length ? cells.filter((entry) => entry.depth >= threshold).length / cells.length : 0);
}

function coastlineSegmentEstimate(bathymetry) {
  let segments = 0;
  for (let y = 0; y < bathymetry.height; y += 1) {
    for (let x = 0; x < bathymetry.width; x += 1) {
      if (bathymetry.wetMask[y]?.[x] === true && adjacentLandCount(bathymetry, x, y) > 0) segments += 1;
    }
  }
  return segments;
}

function fraction(values = []) {
  return values.length ? values.filter(Boolean).length / values.length : 0;
}

function indexNorm(index, count) {
  return count > 1 ? clamp(Number(index) / (count - 1), 0, 1, 0.5) : 0.5;
}

function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function stableToken(...parts) {
  return canonicalJsonDigest(canonicalizeJsonValue(parts)).replace(/^.*:/, '').slice(0, 10);
}

function check(id, passed, details = {}) {
  return { id, passed: passed === true, details };
}
