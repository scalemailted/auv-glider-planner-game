import { stableDigest } from '../../../packages/contracts/src/index.js';

export const CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE = 'anchor.classical-planner-benchmark-bundle';
export const CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION = '1.0.0';
export const CLASSICAL_PLANNER_BENCHMARK_BUNDLE_LAYOUT = 'time->depth->north->east';
export const VECTOR_BUNDLE_LAYOUT = 'time->depth->north->east->[uEastMetersPerSecond,vNorthMetersPerSecond,wDownMetersPerSecond]';

const DEFAULT_DEPTHS_BY_LAYER = Object.freeze({
  surface: 0,
  shallow: 10,
  thermocline: 35,
  midwater: 75,
  deep: 150
});

export function buildClassicalPlannerBenchmarkBundleFromSolverPacket(packet, options = {}) {
  assertSolverPacket(packet);
  const grid = packet.level?.world?.grid ?? {};
  const visibleFields = packet.planningData?.visibleFields ?? packet.level?.layers ?? {};
  const forecast = visibleFields.forecast ?? packet.level?.layers?.forecast ?? {};
  const frames = normalizeFrames(forecast.frames);
  const width = Number(grid.width ?? gridWidth(visibleFields.terrain ?? packet.level?.layers?.terrain));
  const height = Number(grid.height ?? gridHeight(visibleFields.terrain ?? packet.level?.layers?.terrain));
  const cellSizeMeters = Number(grid.cellSizeMeters ?? grid.cellSize ?? 1);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('Solver packet public grid must have positive width and height.');
  }
  const eastAxisMeters = Array.from({ length: width }, (_, index) => round(index * cellSizeMeters));
  const northAxisMeters = Array.from({ length: height }, (_, index) => round(index * cellSizeMeters));
  const depthAxisMeters = normalizeDepthAxis(packet);
  const timeAxisSeconds = frames.map((frame) => frame.timeSeconds);
  const terrain = normalizeGrid(visibleFields.terrain ?? packet.level?.layers?.terrain, width, height, 0);
  const hazards = normalizeGrid(visibleFields.hazards ?? packet.level?.layers?.hazards, width, height, 0);
  const masks = buildMasks(terrain);
  const sourceBathymetry = visibleFields.bathymetry ?? packet.level?.layers?.bathymetry ?? null;
  const bathymetry = buildBathymetry({ sourceBathymetry, terrain, masks, width, height, depthAxisMeters, cellSizeMeters });
  const currents = buildCurrentField({ frames, depthAxisMeters, width, height, masks, bathymetry });
  const scalarFields = [
    buildScalarField({
      fieldId: 'science-value',
      label: 'Forecast Science Value / ROI',
      role: 'forecastScienceValue',
      units: 'dimensionless expected mission value',
      frames,
      depthAxisMeters,
      width,
      height,
      masks,
      bathymetry
    })
  ];
  const missionGeometry = buildMissionGeometry(packet, hazards, eastAxisMeters, northAxisMeters, cellSizeMeters);
  const candidateNodes = (packet.planningData?.candidateNodes ?? []).map((node, index) => normalizeCandidateNode(node, index, cellSizeMeters));
  const publicProjection = {
    coordinateFrame: 'localLevelGridMeters',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    bathymetry,
    wetMask: masks.wetMask,
    landMask: masks.landMask,
    currents,
    scalarFields,
    missionGeometry,
    candidateNodes,
    visibilityClass: 'PUBLIC',
    fairnessClass: 'FORECAST_ONLY',
    projectionSpecification: {
      source: 'anchor.solverPacket public planningData.visibleFields',
      visibilityPolicy: 'PUBLIC forecast-only benchmark projection',
      compactFixtureHandling: 'full exported source grid; depth-invariant top-down fields are expanded across declared public depth axis with explicit classification',
      resamplingMethod: 'none for exported compact fixtures'
    }
  };
  const publicProjectionDigest = stableDigest(publicProjection);
  const solverPacketDigest = stableDigest(packet);
  const bundle = {
    schemaVersion: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION,
    artifactVersion: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION,
    type: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE,
    artifactType: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE,
    bundleId: options.bundleId ?? `${packet.benchmarkFixture?.fixtureId ?? packet.packetId ?? 'benchmark'}-public-4d`,
    createdAt: options.createdAt ?? '2026-06-25T00:00:00.000Z',
    producer: 'ClassicalPlannerBenchmarkBundleExporter',
    environmentDigest: packet.environmentDigest ?? null,
    publicProjectionDigest,
    missionDigest: packet.missionDigest ?? null,
    solverPacketDigest,
    benchmarkBundleDigest: null,
    coordinateFrame: {
      id: 'localLevelGridMeters',
      description: 'Local physical-meter grid derived from solver-packet grid cell size; not Three.js world coordinates.',
      origin: { eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 0 }
    },
    horizontalUnits: 'meters',
    depthConvention: 'positive-down meters',
    timeConvention: 'seconds from mission start',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    bathymetry,
    wetMask: masks.wetMask,
    landMask: masks.landMask,
    currents,
    scalarFields,
    missionGeometry,
    candidateNodes,
    parityProbes: [],
    visibilityClass: 'PUBLIC',
    fairnessClass: 'FORECAST_ONLY',
    containsHiddenTruth: false,
    fieldRoles: {
      bathymetry: 'public 2.5D bottom-surface benchmark transport field',
      wetMask: 'public navigability mask',
      landMask: 'public land mask',
      currents: 'public forecast current vectors',
      scalarFields: 'public forecast scalar/science fields',
      missionGeometry: 'public mission geometry and planner candidates'
    },
    sourceMetadata: {
      alphaPositioning: 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.',
      tagline: 'Plan. Simulate. Compare. Learn.',
      sourcePacketId: packet.packetId ?? null,
      sourceFixtureId: packet.benchmarkFixture?.fixtureId ?? null,
      sourceGridShape: [height, width],
      sourceTimeCount: frames.length,
      sourceDepthCount: depthAxisMeters.length,
      sourceProjection: 'public forecast-only planning projection',
      sourceContainsHiddenTruth: false,
      calibrated: false,
      synthetic: true,
      notes: [
        'Compact top-down public forecast fields are expanded across declared public depth axes only when the source is explicitly depth-invariant.',
        'The bundle is for exported-data inspection and planner input; it is not the authoritative simulator or scorer.'
      ]
    },
    packageVersions: {
      codecs: 'anchor-codecs-codec-r1',
      validation: 'scientific-validation-baseline-sci-valid-r2a',
      benchmarkBundle: 'colab-bench-r1.1'
    },
    validationBaselineId: packet.validationBaselineId ?? 'scientific-validation-baseline-sci-valid-r2a',
    validationBaselineDigest: packet.validationBaselineDigest ?? 'fnv1a32:dd016175',
    scoreProfileId: packet.scoreProfileId ?? 'balancedMission',
    scoreProfileVersion: packet.scoreProfileVersion ?? 'score-pkg-r1',
    scoreProfileDigest: packet.scoreProfileDigest ?? null,
    payloadDigest: null
  };
  bundle.parityProbes = buildBundleParityProbes(bundle);
  bundle.payloadDigest = digestWithoutSelf(bundle);
  bundle.benchmarkBundleDigest = bundle.payloadDigest;
  assertNoHiddenTruth(bundle);
  return bundle;
}

