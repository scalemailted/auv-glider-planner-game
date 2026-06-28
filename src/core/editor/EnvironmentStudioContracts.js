import {
  canonicalJsonDigest,
  canonicalJsonStringify,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';

export const ENVIRONMENT_STUDIO_CONTRACT_VERSION = 'environment-studio-r0';

export const ENVIRONMENT_STUDIO_ARTIFACT_TYPES = Object.freeze({
  DOMAIN_SPEC: 'anchor.environment-studio.domain-spec',
  BATHYMETRY_ARCHETYPE_SPEC: 'anchor.environment-studio.bathymetry-archetype-spec',
  BATHYMETRY_TILE_MANIFEST: 'anchor.environment-studio.bathymetry-tile-manifest',
  TILE_MOSAIC_MANIFEST: 'anchor.environment-studio.tile-mosaic-manifest',
  DEPENDENCY_GRAPH: 'anchor.environment-studio.dependency-graph',
  VALIDATION_REPORT: 'anchor.environment-studio.validation-report'
});

export const ENVIRONMENT_STUDIO_STATUS = Object.freeze({
  PASS: 'PASS',
  WARN: 'WARN',
  FAIL: 'FAIL'
});

export const ENVIRONMENT_STUDIO_DEPENDENCY_STATE = Object.freeze({
  CURRENT: 'CURRENT',
  STALE: 'STALE',
  INVALID: 'INVALID',
  NOT_GENERATED: 'NOT_GENERATED',
  NEEDS_VALIDATION: 'NEEDS_VALIDATION',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  REQUIRES_REGENERATION: 'REQUIRES_REGENERATION',
  REQUIRES_COMPOSITION: 'REQUIRES_COMPOSITION'
});

export const ENVIRONMENT_STUDIO_LIMITS = Object.freeze({
  maxDomainCellCount: 65536,
  maxTileCellCount: 16384,
  maxTileCount: 256,
  maxEdgeProfilePoints: 2048,
  maxMosaicSeamDeltaMeters: 2
});

export const ENVIRONMENT_STUDIO_CLAIM_BOUNDARY = Object.freeze({
  synthetic: true,
  calibratedOceanProduct: false,
  operationalForecast: false,
  certifiedForNavigation: false,
  exposesHiddenTruth: false,
  warning: 'Environment Studio R0 artifacts are reproducible synthetic educational contracts, not calibrated ocean forecasts or certified navigation products.'
});

export const ENVIRONMENT_STUDIO_DEPENDENCY_NODES = Object.freeze([
  'domainSpec',
  'bathymetryArchetypeSpec',
  'bathymetryTiles',
  'tileMosaic',
  'bathymetryArtifact',
  'wetLandMask',
  'coastline',
  'currentArtifact',
  'scalarArtifact',
  'hotspots',
  'hazards',
  'startsDropZones',
  'benchmarkBundle',
  'environmentArtifact',
  'validationReport',
  'preview'
]);

const DEFAULT_DEPTH_LAYERS = Object.freeze([
  { id: 'surface', label: 'Surface', depthMeters: 0 },
  { id: 'shallow', label: 'Shallow', depthMeters: 10 },
  { id: 'thermocline', label: 'Thermocline', depthMeters: 35 },
  { id: 'midwater', label: 'Midwater', depthMeters: 75 },
  { id: 'deep', label: 'Deep', depthMeters: 150 }
]);

const HIDDEN_TRUTH_KEYS = Object.freeze([
  'T_hiddenTruth',
  'hiddenTruth',
  'hiddenTruthField',
  'hiddenTruthFields',
  'hiddenTruthGrid',
  'oracleTruth'
]);

export function normalizeEnvironmentStudioDomainSpec(input = {}) {
  const source = input.domainSpec ?? input.domain ?? input;
  const horizontal = source.horizontal ?? source.extentMeters ?? {};
  const vertical = source.vertical ?? {};
  const time = source.time ?? {};
  const widthMeters = positiveNumber(horizontal.widthMeters ?? horizontal.eastMeters ?? source.widthMeters, 80000);
  const heightMeters = positiveNumber(horizontal.heightMeters ?? horizontal.northMeters ?? source.heightMeters, 48000);
  const cellSizeMeters = positiveNumber(horizontal.cellSizeMeters ?? horizontal.resolutionMeters ?? source.cellSizeMeters, 1000);
  const columns = positiveInteger(horizontal.columns ?? source.columns, deriveGridCount(widthMeters, cellSizeMeters));
  const rows = positiveInteger(horizontal.rows ?? source.rows, deriveGridCount(heightMeters, cellSizeMeters));
  const maxDepthMeters = positiveNumber(vertical.maxDepthMeters ?? source.maxDepthMeters, 200);
  const durationSeconds = positiveNumber(time.durationSeconds ?? source.durationSeconds, 3600);
  const dtSeconds = positiveNumber(time.dtSeconds ?? source.dtSeconds, 300);
  const depthLayers = normalizeDepthLayers(vertical.depthLayers ?? source.depthLayers, maxDepthMeters);
  const domain = {
    type: ENVIRONMENT_STUDIO_ARTIFACT_TYPES.DOMAIN_SPEC,
    version: source.version ?? ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id: String(source.id ?? source.domainId ?? 'environment-studio-domain'),
    meta: {
      name: String(source.meta?.name ?? source.name ?? 'Environment Studio Domain'),
      description: String(source.meta?.description ?? source.description ?? 'Synthetic reproducible authoring domain.'),
      productHubPlacement: 'Simulation Lab / Environment Studio'
    },
    coordinateFrame: String(source.coordinateFrame ?? 'localEastNorthDown'),
    projectionLabel: String(source.projectionLabel ?? 'local tangent plane meters'),
    units: {
      horizontal: 'meters east/north',
      depth: 'meters positive down',
      time: 'seconds'
    },
    horizontal: {
      originEastMeters: finite(horizontal.originEastMeters ?? source.originEastMeters, 0),
      originNorthMeters: finite(horizontal.originNorthMeters ?? source.originNorthMeters, 0),
      widthMeters: round(widthMeters),
      heightMeters: round(heightMeters),
      cellSizeMeters: round(cellSizeMeters),
      columns,
      rows,
      cellCount: columns * rows,
      cellCountDerivation: 'floor(widthMeters / cellSizeMeters) + 1 and floor(heightMeters / cellSizeMeters) + 1 unless explicit rows/columns are supplied'
    },
    vertical: {
      minDepthMeters: Math.max(0, finite(vertical.minDepthMeters, 0)),
      maxDepthMeters: round(maxDepthMeters),
      positiveDown: true,
      depthLayers
    },
    time: {
      startSeconds: finite(time.startSeconds, 0),
      durationSeconds: round(durationSeconds),
      dtSeconds: round(dtSeconds),
      steps: deriveGridCount(durationSeconds, dtSeconds)
    },
    limits: {
      maxDomainCellCount: ENVIRONMENT_STUDIO_LIMITS.maxDomainCellCount
    },
    claimBoundary: normalizeStudioClaimBoundary(source.claimBoundary)
  };
  return withDigest(domain, 'domainSpecDigest');
}

export function validateEnvironmentStudioDomainSpec(input = {}) {
  const domain = normalizeEnvironmentStudioDomainSpec(input);
  const errors = [];
  const warnings = [];
  if (domain.type !== ENVIRONMENT_STUDIO_ARTIFACT_TYPES.DOMAIN_SPEC) errors.push('Domain spec type must be anchor.environment-studio.domain-spec.');
  if (domain.horizontal.widthMeters <= 0 || domain.horizontal.heightMeters <= 0) errors.push('Domain width and height must be positive.');
  if (domain.horizontal.cellSizeMeters <= 0) errors.push('Domain cell size must be positive.');
  if (domain.horizontal.cellCount > domain.limits.maxDomainCellCount) {
    errors.push(`Domain cell count ${domain.horizontal.cellCount} exceeds maxDomainCellCount ${domain.limits.maxDomainCellCount}.`);
  }
  if (domain.vertical.depthLayers.length < 2) warnings.push('Domain has fewer than two depth layers; 2.5D authoring will be limited.');
  if (domain.claimBoundary.calibratedOceanProduct || domain.claimBoundary.operationalForecast || domain.claimBoundary.certifiedForNavigation) {
    errors.push('Environment Studio R0 artifacts must not claim calibrated ocean, operational forecast, or certified navigation status.');
  }
  return createValidationResult({
    id: 'environment-studio-domain-spec',
    errors,
    warnings,
    checks: [
      check('domain-grid-positive', errors.length === 0 || domain.horizontal.cellCount > 0),
      check('domain-cell-count-limit', domain.horizontal.cellCount <= domain.limits.maxDomainCellCount),
      check('domain-claim-boundary', !domain.claimBoundary.calibratedOceanProduct && !domain.claimBoundary.operationalForecast && !domain.claimBoundary.certifiedForNavigation)
    ]
  });
}

export function normalizeBathymetryArchetypeSpec(input = {}) {
  const source = input.archetypeSpec ?? input.archetype ?? input;
  const domainSpec = source.domainSpec ? normalizeEnvironmentStudioDomainSpec(source.domainSpec) : null;
  const spec = {
    type: ENVIRONMENT_STUDIO_ARTIFACT_TYPES.BATHYMETRY_ARCHETYPE_SPEC,
    version: source.version ?? ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id: String(source.id ?? source.archetypeId ?? 'coastalShelf'),
    label: String(source.label ?? source.name ?? 'Coastal shelf'),
    domainSpecDigest: String(source.domainSpecDigest ?? domainSpec?.domainSpecDigest ?? 'unbound-domain'),
    archetypeFamily: String(source.archetypeFamily ?? source.family ?? 'syntheticBathymetry'),
    parameters: normalizeFiniteRecord(source.parameters ?? source.generatorParameters ?? {
      shelfSlope: 0.02,
      canyonStrength: 0,
      roughness: 0.1,
      islandRadiusMeters: 0
    }),
    editableTileSeedPolicy: String(source.editableTileSeedPolicy ?? 'stable-seed-per-tile'),
    provenance: normalizeEditProvenance(source.provenance ?? {
      source: 'environment-studio-r0-contract',
      operations: []
    }),
    dependencyInputs: ['domainSpec'],
    claimBoundary: normalizeStudioClaimBoundary(source.claimBoundary)
  };
  return withDigest(spec, 'archetypeSpecDigest');
}

export function normalizeBathymetryTileManifest(input = {}) {
  const source = input.tileManifest ?? input.tile ?? input;
  const columns = positiveInteger(source.columns ?? source.cells?.columns ?? source.width ?? source.resolution?.eastCount, 17);
  const rows = positiveInteger(source.rows ?? source.cells?.rows ?? source.height ?? source.resolution?.northCount, 17);
  const edgeProfiles = normalizeEdgeProfiles(source.edgeProfiles, rows, columns);
  const tile = {
    type: ENVIRONMENT_STUDIO_ARTIFACT_TYPES.BATHYMETRY_TILE_MANIFEST,
    version: source.version ?? ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id: String(source.id ?? source.tileId ?? 'bathymetry-tile'),
    domainSpecDigest: String(source.domainSpecDigest ?? 'unbound-domain'),
    archetypeSpecDigest: String(source.archetypeSpecDigest ?? 'unbound-archetype'),
    tileCoordinate: {
      row: nonnegativeInteger(source.tileCoordinate?.row ?? source.tileRow ?? source.row, 0),
      column: nonnegativeInteger(source.tileCoordinate?.column ?? source.tileColumn ?? source.column, 0)
    },
    physicalExtentMeters: {
      east: positiveNumber(source.physicalExtentMeters?.east ?? source.eastMeters, columns - 1),
      north: positiveNumber(source.physicalExtentMeters?.north ?? source.northMeters, rows - 1)
    },
    cells: {
      rows,
      columns,
      cellCount: rows * columns
    },
    depthConvention: 'bottomDepthMeters positive down; zero is land or dry cell',
    bathymetrySource: {
      mode: String(source.bathymetrySource?.mode ?? source.sourceMode ?? 'archetypeGenerated'),
      publicVisibility: String(source.bathymetrySource?.publicVisibility ?? source.publicVisibility ?? 'publicScenario'),
      containsHiddenTruth: source.bathymetrySource?.containsHiddenTruth === true || source.containsHiddenTruth === true
    },
    edgeProfiles,
    edgeProfileDigest: canonicalJsonDigest(edgeProfiles),
    editProvenance: normalizeEditProvenance(source.editProvenance ?? source.provenance),
    limits: {
      maxTileCellCount: ENVIRONMENT_STUDIO_LIMITS.maxTileCellCount,
      maxEdgeProfilePoints: ENVIRONMENT_STUDIO_LIMITS.maxEdgeProfilePoints
    },
    claimBoundary: normalizeStudioClaimBoundary(source.claimBoundary)
  };
  return withDigest(tile, 'tileDigest');
}

export function validateBathymetryTileManifest(input = {}) {
  const tile = normalizeBathymetryTileManifest(input);
  const edgeReport = validateEdgeProfiles(tile.edgeProfiles, { rows: tile.cells.rows, columns: tile.cells.columns });
  const hiddenReport = validateNoHiddenTruth(tile);
  const errors = [
    ...(tile.cells.cellCount > tile.limits.maxTileCellCount ? [`Tile cell count ${tile.cells.cellCount} exceeds maxTileCellCount ${tile.limits.maxTileCellCount}.`] : []),
    ...edgeReport.errors,
    ...hiddenReport.errors
  ];
  const warnings = [...edgeReport.warnings, ...hiddenReport.warnings];
  return createValidationResult({
    id: 'environment-studio-bathymetry-tile-manifest',
    errors,
    warnings,
    checks: [
      check('tile-cell-count-limit', tile.cells.cellCount <= tile.limits.maxTileCellCount),
      check('tile-edge-profiles-valid', edgeReport.valid),
      check('tile-public-visibility', tile.bathymetrySource.publicVisibility !== 'hidden'),
      check('tile-no-hidden-truth', hiddenReport.valid)
    ]
  });
}

export function normalizeTileMosaicManifest(input = {}) {
  const source = input.mosaicManifest ?? input.mosaic ?? input;
  const tileGrid = source.tileGrid ?? {};
  const tiles = normalizeMosaicTiles(source.tiles ?? source.tileManifests);
  const mosaic = {
    type: ENVIRONMENT_STUDIO_ARTIFACT_TYPES.TILE_MOSAIC_MANIFEST,
    version: source.version ?? ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id: String(source.id ?? source.mosaicId ?? 'environment-studio-mosaic'),
    domainSpecDigest: String(source.domainSpecDigest ?? 'unbound-domain'),
    tileGrid: {
      rows: positiveInteger(tileGrid.rows ?? source.tileRows, Math.max(1, maxBy(tiles, 'tileRow') + 1)),
      columns: positiveInteger(tileGrid.columns ?? source.tileColumns, Math.max(1, maxBy(tiles, 'tileColumn') + 1)),
      tileCount: tiles.length
    },
    tiles,
    seamPolicy: {
      maxDepthDeltaMeters: positiveNumber(source.seamPolicy?.maxDepthDeltaMeters, ENVIRONMENT_STUDIO_LIMITS.maxMosaicSeamDeltaMeters),
      requireWetMaskContinuity: source.seamPolicy?.requireWetMaskContinuity !== false
    },
    editProvenance: normalizeEditProvenance(source.editProvenance ?? source.provenance),
    limits: {
      maxTileCount: ENVIRONMENT_STUDIO_LIMITS.maxTileCount
    },
    claimBoundary: normalizeStudioClaimBoundary(source.claimBoundary)
  };
  return withDigest(mosaic, 'mosaicDigest');
}

export function validateTileMosaicManifest(input = {}) {
  const mosaic = normalizeTileMosaicManifest(input);
  const errors = [];
  const warnings = [];
  const seenPositions = new Set();
  if (mosaic.tiles.length > mosaic.limits.maxTileCount) errors.push(`Mosaic tile count ${mosaic.tiles.length} exceeds maxTileCount ${mosaic.limits.maxTileCount}.`);
  for (const tile of mosaic.tiles) {
    const key = `${tile.tileRow}:${tile.tileColumn}`;
    if (seenPositions.has(key)) errors.push(`Duplicate tile position ${key}.`);
    seenPositions.add(key);
    if (tile.tileRow >= mosaic.tileGrid.rows || tile.tileColumn >= mosaic.tileGrid.columns) errors.push(`Tile ${tile.tileId} is outside the declared tileGrid.`);
    if (!tile.tileDigest) errors.push(`Tile ${tile.tileId} requires tileDigest.`);
  }
  const hiddenReport = validateNoHiddenTruth(mosaic);
  errors.push(...hiddenReport.errors);
  warnings.push(...hiddenReport.warnings);
  return createValidationResult({
    id: 'environment-studio-tile-mosaic-manifest',
    errors,
    warnings,
    checks: [
      check('mosaic-tile-count-limit', mosaic.tiles.length <= mosaic.limits.maxTileCount),
      check('mosaic-unique-tile-positions', seenPositions.size === mosaic.tiles.length),
      check('mosaic-no-hidden-truth', hiddenReport.valid)
    ]
  });
}

export function validateEdgeProfiles(edgeProfiles = {}, options = {}) {
  const rows = positiveInteger(options.rows, 1);
  const columns = positiveInteger(options.columns, 1);
  const errors = [];
  const warnings = [];
  const normalized = normalizeEdgeProfiles(edgeProfiles, rows, columns);
  for (const [edgeId, expectedLength] of [['top', columns], ['bottom', columns], ['left', rows], ['right', rows]]) {
    const values = normalized[edgeId];
    const rawLength = rawProfileLength(edgeProfiles?.[edgeId]);
    if (rawLength !== null && rawLength !== expectedLength) errors.push(`${edgeId} edge profile length ${rawLength} must equal ${expectedLength}.`);
    if (values.length !== expectedLength) errors.push(`${edgeId} edge profile normalized length ${values.length} must equal ${expectedLength}.`);
    if (values.length > ENVIRONMENT_STUDIO_LIMITS.maxEdgeProfilePoints) errors.push(`${edgeId} edge profile exceeds maxEdgeProfilePoints.`);
    if (!values.every(Number.isFinite)) errors.push(`${edgeId} edge profile contains a non-finite value.`);
  }
  if (!edgeProfiles || Object.keys(edgeProfiles).length === 0) warnings.push('No explicit edge profiles supplied; flat zero-depth edge profiles were synthesized for validation.');
  return createValidationResult({
    id: 'environment-studio-edge-profiles',
    errors,
    warnings,
    checks: [
      check('edge-profile-shape', errors.length === 0),
      check('edge-profile-finite', Object.values(normalized).flat().every(Number.isFinite))
    ]
  });
}

export function validateTileSeams(input = {}) {
  const source = input.mosaicManifest ?? input.mosaic ?? input;
  const policy = {
    maxDepthDeltaMeters: positiveNumber(source.seamPolicy?.maxDepthDeltaMeters ?? input.maxDepthDeltaMeters, ENVIRONMENT_STUDIO_LIMITS.maxMosaicSeamDeltaMeters),
    requireWetMaskContinuity: source.seamPolicy?.requireWetMaskContinuity !== false
  };
  const tileManifests = (source.tileManifests ?? input.tileManifests ?? input.tiles ?? []).map(normalizeBathymetryTileManifest);
  const byPosition = new Map(tileManifests.map((tile) => [`${tile.tileCoordinate.row}:${tile.tileCoordinate.column}`, tile]));
  const seamChecks = [];
  const errors = [];
  const warnings = [];
  for (const tile of tileManifests) {
    const right = byPosition.get(`${tile.tileCoordinate.row}:${tile.tileCoordinate.column + 1}`);
    if (right) seamChecks.push(compareProfiles(tile.id, right.id, 'right-left', tile.edgeProfiles.right, right.edgeProfiles.left, policy.maxDepthDeltaMeters));
    const bottom = byPosition.get(`${tile.tileCoordinate.row + 1}:${tile.tileCoordinate.column}`);
    if (bottom) seamChecks.push(compareProfiles(tile.id, bottom.id, 'bottom-top', tile.edgeProfiles.bottom, bottom.edgeProfiles.top, policy.maxDepthDeltaMeters));
  }
  for (const seam of seamChecks) {
    if (!seam.passed) errors.push(`Seam ${seam.fromTileId} ${seam.edgePair} ${seam.toTileId} exceeds maxDepthDeltaMeters ${policy.maxDepthDeltaMeters}.`);
  }
  if (!seamChecks.length && tileManifests.length > 1) warnings.push('No adjacent tile seams were found to validate.');
  if (!tileManifests.length) warnings.push('No tile manifests supplied for seam validation.');
  const report = createValidationResult({
    id: 'environment-studio-tile-seams',
    errors,
    warnings,
    checks: seamChecks.map((seam) => check(`seam-${seam.fromTileId}-${seam.edgePair}-${seam.toTileId}`, seam.passed, seam))
  });
  return {
    ...report,
    seamPolicy: policy,
    seamCount: seamChecks.length,
    seams: seamChecks,
    seamDigest: canonicalJsonDigest({ policy, seamChecks })
  };
}

export function createEnvironmentStudioDependencyGraph(input = {}) {
  const source = input.dependencyGraph ?? input;
  const nodes = {};
  for (const nodeId of ENVIRONMENT_STUDIO_DEPENDENCY_NODES) {
    nodes[nodeId] = normalizeDependencyNode(nodeId, source.nodes?.[nodeId] ?? source[nodeId]);
  }
  const graph = {
    type: ENVIRONMENT_STUDIO_ARTIFACT_TYPES.DEPENDENCY_GRAPH,
    version: source.version ?? ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id: String(source.id ?? 'environment-studio-dependency-graph'),
    nodes,
    edges: source.edges ?? [
      ['domainSpec', 'bathymetryArchetypeSpec'],
      ['bathymetryArchetypeSpec', 'bathymetryTiles'],
      ['bathymetryTiles', 'tileMosaic'],
      ['tileMosaic', 'bathymetryArtifact'],
      ['bathymetryArtifact', 'wetLandMask'],
      ['bathymetryArtifact', 'coastline'],
      ['bathymetryArtifact', 'currentArtifact'],
      ['bathymetryArtifact', 'scalarArtifact'],
      ['bathymetryArtifact', 'hotspots'],
      ['bathymetryArtifact', 'startsDropZones'],
      ['currentArtifact', 'environmentArtifact'],
      ['scalarArtifact', 'environmentArtifact'],
      ['hotspots', 'benchmarkBundle'],
      ['startsDropZones', 'benchmarkBundle'],
      ['environmentArtifact', 'validationReport'],
      ['environmentArtifact', 'preview']
    ],
    transitionLog: Array.isArray(source.transitionLog) ? source.transitionLog.map(String) : [],
    claimBoundary: normalizeStudioClaimBoundary(source.claimBoundary)
  };
  return withDigest(graph, 'dependencyGraphDigest');
}

export function reduceEnvironmentStudioDependencyGraph(graphInput = {}, action = {}) {
  const graph = createEnvironmentStudioDependencyGraph(graphInput);
  const next = cloneJson(graph);
  const type = String(action.type ?? action.changeType ?? '').toUpperCase();
  if (type === 'DOMAIN_CHANGED') {
    setNodeState(next, 'domainSpec', ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
    for (const nodeId of ENVIRONMENT_STUDIO_DEPENDENCY_NODES.filter((id) => id !== 'domainSpec')) {
      setNodeState(next, nodeId, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION);
    }
  } else if (type === 'BATHYMETRY_EDITED') {
    setNodeState(next, 'bathymetryTiles', ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
    for (const nodeId of ['tileMosaic', 'bathymetryArtifact', 'wetLandMask', 'coastline', 'currentArtifact', 'scalarArtifact', 'hotspots', 'startsDropZones', 'benchmarkBundle', 'environmentArtifact', 'validationReport', 'preview']) {
      setNodeState(next, nodeId, nodeId === 'tileMosaic' ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.STALE : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.REQUIRES_REGENERATION);
    }
  } else if (type === 'MOSAIC_VALIDATED') {
    setNodeState(next, 'tileMosaic', ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
    setNodeState(next, 'validationReport', ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
  } else if (type === 'ARTIFACT_REGENERATED') {
    const target = String(action.target ?? action.nodeId ?? '');
    if (next.nodes[target]) setNodeState(next, target, ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT);
  } else if (type === 'VALIDATION_FAILED') {
    setNodeState(next, String(action.target ?? 'validationReport'), ENVIRONMENT_STUDIO_DEPENDENCY_STATE.INVALID);
  }
  next.transitionLog = [...next.transitionLog, type || 'NOOP'];
  delete next.dependencyGraphDigest;
  return withDigest(next, 'dependencyGraphDigest');
}

export function markEnvironmentStudioDependencyChange(graphInput = {}, changeType = '', options = {}) {
  return reduceEnvironmentStudioDependencyGraph(graphInput, { type: changeType, ...options });
}

export function buildEnvironmentStudioValidationReport(input = {}) {
  const checks = [];
  const errors = [...stringList(input.errors)];
  const warnings = [...stringList(input.warnings)];
  if (input.domainSpec) appendReport(checks, errors, warnings, validateEnvironmentStudioDomainSpec(input.domainSpec));
  for (const tile of input.tileManifests ?? input.tiles ?? []) appendReport(checks, errors, warnings, validateBathymetryTileManifest(tile));
  if (input.mosaicManifest ?? input.mosaic) appendReport(checks, errors, warnings, validateTileMosaicManifest(input.mosaicManifest ?? input.mosaic));
  if (input.seamReport) appendReport(checks, errors, warnings, input.seamReport);
  if (input.dependencyGraph) {
    const graph = createEnvironmentStudioDependencyGraph(input.dependencyGraph);
    checks.push(check('dependency-graph-shape', graph.edges.length > 0, { nodeCount: Object.keys(graph.nodes).length }));
  }
  const hiddenReport = validateNoHiddenTruth(input.publicArtifacts ?? input);
  appendReport(checks, errors, warnings, hiddenReport);
  const codecReport = validateCodecFriendlyJson(input.publicArtifacts ?? input);
  appendReport(checks, errors, warnings, codecReport);
  const report = {
    type: ENVIRONMENT_STUDIO_ARTIFACT_TYPES.VALIDATION_REPORT,
    version: ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id: String(input.id ?? 'environment-studio-validation-report'),
    valid: errors.length === 0,
    status: errors.length ? ENVIRONMENT_STUDIO_STATUS.FAIL : warnings.length ? ENVIRONMENT_STUDIO_STATUS.WARN : ENVIRONMENT_STUDIO_STATUS.PASS,
    errors,
    warnings,
    checks,
    summary: {
      checkCount: checks.length,
      failedCheckCount: checks.filter((entry) => entry.passed === false).length,
      warningCount: warnings.length,
      hiddenTruthIncluded: false,
      codecFriendlyJson: codecReport.valid
    },
    claimBoundary: normalizeStudioClaimBoundary(input.claimBoundary)
  };
  return withDigest(report, 'validationReportDigest');
}

export function validateNoHiddenTruth(input = {}) {
  const hits = [];
  scanHiddenTruth(input, '$', hits);
  return createValidationResult({
    id: 'environment-studio-no-hidden-truth',
    errors: hits.map((hit) => `Hidden-truth field is not allowed in Environment Studio public contracts at ${hit.path}.`),
    warnings: [],
    checks: [check('no-hidden-truth', hits.length === 0, { hitCount: hits.length })]
  });
}

export function validateCodecFriendlyJson(input = {}) {
  const errors = [];
  const warnings = [];
  let digest = null;
  try {
    const normalized = canonicalizeJsonValue(input);
    const text = canonicalJsonStringify(normalized);
    JSON.parse(text);
    digest = canonicalJsonDigest(normalized);
  } catch (error) {
    errors.push(`Artifact is not codec-friendly canonical JSON: ${error.message}`);
  }
  const report = createValidationResult({
    id: 'environment-studio-codec-friendly-json',
    errors,
    warnings,
    checks: [check('codec-friendly-json', errors.length === 0, { digest })]
  });
  return { ...report, digest };
}

function normalizeDepthLayers(value, maxDepthMeters) {
  const list = Array.isArray(value) && value.length ? value : DEFAULT_DEPTH_LAYERS;
  const layers = list.map((entry, index) => ({
    id: String(entry.id ?? `layer-${index}`),
    label: String(entry.label ?? entry.id ?? `Layer ${index}`),
    depthMeters: Math.max(0, Math.min(round(finite(entry.depthMeters ?? entry.depth ?? index, index)), maxDepthMeters))
  }));
  return layers.sort((a, b) => a.depthMeters - b.depthMeters);
}

function normalizeEdgeProfiles(value = {}, rows = 1, columns = 1) {
  return {
    top: normalizeProfile(value.top, columns),
    bottom: normalizeProfile(value.bottom, columns),
    left: normalizeProfile(value.left, rows),
    right: normalizeProfile(value.right, rows)
  };
}

function normalizeProfile(value, length) {
  const source = Array.isArray(value) ? value : Array.from({ length }, () => 0);
  const normalized = source.slice(0, length).map((entry) => round(finite(entry, 0)));
  while (normalized.length < length) normalized.push(0);
  return normalized;
}

function rawProfileLength(value) {
  return Array.isArray(value) ? value.length : null;
}

function normalizeMosaicTiles(value = []) {
  return (Array.isArray(value) ? value : []).map((entry) => {
    const tile = entry.type === ENVIRONMENT_STUDIO_ARTIFACT_TYPES.BATHYMETRY_TILE_MANIFEST
      ? normalizeBathymetryTileManifest(entry)
      : entry;
    return {
      tileId: String(tile.tileId ?? tile.id ?? 'tile'),
      tileDigest: String(tile.tileDigest ?? tile.digest ?? ''),
      edgeProfileDigest: String(tile.edgeProfileDigest ?? ''),
      tileRow: nonnegativeInteger(tile.tileRow ?? tile.tileCoordinate?.row, 0),
      tileColumn: nonnegativeInteger(tile.tileColumn ?? tile.tileCoordinate?.column, 0),
      cellRows: positiveInteger(tile.cellRows ?? tile.cells?.rows, 1),
      cellColumns: positiveInteger(tile.cellColumns ?? tile.cells?.columns, 1)
    };
  });
}

function normalizeEditProvenance(value = {}) {
  return {
    source: String(value.source ?? 'environment-studio'),
    deterministicSeed: value.deterministicSeed == null ? null : String(value.deterministicSeed),
    operations: (Array.isArray(value.operations) ? value.operations : []).map((operation, index) => ({
      id: String(operation.id ?? `operation-${index}`),
      type: String(operation.type ?? 'metadata'),
      target: String(operation.target ?? 'environment'),
      timestampPolicy: String(operation.timestampPolicy ?? 'deterministic-step-index')
    })),
    notes: stringList(value.notes)
  };
}

function normalizeStudioClaimBoundary(value = {}) {
  return {
    ...ENVIRONMENT_STUDIO_CLAIM_BOUNDARY,
    synthetic: value.synthetic !== false,
    calibratedOceanProduct: value.calibratedOceanProduct === true ? false : false,
    operationalForecast: value.operationalForecast === true ? false : false,
    certifiedForNavigation: value.certifiedForNavigation === true ? false : false,
    exposesHiddenTruth: value.exposesHiddenTruth === true ? false : false,
    warning: String(value.warning ?? ENVIRONMENT_STUDIO_CLAIM_BOUNDARY.warning)
  };
}

function normalizeFiniteRecord(value = {}) {
  const record = {};
  for (const [key, entry] of Object.entries(value || {})) record[key] = round(finite(entry, 0));
  return record;
}

function normalizeDependencyNode(nodeId, value = {}) {
  const state = Object.values(ENVIRONMENT_STUDIO_DEPENDENCY_STATE).includes(value?.state)
    ? value.state
    : nodeId === 'domainSpec'
      ? ENVIRONMENT_STUDIO_DEPENDENCY_STATE.CURRENT
      : ENVIRONMENT_STUDIO_DEPENDENCY_STATE.NOT_GENERATED;
  return {
    id: nodeId,
    state,
    artifactDigest: value?.artifactDigest ?? null,
    reason: value?.reason == null ? null : String(value.reason)
  };
}

function setNodeState(graph, nodeId, state) {
  if (!graph.nodes[nodeId]) return;
  graph.nodes[nodeId] = { ...graph.nodes[nodeId], state };
}

function compareProfiles(fromTileId, toTileId, edgePair, a = [], b = [], maxDepthDeltaMeters = 0) {
  const length = Math.min(a.length, b.length);
  let maxDeltaMeters = 0;
  for (let index = 0; index < length; index += 1) {
    maxDeltaMeters = Math.max(maxDeltaMeters, Math.abs(finite(a[index], 0) - finite(b[index], 0)));
  }
  return {
    fromTileId,
    toTileId,
    edgePair,
    comparedPointCount: length,
    maxDeltaMeters: round(maxDeltaMeters),
    passed: maxDeltaMeters <= maxDepthDeltaMeters
  };
}

function scanHiddenTruth(value, path, hits, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, entry] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (HIDDEN_TRUTH_KEYS.includes(key)) hits.push({ path: nextPath, key });
    if (/hiddenTruth/i.test(key) && entry !== false && entry != null) hits.push({ path: nextPath, key });
    if ((key === 'visibilityTier' || key === 'publicVisibility') && String(entry).toLowerCase() === 'hidden') hits.push({ path: nextPath, key });
    scanHiddenTruth(entry, nextPath, hits, seen);
  }
  seen.delete(value);
}

function appendReport(checks, errors, warnings, report) {
  checks.push(...(report.checks ?? []));
  errors.push(...(report.errors ?? []));
  warnings.push(...(report.warnings ?? []));
}

function createValidationResult({ id, errors = [], warnings = [], checks = [] }) {
  return {
    type: 'anchor.environment-studio.validation-result',
    version: ENVIRONMENT_STUDIO_CONTRACT_VERSION,
    id,
    valid: errors.length === 0,
    status: errors.length ? ENVIRONMENT_STUDIO_STATUS.FAIL : warnings.length ? ENVIRONMENT_STUDIO_STATUS.WARN : ENVIRONMENT_STUDIO_STATUS.PASS,
    errors,
    warnings,
    checks,
    digest: canonicalJsonDigest({ id, errors, warnings, checks })
  };
}

function check(id, passed, details = {}) {
  return {
    id,
    passed: passed === true,
    details
  };
}

function withDigest(value, digestKey) {
  const payload = { ...value };
  delete payload[digestKey];
  return {
    ...value,
    [digestKey]: canonicalJsonDigest(payload)
  };
}

function cloneJson(value) {
  return canonicalizeJsonValue(value);
}

function stringList(value) {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonnegativeInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

function deriveGridCount(spanMeters, spacingMeters) {
  return Math.floor(positiveNumber(spanMeters, 1) / positiveNumber(spacingMeters, 1)) + 1;
}

function maxBy(values = [], key) {
  let max = -1;
  for (const value of values) max = Math.max(max, nonnegativeInteger(value[key], 0));
  return max;
}
