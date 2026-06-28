import { stableDigest } from '../../../packages/contracts/src/index.js';
import {
  CLASSICAL_PLANNER_BENCHMARK_BUNDLE_LAYOUT,
  CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE,
  CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION,
  VECTOR_BUNDLE_LAYOUT,
  sampleClassicalPlannerBenchmarkBundle,
  validateClassicalPlannerBenchmarkBundle
} from '../io/ClassicalPlannerBenchmarkBundleExporter.js';
import { buildReferenceEnvironmentPlanningLaunch } from './ReferenceEnvironmentPlanningLaunchAdapter.js';
import { validateReferenceEnvironmentLaunch } from './ReferenceEnvironmentLaunchValidator.js';

export const REFERENCE_ENVIRONMENT_BENCHMARK_BUNDLE_VERSION = 'reference-environment-benchmark-bundle-env-compose-r1';

export function buildReferenceEnvironmentBenchmarkBundle(input = {}) {
  const result = input.referenceEnvironmentResult ?? input;
  const launchValidation = input.launchValidation ?? validateReferenceEnvironmentLaunch(result);
  const launch = input.planningLaunch ?? buildReferenceEnvironmentPlanningLaunch({ ...result, launchValidation });
  const current = result.currentArtifact ?? result.currentResult?.currentArtifact;
  const scalar = result.scalarArtifact ?? result.scalarResult?.scalarArtifact;
  if (!current || !scalar) throw new Error('Benchmark bundle export requires CurrentField4D and ScalarField4D artifacts.');

  const eastAxisMeters = current.eastAxisMeters ?? scalar.xAxis ?? [];
  const northAxisMeters = current.northAxisMeters ?? scalar.yAxis ?? [];
  const depthAxisMeters = current.depthAxisMeters ?? scalar.depthAxisMeters ?? [];
  const timeAxisSeconds = current.timeAxisSeconds ?? scalar.timeAxisSeconds ?? [];
  const width = eastAxisMeters.length;
  const height = northAxisMeters.length;
  const depthCount = depthAxisMeters.length;
  const timeCount = timeAxisSeconds.length;
  const wetMask = normalizeBooleanGrid(current.wetMask, width, height, current.bottomDepthMeters);
  const landMask = wetMask.map((row) => row.map((wet) => !wet));
  const bottomDepthMeters = normalizeGrid(current.bottomDepthMeters, width, height, Math.max(...depthAxisMeters, 150));
  const currents = buildBundleCurrents(current, { timeCount, depthCount, height, width });
  const scalarField = buildBundleScalarField(scalar, { timeCount, depthCount, height, width });
  const missionGeometry = buildMissionGeometry({
    launch,
    hazards: launch.level.layers?.hazards ?? [],
    eastAxisMeters,
    northAxisMeters,
    result
  });
  const candidateNodes = [
    ...(result.startDropZoneCandidates?.candidates ?? []).map((candidate, index) => candidateNodeFromMeters(candidate, index, 'startDropZone', eastAxisMeters, northAxisMeters)),
    ...(result.hotspotArtifact?.hotspots ?? []).slice(0, 16).map((hotspot, index) => candidateNodeFromHotspot(hotspot, index, eastAxisMeters, northAxisMeters))
  ];
  const publicProjection = {
    coordinateFrame: 'localLevelGridMeters',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    bathymetry: {
      shape: [height, width],
      arrayLayout: 'north->east bottomDepthMeters',
      depthConvention: 'positive-down meters',
      bottomDepthMeters,
      wetMask,
      landMask,
      sourceResolution: { northCount: height, eastCount: width },
      sourceRole: 'packageBackedReferenceBathymetryProjection',
      sourceDigest: stableDigest({ bottomDepthMeters, wetMask, role: 'packageBackedReferenceBathymetryProjection' }),
      note: 'Public bottom-depth grid coupled to package-backed reference-derived environment fields.'
    },
    wetMask,
    landMask,
    currents,
    scalarFields: [scalarField],
    missionGeometry,
    candidateNodes,
    visibilityClass: 'PUBLIC',
    fairnessClass: 'FORECAST_ONLY',
    projectionSpecification: {
      source: 'Environment Studio reference-derived package artifacts',
      visibilityPolicy: 'PUBLIC benchmark projection from package-backed deterministic synthetic fields',
      compactFixtureHandling: 'Full package-backed CurrentField4D and ScalarField4D arrays are preserved at their public package axes.',
      resamplingMethod: 'none; bundle uses CurrentField4D / ScalarField4D axes'
    }
  };
  const bundle = {
    schemaVersion: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION,
    artifactVersion: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION,
    type: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE,
    artifactType: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE,
    bundleId: input.bundleId ?? `${result.referenceFixtureId ?? 'reference-environment'}-package-backed-public-benchmark`,
    createdAt: input.createdAt ?? '2026-06-27T00:00:00.000Z',
    producer: 'ReferenceEnvironmentBenchmarkBundle',
    producerVersion: REFERENCE_ENVIRONMENT_BENCHMARK_BUNDLE_VERSION,
    environmentDigest: result.environmentArtifactDigest ?? result.environmentArtifact?.artifactDigest ?? null,
    publicProjectionDigest: stableDigest(publicProjection),
    missionDigest: launch.launchMetadata?.missionDigest ?? null,
    solverPacketDigest: null,
    benchmarkBundleDigest: null,
    coordinateFrame: {
      id: 'localLevelGridMeters',
      description: 'Local physical-meter grid derived from package-backed reference environment axes; not Three.js world coordinates.',
      origin: { eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 0 }
    },
    horizontalUnits: 'meters',
    depthConvention: 'positive-down meters',
    timeConvention: 'seconds from mission start',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    bathymetry: publicProjection.bathymetry,
    wetMask,
    landMask,
    currents,
    scalarFields: [scalarField],
    missionGeometry,
    candidateNodes,
    parityProbes: [],
    visibilityClass: 'PUBLIC',
    fairnessClass: 'FORECAST_ONLY',
    containsHiddenTruth: false,
    fieldRoles: {
      bathymetry: 'public package-backed 2.5D bottom-surface benchmark field',
      wetMask: 'public navigability mask',
      landMask: 'public land mask',
      currents: 'public deterministic synthetic CurrentField4D',
      scalarFields: 'public deterministic synthetic ScalarField4D science values',
      missionGeometry: 'public validated launch geometry and planner candidates'
    },
    sourceMetadata: {
      alphaPositioning: 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.',
      tagline: 'Plan. Simulate. Compare. Learn.',
      sourceFixtureId: result.referenceFixtureId ?? null,
      sourceGridShape: [height, width],
      sourceTimeCount: timeCount,
      sourceDepthCount: depthCount,
      sourceProjection: 'public package-backed reference-derived benchmark projection',
      sourceContainsHiddenTruth: false,
      calibrated: false,
      synthetic: true,
      referenceBathymetryPatch: true,
      notes: [
        'Reference bathymetry is public fixture-derived; currents and scalars are deterministic synthetic bathymetry-conditioned benchmark fields.',
        'This bundle is for exported-data inspection and planner input; it is not the authoritative simulator or scorer.'
      ]
    },
    packageVersions: {
      benchmarkBundle: 'colab-bench-r1.1',
      environmentComposition: REFERENCE_ENVIRONMENT_BENCHMARK_BUNDLE_VERSION
    },
    validationBaselineId: 'scientific-validation-baseline-sci-valid-r2a',
    validationBaselineDigest: 'fnv1a32:dd016175',
    scoreProfileId: 'balancedMission',
    scoreProfileVersion: 'score-pkg-r1',
    scoreProfileDigest: null,
    referenceEnvironmentDigests: {
      referenceFixtureId: result.referenceFixtureId ?? null,
      bathymetryArtifactDigest: result.bathymetryArtifactDigest ?? result.fieldRegenerationResult?.bathymetryArtifactDigest ?? null,
      environmentArtifactDigest: result.environmentArtifactDigest ?? result.environmentArtifact?.artifactDigest ?? null,
      currentArtifactDigest: result.currentArtifactDigest ?? current.digest ?? null,
      scalarArtifactDigest: result.scalarArtifactDigest ?? scalar.digest ?? null,
      hotspotArtifactDigest: result.hotspotArtifactDigest ?? result.scalarResult?.hotspotArtifactDigest ?? result.fieldRegenerationResult?.hotspotArtifactDigest ?? null,
      startDropZoneCandidateDigest: result.startDropZoneCandidateDigest ?? result.startDropZoneCandidates?.candidateDigest ?? result.fieldRegenerationResult?.startDropZoneCandidateDigest ?? null,
      hazardCandidateDigest: result.hazardCandidateDigest ?? result.hazardCandidates?.hazardDigest ?? result.fieldRegenerationResult?.hazardCandidateDigest ?? null
    },
    fieldArtifactStatus: {
      bathymetry: 'CURRENT',
      currents: currents?.fieldDigest ? 'CURRENT' : 'REQUIRES_REGENERATION',
      scalarFields: scalarField?.fieldDigest ? 'CURRENT' : 'REQUIRES_REGENERATION',
      hotspots: result.hotspotArtifact?.hotspots?.length ? 'CURRENT' : 'REQUIRES_REGENERATION',
      hazards: missionGeometry.hazards?.fieldDigest ? 'CURRENT' : 'REQUIRES_REGENERATION',
      startsDropZones: missionGeometry.deploymentZones?.length ? 'CURRENT' : 'NEEDS_VALIDATION'
    },
    visibilitySafety: {
      visibilityClass: 'PUBLIC',
      fairnessClass: 'FORECAST_ONLY',
      containsHiddenTruth: false,
      rawExternalDataPathExposed: false,
      localAbsolutePathExposed: false
    },
    fairnessMetadata: {
      plannerInputVisibility: 'PUBLIC / FORECAST_ONLY',
      hiddenTruthAvailableToPlanner: false,
      authoritativeSimulatorIncluded: false,
      officialScoringIncluded: false,
      scoreProfileId: 'balancedMission'
    },
    payloadDigest: null
  };
  bundle.parityProbes = buildParityProbes(bundle);
  bundle.payloadDigest = digestWithoutSelf(bundle);
  bundle.benchmarkBundleDigest = bundle.payloadDigest;
  assertPublicSafe(bundle);
  const validation = validateClassicalPlannerBenchmarkBundle(bundle);
  return {
    type: 'anchor.reference-environment.benchmark-bundle-result',
    version: REFERENCE_ENVIRONMENT_BENCHMARK_BUNDLE_VERSION,
    status: validation.status,
    bundle,
    validation,
    benchmarkBundleDigest: bundle.benchmarkBundleDigest,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

function buildBundleCurrents(current, shape) {
  const values = Array.from({ length: shape.timeCount }, (_t, t) => (
    Array.from({ length: shape.depthCount }, (_z, z) => (
      Array.from({ length: shape.height }, (_y, y) => (
        Array.from({ length: shape.width }, (_x, x) => [
          round(current.uEastMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0),
          round(current.vNorthMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0),
          round(current.wDownMetersPerSecond?.[t]?.[z]?.[y]?.[x] ?? 0)
        ])
      ))
    ))
  ));
  const payload = {
    fieldId: current.id ?? 'reference-current-field-4d',
    label: current.label ?? 'Reference-derived synthetic CurrentField4D',
    role: 'forecastCurrent',
    sourceRole: 'publicForecast',
    units: { u: 'm/s eastward', v: 'm/s northward', w: 'm/s downward' },
    axes: ['timeAxisSeconds', 'depthAxisMeters', 'northAxisMeters', 'eastAxisMeters'],
    shape: [shape.timeCount, shape.depthCount, shape.height, shape.width],
    arrayLayout: VECTOR_BUNDLE_LAYOUT,
    values,
    temporalBoundaryBehavior: current.temporalBoundaryMode ?? 'clamp',
    maskBehavior: 'land and below-bottom current components are zero in the package current artifact',
    depthStructure: 'packageBackedDepthSpecificCurrentField4D',
    sourceDigest: current.digest ?? stableDigest(values)
  };
  return { ...payload, fieldDigest: stableDigest(payload) };
}

function buildBundleScalarField(scalar, shape) {
  const values = Array.from({ length: shape.timeCount }, (_t, t) => (
    Array.from({ length: shape.depthCount }, (_z, z) => (
      Array.from({ length: shape.height }, (_y, y) => (
        Array.from({ length: shape.width }, (_x, x) => round(scalar.forecastValue?.[t]?.[z]?.[y]?.[x] ?? scalar.scalarValue?.[t]?.[z]?.[y]?.[x] ?? 0))
      ))
    ))
  ));
  const payload = {
    fieldId: scalar.id ?? 'reference-science-value-4d',
    label: scalar.label ?? 'Reference-derived synthetic science ScalarField4D',
    role: 'forecastScienceValue',
    sourceRole: 'publicForecast',
    units: scalar.units?.scalarValue ?? 'normalized science value',
    axes: ['timeAxisSeconds', 'depthAxisMeters', 'northAxisMeters', 'eastAxisMeters'],
    shape: [shape.timeCount, shape.depthCount, shape.height, shape.width],
    arrayLayout: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_LAYOUT,
    values,
    temporalBoundaryBehavior: 'clamp',
    maskBehavior: 'package scalar artifact already applies public wet/depth constraints where declared',
    depthClassification: 'packageBackedDepthSpecificScalarField4D',
    integratedVersusDepthSpecific: 'depth-specific public scalar field; integrated-water-column sampling is a derived query only when explicitly requested',
    sourceDigest: scalar.digest ?? stableDigest(values)
  };
  return { ...payload, fieldDigest: stableDigest(payload) };
}

function buildMissionGeometry({ launch, hazards, eastAxisMeters, northAxisMeters, result }) {
  return {
    starts: (launch.mission?.agents ?? []).map((agent) => ({
      agentId: agent.id ?? agent.agentId,
      eastMeters: axisValue(eastAxisMeters, agent.start?.x),
      northMeters: axisValue(northAxisMeters, agent.start?.y),
      source: 'validated-reference-start-candidate'
    })),
    deploymentZones: (launch.level?.zones ?? []).filter((zone) => zone.type === 'deployment').map((zone) => ({
      zoneId: zone.id,
      label: zone.label,
      mode: 'chooseFromZones',
      sourceCandidateId: zone.sourceCandidateId ?? null,
      allowedCells: zone.cells ?? []
    })),
    hazards: {
      fieldId: 'public-reference-hazards',
      role: 'publicHazard',
      units: 'dimensionless risk',
      axes: ['northAxisMeters', 'eastAxisMeters'],
      shape: [northAxisMeters.length, eastAxisMeters.length],
      arrayLayout: 'north->east',
      values: hazards,
      fieldDigest: stableDigest(hazards)
    },
    objectives: launch.mission?.objectives ?? launch.mission?.scoring ?? {},
    samplingTargets: launch.level?.targets ?? result.hotspotArtifact?.hotspots ?? [],
    operationalDomain: {
      eastMinMeters: eastAxisMeters[0] ?? 0,
      eastMaxMeters: eastAxisMeters[eastAxisMeters.length - 1] ?? 0,
      northMinMeters: northAxisMeters[0] ?? 0,
      northMaxMeters: northAxisMeters[northAxisMeters.length - 1] ?? 0
    }
  };
}

function candidateNodeFromMeters(candidate, index, source, eastAxisMeters, northAxisMeters) {
  return {
    id: String(candidate.candidateId ?? `${source}_${index + 1}`),
    source,
    x: nearestIndex(eastAxisMeters, Number(candidate.eastMeters ?? 0)),
    y: nearestIndex(northAxisMeters, Number(candidate.northMeters ?? 0)),
    eastMeters: round(candidate.eastMeters ?? 0),
    northMeters: round(candidate.northMeters ?? 0),
    value: candidate.value ?? candidate.score ?? null
  };
}

function candidateNodeFromHotspot(hotspot, index, eastAxisMeters, northAxisMeters) {
  return candidateNodeFromMeters({
    candidateId: hotspot.hotspotId ?? `hotspot_${index + 1}`,
    eastMeters: hotspot.eastMeters ?? eastAxisMeters[Math.max(0, Math.min(eastAxisMeters.length - 1, Math.round(Number(hotspot.xIndex ?? 0))))],
    northMeters: hotspot.northMeters ?? northAxisMeters[Math.max(0, Math.min(northAxisMeters.length - 1, Math.round(Number(hotspot.yIndex ?? 0))))],
    value: hotspot.value ?? hotspot.score ?? hotspot.peakValue ?? null
  }, index, 'scienceHotspot', eastAxisMeters, northAxisMeters);
}

function buildParityProbes(bundle) {
  const east = bundle.eastAxisMeters;
  const north = bundle.northAxisMeters;
  const depths = bundle.depthAxisMeters;
  const times = bundle.timeAxisSeconds;
  const wet = findWetPoint(bundle) ?? { eastMeters: east[0], northMeters: north[0] };
  const land = findLandPoint(bundle);
  const coordinates = [
    { id: 'grid-surface-first-time', eastMeters: east[0], northMeters: north[0], depthMeters: depths[0], timeSeconds: times[0] },
    { id: 'wet-surface', ...wet, depthMeters: depths[0], timeSeconds: times[0] },
    { id: 'wet-shallow', ...wet, depthMeters: depths[Math.min(1, depths.length - 1)], timeSeconds: times[0] },
    { id: 'wet-deep', ...wet, depthMeters: depths[depths.length - 1], timeSeconds: times[times.length - 1] },
    { id: 'time-interior', ...wet, depthMeters: depths[0], timeSeconds: midpoint(times) },
    { id: 'depth-interior', ...wet, depthMeters: midpoint(depths), timeSeconds: times[0] },
    { id: 'xyzt-interior', eastMeters: midpoint(east), northMeters: midpoint(north), depthMeters: midpoint(depths), timeSeconds: midpoint(times) },
    { id: 'near-bottom', ...wet, depthMeters: Math.min(depths[depths.length - 1], sampleClassicalPlannerBenchmarkBundle(bundle, { ...wet, depthMeters: depths[0], timeSeconds: times[0] }).bottomDepthMeters), timeSeconds: times[0] }
  ];
  if (land) coordinates.push({ id: 'land-rejection', ...land, depthMeters: depths[0], timeSeconds: times[0] });
  return coordinates.map((entry) => probe(bundle, entry.id, entry));
}

function probe(bundle, probeId, coordinates) {
  const actual = sampleClassicalPlannerBenchmarkBundle(bundle, coordinates);
  return {
    probeId,
    eastMeters: coordinates.eastMeters,
    northMeters: coordinates.northMeters,
    depthMeters: coordinates.depthMeters,
    timeSeconds: coordinates.timeSeconds,
    expected: {
      wet: actual.wet,
      land: actual.land,
      belowBottom: actual.belowBottom,
      bottomDepthMeters: actual.bottomDepthMeters,
      hazardValue: actual.hazardValue,
      current: actual.current,
      scalars: actual.scalars
    },
    tolerances: {
      bottomDepthMeters: 1e-6,
      currentMetersPerSecond: 1e-9,
      scalarValue: 1e-9,
      hazardValue: 1e-9
    }
  };
}

function normalizeGrid(grid, width, height, fallback) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => {
      const value = Number(grid?.[y]?.[x]);
      return Number.isFinite(value) ? round(value) : fallback;
    })
  ));
}