export function validateClassicalPlannerBenchmarkBundle(bundle) {
  const failures = [];
  const warnings = [];
  const require = (condition, message) => {
    if (!condition) failures.push(message);
  };
  require(bundle?.type === CLASSICAL_PLANNER_BENCHMARK_BUNDLE_TYPE, 'bundle type must be anchor.classical-planner-benchmark-bundle');
  require(bundle?.schemaVersion === CLASSICAL_PLANNER_BENCHMARK_BUNDLE_VERSION, 'bundle schemaVersion must be 1.0.0');
  require(bundle?.visibilityClass === 'PUBLIC', 'bundle visibilityClass must be PUBLIC');
  require(bundle?.fairnessClass === 'FORECAST_ONLY', 'bundle fairnessClass must be FORECAST_ONLY');
  require(bundle?.containsHiddenTruth === false, 'bundle must declare containsHiddenTruth=false');
  for (const axisName of ['eastAxisMeters', 'northAxisMeters', 'depthAxisMeters', 'timeAxisSeconds']) {
    require(Array.isArray(bundle?.[axisName]) && bundle[axisName].length > 0, `${axisName} must be present`);
    require(isMonotonic(bundle?.[axisName] ?? []), `${axisName} must be monotonic`);
  }
  const shape = [
    bundle.timeAxisSeconds?.length ?? 0,
    bundle.depthAxisMeters?.length ?? 0,
    bundle.northAxisMeters?.length ?? 0,
    bundle.eastAxisMeters?.length ?? 0
  ];
  require(sameShape(bundle?.currents?.shape, shape), 'currents shape must be [time, depth, north, east]');
  for (const field of bundle?.scalarFields ?? []) require(sameShape(field.shape, shape), `scalar field ${field.fieldId} shape must be [time, depth, north, east]`);
  require(Array.isArray(bundle?.bathymetry?.bottomDepthMeters), 'bathymetry bottomDepthMeters must be present');
  require(Array.isArray(bundle?.wetMask), 'wetMask must be present');
  require(Array.isArray(bundle?.landMask), 'landMask must be present');
  require(Array.isArray(bundle?.parityProbes) && bundle.parityProbes.length >= 8, 'bundle must include broad parity probes');
  if (JSON.stringify(bundle).includes('T_hiddenTruth')) failures.push('bundle contains T_hiddenTruth marker');
  if (bundle?.bathymetry?.sourceRole === 'publicCompatibilityProjection') {
    warnings.push('Bathymetry is a public compatibility projection for compact fixtures, not calibrated bathymetry.');
  }
  const expectedDigest = digestWithoutSelf(bundle);
  require(bundle?.payloadDigest === expectedDigest, 'payloadDigest must match stable digest without payloadDigest/benchmarkBundleDigest');
  require(bundle?.benchmarkBundleDigest === expectedDigest, 'benchmarkBundleDigest must match payloadDigest');
  return {
    status: failures.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    failures,
    warnings,
    payloadDigest: expectedDigest,
    fieldDigests: {
      bathymetry: bundle?.bathymetry?.sourceDigest ?? null,
      currents: bundle?.currents?.fieldDigest ?? null,
      scalarFields: (bundle?.scalarFields ?? []).map((field) => ({ fieldId: field.fieldId, fieldDigest: field.fieldDigest }))
    }
  };
}

export function sampleClassicalPlannerBenchmarkBundle(bundle, coordinates) {
  const x = interpolateAxis(bundle.eastAxisMeters, Number(coordinates.eastMeters ?? 0));
  const y = interpolateAxis(bundle.northAxisMeters, Number(coordinates.northMeters ?? 0));
  const z = interpolateAxis(bundle.depthAxisMeters, Number(coordinates.depthMeters ?? 0));
  const t = interpolateAxis(bundle.timeAxisSeconds, Number(coordinates.timeSeconds ?? 0), bundle.currents?.temporalBoundaryBehavior);
  const wet = sampleMask(bundle.wetMask, x, y);
  const land = sampleMask(bundle.landMask, x, y);
  const bottomDepthMeters = bilinear(bundle.bathymetry.bottomDepthMeters, x, y);
  const belowBottom = Number(coordinates.depthMeters ?? 0) > bottomDepthMeters;
  const current = trilinearTimeVector(bundle.currents.values, t, z, y, x);
  const scalars = {};
  for (const field of bundle.scalarFields ?? []) scalars[field.fieldId] = trilinearTimeScalar(field.values, t, z, y, x);
  const hazardValue = bilinear(bundle.missionGeometry.hazards?.values ?? [], x, y);
  return {
    eastMeters: Number(coordinates.eastMeters ?? 0),
    northMeters: Number(coordinates.northMeters ?? 0),
    depthMeters: Number(coordinates.depthMeters ?? 0),
    timeSeconds: Number(coordinates.timeSeconds ?? 0),
    wet,
    land,
    belowBottom,
    bottomDepthMeters: round(bottomDepthMeters),
    hazardValue: round(hazardValue),
    current: {
      uEastMetersPerSecond: round(current[0]),
      vNorthMetersPerSecond: round(current[1]),
      wDownMetersPerSecond: round(current[2]),
      magnitudeMetersPerSecond: round(Math.hypot(current[0], current[1], current[2]))
    },
    scalars: Object.fromEntries(Object.entries(scalars).map(([key, value]) => [key, round(value)]))
  };
}

function assertSolverPacket(packet) {
  if (!packet || packet.type !== 'anchor.solverPacket') throw new Error('Expected anchor.solverPacket input.');
  if (JSON.stringify(packet.planningData?.visibleFields ?? {}).includes('T_hiddenTruth')) {
    throw new Error('Solver-visible fields contain T_hiddenTruth.');
  }
}