function normalizeBooleanGrid(grid, width, height, bottomDepthMeters) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => Boolean(grid?.[y]?.[x] ?? Number(bottomDepthMeters?.[y]?.[x] ?? 0) > 0))
  ));
}

function findWetPoint(bundle) {
  const values = bundle.scalarFields?.[0]?.values?.[0]?.[0] ?? [];
  let best = null;
  for (let y = 0; y < values.length; y += 1) {
    for (let x = 0; x < (values[y]?.length ?? 0); x += 1) {
      if (!bundle.wetMask[y]?.[x]) continue;
      if (!best || values[y][x] > best.value) best = { x, y, value: values[y][x] };
    }
  }
  return best ? { eastMeters: bundle.eastAxisMeters[best.x], northMeters: bundle.northAxisMeters[best.y] } : null;
}

function findLandPoint(bundle) {
  for (let y = 0; y < bundle.landMask.length; y += 1) {
    for (let x = 0; x < (bundle.landMask[y]?.length ?? 0); x += 1) {
      if (bundle.landMask[y][x]) return { eastMeters: bundle.eastAxisMeters[x], northMeters: bundle.northAxisMeters[y] };
    }
  }
  return null;
}

function nearestIndex(axis, value) {
  if (!Array.isArray(axis) || !axis.length || !Number.isFinite(value)) return 0;
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < axis.length; index += 1) {
    const distance = Math.abs(Number(axis[index]) - value);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

function axisValue(axis, index) {
  return round(axis[Math.max(0, Math.min(axis.length - 1, Math.round(Number(index ?? 0))))] ?? 0);
}

function midpoint(axis) {
  if (!axis.length) return 0;
  return (Number(axis[0]) + Number(axis[axis.length - 1])) / 2;
}

function digestWithoutSelf(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.payloadDigest;
  delete clone.benchmarkBundleDigest;
  return stableDigest(clone);
}

function assertPublicSafe(bundle) {
  const text = JSON.stringify(bundle);
  for (const marker of ['T_hiddenTruth', '"hiddenTruth"', 'rawOracleTensor', 'oracleState', 'external_data/', 'external_data\\\\']) {
    if (text.includes(marker)) throw new Error(`Public benchmark bundle contains forbidden marker: ${marker}`);
  }
}

function round(value, digits = 12) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}