function normalizeFrames(frames) {
  const source = Array.isArray(frames) && frames.length ? frames : [{ t: 0, current: [], roi: [] }];
  return source.map((frame, index) => ({
    ...frame,
    timeSeconds: Number(frame.t ?? frame.timeSeconds ?? index)
  })).sort((a, b) => a.timeSeconds - b.timeSeconds);
}

function normalizeDepthAxis(packet) {
  const config = packet.planningData?.waterColumnConfig ?? packet.level?.world?.waterColumnConfig ?? packet.waterColumnConfig ?? {};
  if (Array.isArray(config.depthAxisMeters) && config.depthAxisMeters.length) return config.depthAxisMeters.map(Number);
  if (Array.isArray(config.depthLayers) && config.depthLayers.length) {
    return config.depthLayers.map((layer) => Number(layer.depthMeters ?? layer.nominalDepthMeters ?? DEFAULT_DEPTHS_BY_LAYER[layer.id] ?? 0));
  }
  const ids = config.depthLayerIds ?? config.defaultLayerIds ?? ['surface'];
  return ids.map((id) => Number(DEFAULT_DEPTHS_BY_LAYER[id] ?? 0));
}

function buildCurrentField({ frames, depthAxisMeters, width, height, masks, bathymetry }) {
  const values = frames.map((frame) => depthAxisMeters.map((depth) => (
    Array.from({ length: height }, (_, y) => (
      Array.from({ length: width }, (_, x) => {
        const bottomDepth = bathymetry.bottomDepthMeters[y][x];
        if (!masks.wetMask[y][x] || depth > bottomDepth) return [0, 0, 0];
        const vector = vectorAt(frame.current, x, y);
        return [round(vector[0]), round(vector[1]), round(vector[2])];
      })
    ))
  )));
  const payload = {
    fieldId: 'forecast-current',
    label: 'Forecast Current',
    role: 'forecastCurrent',
    sourceRole: 'publicForecast',
    units: { u: 'm/s eastward', v: 'm/s northward', w: 'm/s downward' },
    axes: ['timeAxisSeconds', 'depthAxisMeters', 'northAxisMeters', 'eastAxisMeters'],
    shape: [frames.length, depthAxisMeters.length, height, width],
    arrayLayout: VECTOR_BUNDLE_LAYOUT,
    values,
    temporalBoundaryBehavior: 'clamp',
    maskBehavior: 'land and below-bottom current components set to zero in public projection',
    depthStructure: 'depthInvariantFromTopDownForecastFrame',
    sourceDigest: stableDigest(frames.map((frame) => frame.current ?? []))
  };
  return { ...payload, fieldDigest: stableDigest(payload) };
}

function buildScalarField({ fieldId, label, role, units, frames, depthAxisMeters, width, height, masks, bathymetry }) {
  const values = frames.map((frame) => depthAxisMeters.map((depth) => (
    Array.from({ length: height }, (_, y) => (
      Array.from({ length: width }, (_, x) => {
        const bottomDepth = bathymetry.bottomDepthMeters[y][x];
        if (!masks.wetMask[y][x] || depth > bottomDepth) return 0;
        return round(scalarAt(frame.roi, x, y));
      })
    ))
  )));
  const payload = {
    fieldId,
    label,
    role,
    sourceRole: 'publicForecast',
    units,
    axes: ['timeAxisSeconds', 'depthAxisMeters', 'northAxisMeters', 'eastAxisMeters'],
    shape: [frames.length, depthAxisMeters.length, height, width],
    arrayLayout: CLASSICAL_PLANNER_BENCHMARK_BUNDLE_LAYOUT,
    values,
    temporalBoundaryBehavior: 'clamp',
    maskBehavior: 'land and below-bottom scalar values set to zero in public projection',
    depthClassification: 'depthInvariantFromTopDownForecastFrame',
    integratedVersusDepthSpecific: 'depth-invariant public forecast projection; not a substitute for a depth-specific hidden truth field',
    sourceDigest: stableDigest(frames.map((frame) => frame.roi ?? []))
  };
  return { ...payload, fieldDigest: stableDigest(payload) };
}

function buildBathymetry({ sourceBathymetry, terrain, masks, width, height, depthAxisMeters, cellSizeMeters }) {
  const maxDepth = Math.max(...depthAxisMeters, 0);
  const fallbackWetDepth = Math.max(maxDepth + Math.max(50, cellSizeMeters), 200);
  const bottomDepthMeters = normalizeGrid(sourceBathymetry, width, height, null).map((row, y) => row.map((value, x) => {
    if (!masks.wetMask[y][x]) return 0;
    return Number.isFinite(Number(value)) ? round(Number(value)) : fallbackWetDepth;
  }));
  const sourceRole = sourceBathymetry ? 'publicBathymetryArray' : 'publicCompatibilityProjection';
  const payload = {
    shape: [height, width],
    arrayLayout: 'north->east bottomDepthMeters',
    depthConvention: 'positive-down meters',
    bottomDepthMeters,
    wetMask: masks.wetMask,
    landMask: masks.landMask,
    sourceResolution: { northCount: height, eastCount: width },
    sourceRole,
    sourceDigest: stableDigest({ sourceBathymetry, terrain, sourceRole }),
    note: sourceBathymetry
      ? 'Public bottom-depth grid from solver-visible fields.'
      : 'Compact fixture did not expose calibrated bathymetry; this public compatibility projection supplies a deterministic wet bottom deeper than all declared benchmark depth layers.'
  };
  return payload;
}

function buildMasks(terrain) {
  const wetMask = terrain.map((row) => row.map((value) => !Boolean(Number(value))));
  const landMask = wetMask.map((row) => row.map((value) => !value));
  return { wetMask, landMask };
}

function buildMissionGeometry(packet, hazards, eastAxisMeters, northAxisMeters, cellSizeMeters) {
  const mission = packet.mission ?? {};
  const deployment = packet.deployment ?? {};
  return {
    starts: (mission.agents ?? []).map((agent) => ({
      agentId: agent.id ?? agent.agentId,
      eastMeters: round(Number(agent.start?.x ?? 0) * cellSizeMeters),
      northMeters: round(Number(agent.start?.y ?? 0) * cellSizeMeters),
      source: 'mission.agents.start'
    })),
    deploymentZones: (deployment.agents ?? []).map((agent) => ({
      agentId: agent.agentId,
      mode: agent.mode,
      selectedStart: agent.selectedStart ? {
        eastMeters: round(Number(agent.selectedStart.x ?? 0) * cellSizeMeters),
        northMeters: round(Number(agent.selectedStart.y ?? 0) * cellSizeMeters)
      } : null,
      allowedCells: agent.allowedCells ?? []
    })),
    hazards: {
      fieldId: 'public-hazards',
      role: 'publicHazard',
      units: 'dimensionless risk',
      axes: ['northAxisMeters', 'eastAxisMeters'],
      shape: [northAxisMeters.length, eastAxisMeters.length],
      arrayLayout: 'north->east',
      values: hazards,
      fieldDigest: stableDigest(hazards)
    },
    objectives: mission.objectives ?? mission.scoring ?? {},
    samplingTargets: packet.level?.targets ?? packet.level?.priorityTargets ?? [],
    operationalDomain: {
      eastMinMeters: eastAxisMeters[0] ?? 0,
      eastMaxMeters: eastAxisMeters[eastAxisMeters.length - 1] ?? 0,
      northMinMeters: northAxisMeters[0] ?? 0,
      northMaxMeters: northAxisMeters[northAxisMeters.length - 1] ?? 0
    }
  };
}

function normalizeCandidateNode(node, index, cellSizeMeters) {
  return {
    id: String(node.id ?? `candidate_${index}`),
    source: node.source ?? 'candidateNode',
    x: Number(node.x ?? 0),
    y: Number(node.y ?? 0),
    eastMeters: round(Number(node.eastMeters ?? Number(node.x ?? 0) * cellSizeMeters)),
    northMeters: round(Number(node.northMeters ?? Number(node.y ?? 0) * cellSizeMeters)),
    value: node.value ?? node.expectedValue ?? null
  };
}

function buildBundleParityProbes(bundle) {
  const east = bundle.eastAxisMeters;
  const north = bundle.northAxisMeters;
  const depths = bundle.depthAxisMeters;
  const times = bundle.timeAxisSeconds;
  const midEast = midpoint(east);
  const midNorth = midpoint(north);
  const midDepth = depths.length > 1 ? (depths[0] + depths[1]) / 2 : depths[0];
  const midTime = times.length > 1 ? (times[0] + times[times.length - 1]) / 2 : times[0];
  const maxWet = findHighScalarPoint(bundle) ?? { eastMeters: east[0], northMeters: north[0] };
  const land = findLandPoint(bundle);
  const validBottom = sampleClassicalPlannerBenchmarkBundle(bundle, { ...maxWet, depthMeters: Math.max(...depths), timeSeconds: times[0] });
  const probes = [
    probe(bundle, 'grid-surface-first-time', { eastMeters: east[0], northMeters: north[0], depthMeters: depths[0], timeSeconds: times[0] }),
    probe(bundle, 'horizontal-interpolation-surface', { eastMeters: midEast, northMeters: midNorth, depthMeters: depths[0], timeSeconds: times[0] }),
    probe(bundle, 'depth-interpolation', { ...maxWet, depthMeters: midDepth, timeSeconds: times[0] }),
    probe(bundle, 'time-interpolation', { ...maxWet, depthMeters: depths[0], timeSeconds: midTime }),
    probe(bundle, 'combined-xyzt-interpolation', { eastMeters: midEast, northMeters: midNorth, depthMeters: midDepth, timeSeconds: midTime }),
    probe(bundle, 'surface-layer', { ...maxWet, depthMeters: depths[0], timeSeconds: times[0] }),
    probe(bundle, 'intermediate-layer', { ...maxWet, depthMeters: depths[Math.min(1, depths.length - 1)], timeSeconds: times[0] }),
    probe(bundle, 'deep-valid-layer', { ...maxWet, depthMeters: depths[depths.length - 1], timeSeconds: times[times.length - 1] }),
    probe(bundle, 'near-bottom-valid', { ...maxWet, depthMeters: Math.min(validBottom.bottomDepthMeters, Math.max(...depths)), timeSeconds: times[0] }),
    probe(bundle, 'below-bottom-rejection', { ...maxWet, depthMeters: validBottom.bottomDepthMeters + 1, timeSeconds: times[0] })
  ];
  if (land) probes.push(probe(bundle, 'land-rejection', { ...land, depthMeters: depths[0], timeSeconds: times[0] }));
  return probes;
}

function probe(bundle, probeId, coordinates) {
  const actual = sampleClassicalPlannerBenchmarkBundle(bundle, coordinates);
  return {
    probeId,
    ...coordinates,
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

function normalizeGrid(grid, width, height, fillValue) {
  return Array.from({ length: height }, (_, y) => (
    Array.from({ length: width }, (_, x) => {
      const row = Array.isArray(grid) ? grid[y] : null;
      const value = Array.isArray(row) ? row[x] : undefined;
      return value === undefined || value === null ? fillValue : value;
    })
  ));
}

function gridWidth(grid) {
  return Array.isArray(grid?.[0]) ? grid[0].length : 0;
}

function gridHeight(grid) {
  return Array.isArray(grid) ? grid.length : 0;
}

function vectorAt(grid, x, y) {
  const value = grid?.[y]?.[x];
  if (Array.isArray(value)) return [Number(value[0] ?? 0), Number(value[1] ?? 0), Number(value[2] ?? 0)];
  if (value && typeof value === 'object') return [Number(value.u ?? value.uEastMetersPerSecond ?? 0), Number(value.v ?? value.vNorthMetersPerSecond ?? 0), Number(value.w ?? value.wDownMetersPerSecond ?? 0)];
  return [0, 0, 0];
}

function scalarAt(grid, x, y) {
  const value = grid?.[y]?.[x];
  if (value && typeof value === 'object') return Number(value.value ?? value.expectedValue ?? value.rewardValue ?? 0);
  return Number(value ?? 0);
}

function interpolateAxis(axis, value, boundary = 'clamp') {
  if (!Array.isArray(axis) || axis.length === 0) return { lower: 0, upper: 0, fraction: 0 };
  if (axis.length === 1) return { lower: 0, upper: 0, fraction: 0 };
  let nextValue = Number(value);
  const min = axis[0];
  const max = axis[axis.length - 1];
  if (boundary === 'periodic' && max > min) {
    const span = max - min;
    nextValue = ((((nextValue - min) % span) + span) % span) + min;
  } else {
    nextValue = Math.max(min, Math.min(max, nextValue));
  }
  for (let index = 0; index < axis.length - 1; index += 1) {
    if (nextValue >= axis[index] && nextValue <= axis[index + 1]) {
      const span = axis[index + 1] - axis[index];
      return { lower: index, upper: index + 1, fraction: span === 0 ? 0 : (nextValue - axis[index]) / span };
    }
  }
  return { lower: axis.length - 1, upper: axis.length - 1, fraction: 0 };
}

function sampleMask(mask, x, y) {
  const value = bilinear(mask.map((row) => row.map((item) => item ? 1 : 0)), x, y);
  return value >= 0.5;
}

function trilinearTimeScalar(values, t, z, y, x) {
  return lerp(
    trilinearScalar(values[t.lower], z, y, x),
    trilinearScalar(values[t.upper], z, y, x),
    t.fraction
  );
}

function trilinearTimeVector(values, t, z, y, x) {
  const a = trilinearVector(values[t.lower], z, y, x);
  const b = trilinearVector(values[t.upper], z, y, x);
  return [lerp(a[0], b[0], t.fraction), lerp(a[1], b[1], t.fraction), lerp(a[2], b[2], t.fraction)];
}

function trilinearScalar(valuesByDepth, z, y, x) {
  return lerp(bilinear(valuesByDepth[z.lower], x, y), bilinear(valuesByDepth[z.upper], x, y), z.fraction);
}

function trilinearVector(valuesByDepth, z, y, x) {
  const a = bilinearVector(valuesByDepth[z.lower], x, y);
  const b = bilinearVector(valuesByDepth[z.upper], x, y);
  return [lerp(a[0], b[0], z.fraction), lerp(a[1], b[1], z.fraction), lerp(a[2], b[2], z.fraction)];
}

function bilinearVector(grid, x, y) {
  return [0, 1, 2].map((component) => bilinear(grid.map((row) => row.map((value) => value[component] ?? 0)), x, y));
}

function bilinear(grid, x, y) {
  if (!Array.isArray(grid) || !grid.length) return 0;
  const a = Number(grid[y.lower]?.[x.lower] ?? 0);
  const b = Number(grid[y.lower]?.[x.upper] ?? a);
  const c = Number(grid[y.upper]?.[x.lower] ?? a);
  const d = Number(grid[y.upper]?.[x.upper] ?? c);
  return lerp(lerp(a, b, x.fraction), lerp(c, d, x.fraction), y.fraction);
}

function findHighScalarPoint(bundle) {
  const values = bundle.scalarFields?.[0]?.values?.[0]?.[0] ?? [];
  let best = null;
  for (let y = 0; y < values.length; y += 1) {
    for (let x = 0; x < (values[y] ?? []).length; x += 1) {
      if (!bundle.wetMask[y][x]) continue;
      if (!best || values[y][x] > best.value) best = { x, y, value: values[y][x] };
    }
  }
  return best ? { eastMeters: bundle.eastAxisMeters[best.x], northMeters: bundle.northAxisMeters[best.y] } : null;
}

function findLandPoint(bundle) {
  for (let y = 0; y < bundle.landMask.length; y += 1) {
    for (let x = 0; x < bundle.landMask[y].length; x += 1) {
      if (bundle.landMask[y][x]) return { eastMeters: bundle.eastAxisMeters[x], northMeters: bundle.northAxisMeters[y] };
    }
  }
  return null;
}

function midpoint(axis) {
  if (!axis.length) return 0;
  if (axis.length === 1) return axis[0];
  return (axis[0] + axis[axis.length - 1]) / 2;
}

function lerp(a, b, fraction) {
  return Number(a) + (Number(b) - Number(a)) * Number(fraction);
}

function sameShape(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => Number(value) === Number(expected[index]));
}

function isMonotonic(values) {
  return values.every((value, index) => index === 0 || Number(value) >= Number(values[index - 1]));
}

function digestWithoutSelf(value) {
  const clone = JSON.parse(JSON.stringify(value));
  delete clone.payloadDigest;
  delete clone.benchmarkBundleDigest;
  return stableDigest(clone);
}

function assertNoHiddenTruth(value) {
  const text = JSON.stringify(value);
  for (const marker of ['T_hiddenTruth', 'hiddenTruth', 'hiddenFields', 'rawOracleTensor', 'oracleState']) {
    if (text.includes(marker)) throw new Error(`Public benchmark bundle contains forbidden marker: ${marker}`);
  }
}

function round(value) {
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(12)) : 0;
}
