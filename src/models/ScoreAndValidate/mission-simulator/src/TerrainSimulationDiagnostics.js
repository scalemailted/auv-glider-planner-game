const MissionSimulationUtil = require('./MissionSimulationUtil.js')
const TERRAIN_SIMULATION_DIAGNOSTICS_VERSION = 'terrain-simulation-diagnostics-three-r1-2c-1';

 const TERRAIN_SIMULATION_EVENT_TYPES = Object.freeze({
  clearanceWarning: 'anchor.simulation.terrain-clearance-warning',
  clearanceViolation: 'anchor.simulation.terrain-clearance-violation',
  terrainLimit: 'anchor.simulation.terrain-limit',
  coastlineRisk: 'anchor.simulation.coastline-risk',
  targetCoverage: 'anchor.simulation.target-coverage'
});

 function createTerrainSimulationDiagnostics(options = {}) {
  const mission = options.mission ?? {};
  const level = options.level ?? {};
  const minimumBottomClearanceMeters = finitePositive(
    mission.physics?.minimumBottomClearanceMeters ?? mission.physics?.bottomClearanceMeters,
    5
  );
  return {
    type: 'anchor.simulation.terrain-diagnostics',
    version: TERRAIN_SIMULATION_DIAGNOSTICS_VERSION,
    missionId: mission.missionId ?? mission.id ?? level.missionId ?? null,
    scenarioId: level.levelId ?? level.scenarioId ?? null,
    planDigest: options.planDigest ?? null,
    terrainSourceDigest: terrainSourceDigest(level),
    thresholds: {
      minimumBottomClearanceMeters: round(minimumBottomClearanceMeters),
      lowClearanceWarningMeters: round(finitePositive(options.lowClearanceWarningMeters, minimumBottomClearanceMeters * 2)),
      coastlineRiskClearanceMeters: round(finitePositive(options.coastlineRiskClearanceMeters, minimumBottomClearanceMeters * 1.25))
    },
    mission: createMetrics(),
    agents: {},
    segments: {},
    events: [],
    eventSummary: createTerrainEventSummary(),
    activeConditions: {},
    counters: {
      updateCount: 0,
      incrementalTerrainDiagnosticsUpdateCount: 0,
      fullTerrainDiagnosticsRebuildCount: 0,
      trajectoryPointsScannedDuringLastUpdate: 0,
      eventsScannedDuringLastUpdate: 0,
      observationCount: 0,
      surfacingCount: 0,
      terrainEventCreateCount: 0,
      terrainEventDuplicateSuppressionCount: 0,
      terrainEventActiveConditionCount: 0,
      terrainEventSummaryIncrementCount: 0,
      terrainEventSummaryFullRebuildCount: 0
    },
    actualTargetCoverage: {
      observationCount: 0,
      byAgent: {},
      byDepthLayer: {}
    },
    terrainRelatedTerminalReason: null,
    boundaryFlags: {
      generatedFromVisualInterpolation: false,
      rendererOwned: false,
      changesOfficialScoring: false,
      usesHiddenTruth: false
    }
  };
}

 function updateTerrainSimulationDiagnostics(diagnostics, canonicalSnapshot = {}, context = {}) {
  if (!diagnostics) return { diagnostics, events: [] };
  const x = finiteOrNull(canonicalSnapshot.x);
  const y = finiteOrNull(canonicalSnapshot.y);
  if (x === null || y === null) return { diagnostics, events: [] };
  const timeSeconds = finiteOrNull(canonicalSnapshot.timeSeconds ?? canonicalSnapshot.t ?? context.timeSeconds) ?? 0;
  const tick = Math.max(0, Math.trunc(finite(canonicalSnapshot.tick ?? context.tick, 0)));
  const depthMeters = Math.max(0, finite(canonicalSnapshot.depthMeters, 0));
  const bottomDepthMeters = sampleBottomDepthMeters(context.level, x, y, canonicalSnapshot.bottomDepthMeters);
  const clearanceMeters = Number.isFinite(bottomDepthMeters) ? bottomDepthMeters - depthMeters : null;
  const agentId = canonicalSnapshot.agentId ?? context.agentId ?? 'agent';
  const segmentIndex = finiteOrNull(canonicalSnapshot.segmentIndex ?? canonicalSnapshot.waypointIndex ?? context.segmentIndex);
  const segmentId = canonicalSnapshot.segmentId ?? (segmentIndex === null ? null : `${agentId}-segment-${segmentIndex}`);
  const sample = {
    agentId,
    segmentId,
    segmentIndex,
    tick,
    timeSeconds,
    position: { x: round(x), y: round(y), depthMeters: round(depthMeters) },
    bottomDepthMeters: Number.isFinite(bottomDepthMeters) ? round(bottomDepthMeters) : null,
    clearanceMeters: clearanceMeters === null ? null : round(clearanceMeters),
    depthLayerId: canonicalSnapshot.depthLayerId ?? null,
    divePhase: canonicalSnapshot.divePhase ?? null,
    source: 'canonicalSimulation'
  };

  diagnostics.counters.updateCount += 1;
  diagnostics.counters.incrementalTerrainDiagnosticsUpdateCount += 1;
  diagnostics.counters.trajectoryPointsScannedDuringLastUpdate = 1;
  diagnostics.counters.eventsScannedDuringLastUpdate = 0;
  updateMetrics(diagnostics.mission, sample);
  const agentMetrics = ensureMetrics(diagnostics.agents, agentId);
  updateMetrics(agentMetrics, sample);
  if (segmentId) updateMetrics(ensureMetrics(diagnostics.segments, segmentId, { agentId, segmentIndex }), sample);

  const events = terrainEventsForSample(diagnostics, sample, context);
  for (const event of events) appendTerrainEvent(diagnostics, event);
  diagnostics.counters.terrainEventActiveConditionCount = Object.values(diagnostics.activeConditions).filter(Boolean).length;
  return { diagnostics, events };
}

 function recordTerrainSimulationObservation(diagnostics, observation = {}, context = {}) {
  if (!diagnostics || !observation) return { diagnostics, events: [] };
  diagnostics.counters.observationCount += 1;
  diagnostics.counters.eventsScannedDuringLastUpdate = 0;
  const agentId = observation.agentId ?? context.agentId ?? 'agent';
  const layerId = observation.depthLayerId ?? observation.depthLayer ?? 'surface';
  diagnostics.actualTargetCoverage.observationCount += 1;
  diagnostics.actualTargetCoverage.byAgent[agentId] = (diagnostics.actualTargetCoverage.byAgent[agentId] ?? 0) + 1;
  diagnostics.actualTargetCoverage.byDepthLayer[layerId] = (diagnostics.actualTargetCoverage.byDepthLayer[layerId] ?? 0) + 1;
  const event = createTerrainSimulationEvent({
    diagnostics,
    type: TERRAIN_SIMULATION_EVENT_TYPES.targetCoverage,
    issueCode: 'TARGET_COVERAGE',
    severity: 'ADVISORY',
    agentId,
    targetId: observation.targetId ?? observation.sampleId ?? null,
    tick: context.tick,
    timeSeconds: observation.t ?? observation.timeSeconds ?? context.timeSeconds,
    position: {
      x: observation.x,
      y: observation.y,
      depthMeters: observation.depthMeters ?? 0
    },
    bottomDepthMeters: observation.bottomDepthMeters ?? null,
    clearanceMeters: observation.bottomClearanceMeters ?? null,
    dedupeScope: 'observation'
  });
  appendTerrainEvent(diagnostics, event);
  diagnostics.counters.terrainEventCreateCount += 1;
  return { diagnostics, events: [event] };
}

 function recordTerrainSimulationSurfacing(diagnostics, event = {}, context = {}) {
  if (!diagnostics) return diagnostics;
  diagnostics.counters.surfacingCount += 1;
  return diagnostics;
}

 function finalizeTerrainSimulationDiagnostics(diagnostics, context = {}) {
  if (!diagnostics) return null;
  diagnostics.terrainRelatedTerminalReason = context.terminalReason ?? diagnostics.terrainRelatedTerminalReason ?? null;
  diagnostics.finalized = true;
  diagnostics.summary = terrainSimulationDiagnosticsSummary(diagnostics);
  return diagnostics;
}

 function terrainSimulationDiagnosticsSummary(diagnostics = {}) {
  const mission = diagnostics.mission ?? {};
  const agents = Object.entries(diagnostics.agents ?? {}).map(([agentId, metrics]) => compactMetrics({ agentId, ...metrics }));
  const segments = Object.entries(diagnostics.segments ?? {}).map(([segmentId, metrics]) => compactMetrics({ segmentId, ...metrics }));
  const eventSummary = terrainEventSummarySnapshot(diagnostics);
  const eventTypes = eventSummary.eventTypeCounts;
  return {
    type: 'anchor.simulation.terrain-diagnostics-summary',
    version: diagnostics.version ?? TERRAIN_SIMULATION_DIAGNOSTICS_VERSION,
    terrainEventsSupported: true,
    missionId: diagnostics.missionId ?? null,
    scenarioId: diagnostics.scenarioId ?? null,
    terrainSourceDigest: diagnostics.terrainSourceDigest ?? null,
    minimumActualClearanceMeters: finiteOrNull(mission.minimumActualClearanceMeters),
    minimumActualClearancePosition: mission.minimumActualClearancePosition ?? null,
    minimumActualClearanceTimeSeconds: finiteOrNull(mission.minimumActualClearanceTimeSeconds),
    maximumActualDepthMeters: finiteOrNull(mission.maximumActualDepthMeters) ?? 0,
    actualBottomTurnCount: Number(mission.actualBottomTurnCount ?? 0),
    actualLayerCrossingCount: Number(mission.actualLayerCrossingCount ?? 0),
    terrainLimitedDiveCount: Number(mission.terrainLimitedDiveCount ?? 0),
    lowClearanceEventCount: Number(mission.lowClearanceEventCount ?? 0),
    clearanceViolationCount: Number(mission.clearanceViolationCount ?? 0),
    coastlineRiskEventCount: Number(mission.coastlineRiskEventCount ?? 0),
    landIntersectionCount: Number(mission.landIntersectionCount ?? 0),
    actualTargetCoverage: cloneJson(diagnostics.actualTargetCoverage ?? {}),
    terrainRelatedTerminalReason: diagnostics.terrainRelatedTerminalReason ?? null,
    terrainEventSummary: {
      eventCount: eventSummary.eventCount,
      eventTypes,
      severityCounts: eventSummary.severityCounts,
      perAgentCounts: eventSummary.perAgentCounts,
      perSegmentCounts: eventSummary.perSegmentCounts,
      latestEvent: eventSummary.latestEvent,
      duplicateSuppressionCount: diagnostics.counters?.terrainEventDuplicateSuppressionCount ?? 0,
      activeConditionCount: diagnostics.counters?.terrainEventActiveConditionCount ?? 0
    },
    agents,
    segments,
    boundaryFlags: cloneJson(diagnostics.boundaryFlags ?? {})
  };
}

 function validateTerrainSimulationDiagnostics(diagnostics = {}) {
  const errors = [];
  if (diagnostics.type !== 'anchor.simulation.terrain-diagnostics') errors.push('terrain diagnostics type is invalid');
  if (diagnostics.boundaryFlags?.rendererOwned === true) errors.push('renderer must not own terrain diagnostics');
  if (diagnostics.boundaryFlags?.generatedFromVisualInterpolation === true) errors.push('visual interpolation must not generate terrain diagnostics');
  for (const event of diagnostics.events ?? []) {
    if (event.source !== 'canonicalSimulation') errors.push(`event ${event.id ?? event.type} has non-canonical source`);
    if (event.boundaryFlags?.rendererOwned === true) errors.push(`event ${event.id ?? event.type} is renderer-owned`);
  }
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : 'PASS',
    errors,
    summary: terrainSimulationDiagnosticsSummary(diagnostics)
  };
}

 function terrainSimulationEventsDigest(events = []) {
  return MissionSimulationUtil.stableDigest((events ?? []).map((event) => ({
    id: event.id,
    type: event.type,
    agentId: event.agentId ?? null,
    segmentId: event.segmentId ?? null,
    tick: event.tick,
    issueCode: event.issueCode,
    severity: event.severity
  })));
}

function terrainEventsForSample(diagnostics, sample, context) {
  const events = [];
  const clearance = sample.clearanceMeters;
  const thresholds = diagnostics.thresholds ?? {};
  if (clearance === null) return events;
  const lowClearance = clearance < Number(thresholds.lowClearanceWarningMeters ?? 10);
  const violation = clearance < Number(thresholds.minimumBottomClearanceMeters ?? 5) - 1e-6;
  const terrainLimited = sample.position.depthMeters > 0.1 && clearance <= Number(thresholds.minimumBottomClearanceMeters ?? 5) + 0.25;
  const coastlineRisk = sample.bottomDepthMeters !== null && sample.bottomDepthMeters <= Number(thresholds.coastlineRiskClearanceMeters ?? 6.25);
  if (violation) {
    events.push(conditionEvent(diagnostics, sample, {
      conditionId: 'clearanceViolation',
      type: TERRAIN_SIMULATION_EVENT_TYPES.clearanceViolation,
      issueCode: 'BOTTOM_CLEARANCE_VIOLATION',
      severity: 'HARD_ERROR'
    }));
    diagnostics.mission.clearanceViolationCount += 1;
  } else {
    closeCondition(diagnostics, sample, 'clearanceViolation');
  }
  if (!violation && lowClearance) {
    events.push(conditionEvent(diagnostics, sample, {
      conditionId: 'lowClearance',
      type: TERRAIN_SIMULATION_EVENT_TYPES.clearanceWarning,
      issueCode: 'LOW_BOTTOM_CLEARANCE',
      severity: 'WARNING'
    }));
    diagnostics.mission.lowClearanceEventCount += 1;
  } else if (!lowClearance) {
    closeCondition(diagnostics, sample, 'lowClearance');
  }
  if (terrainLimited) {
    events.push(conditionEvent(diagnostics, sample, {
      conditionId: 'terrainLimitedDive',
      type: TERRAIN_SIMULATION_EVENT_TYPES.terrainLimit,
      issueCode: 'BATHYMETRY_LIMITED_PROFILE',
      severity: 'WARNING'
    }));
    diagnostics.mission.terrainLimitedDiveCount += 1;
  } else {
    closeCondition(diagnostics, sample, 'terrainLimitedDive');
  }
  if (coastlineRisk && sample.position.depthMeters <= 1) {
    events.push(conditionEvent(diagnostics, sample, {
      conditionId: 'coastlineRisk',
      type: TERRAIN_SIMULATION_EVENT_TYPES.coastlineRisk,
      issueCode: 'CURRENT_BEACHING_RISK',
      severity: 'WARNING'
    }));
    diagnostics.mission.coastlineRiskEventCount += 1;
  } else {
    closeCondition(diagnostics, sample, 'coastlineRisk');
  }
  return events.filter(Boolean);
}

function conditionEvent(diagnostics, sample, descriptor) {
  const key = conditionKey(sample, descriptor.conditionId);
  if (diagnostics.activeConditions[key]) {
    diagnostics.counters.terrainEventDuplicateSuppressionCount += 1;
    return null;
  }
  diagnostics.activeConditions[key] = true;
  diagnostics.counters.terrainEventCreateCount += 1;
  return createTerrainSimulationEvent({
    diagnostics,
    ...descriptor,
    agentId: sample.agentId,
    segmentId: sample.segmentId,
    tick: sample.tick,
    timeSeconds: sample.timeSeconds,
    position: sample.position,
    bottomDepthMeters: sample.bottomDepthMeters,
    clearanceMeters: sample.clearanceMeters,
    dedupeScope: descriptor.conditionId
  });
}

function closeCondition(diagnostics, sample, conditionId) {
  const key = conditionKey(sample, conditionId);
  if (diagnostics.activeConditions[key]) diagnostics.activeConditions[key] = false;
}

function createTerrainSimulationEvent({
  diagnostics,
  type,
  issueCode,
  severity,
  agentId = null,
  segmentId = null,
  targetId = null,
  tick = 0,
  timeSeconds = 0,
  position = {},
  bottomDepthMeters = null,
  clearanceMeters = null,
  dedupeScope = null
} = {}) {
  const eventTick = Math.max(0, Math.trunc(finite(tick, 0)));
  const id = [
    'terrain',
    diagnostics?.missionId ?? 'mission',
    agentId ?? 'agent',
    segmentId ?? 'mission',
    dedupeScope ?? issueCode ?? type,
    eventTick,
    targetId ?? 'none'
  ].map(safeId).join('-');
  return {
    id,
    type,
    version: TERRAIN_SIMULATION_DIAGNOSTICS_VERSION,
    missionId: diagnostics?.missionId ?? null,
    agentId,
    segmentId,
    targetId,
    tick: eventTick,
    t: round(finite(timeSeconds, 0)),
    timeSeconds: round(finite(timeSeconds, 0)),
    position: {
      x: round(position.x),
      y: round(position.y),
      depthMeters: round(position.depthMeters)
    },
    x: round(position.x),
    y: round(position.y),
    depthMeters: round(position.depthMeters),
    bottomDepthMeters: finiteOrNull(bottomDepthMeters),
    clearanceMeters: finiteOrNull(clearanceMeters),
    severity,
    issueCode,
    source: 'canonicalSimulation',
    publicVisibility: 'publicScenario',
    publicSafe: true,
    boundaryFlags: {
      generatedFromVisualInterpolation: false,
      rendererOwned: false,
      changesOfficialScoring: false
    }
  };
}

function updateMetrics(metrics, sample) {
  metrics.sampleCount += 1;
  if (sample.clearanceMeters !== null && (metrics.minimumActualClearanceMeters === null || sample.clearanceMeters < metrics.minimumActualClearanceMeters)) {
    metrics.minimumActualClearanceMeters = round(sample.clearanceMeters);
    metrics.minimumActualClearancePosition = { ...sample.position };
    metrics.minimumActualClearanceTimeSeconds = round(sample.timeSeconds);
  }
  metrics.maximumActualDepthMeters = Math.max(metrics.maximumActualDepthMeters, sample.position.depthMeters);
  if (sample.divePhase === 'bottomTurn') metrics.actualBottomTurnCount += 1;
  if (sample.depthLayerId && sample.depthLayerId !== metrics.lastDepthLayerId) {
    if (metrics.lastDepthLayerId) metrics.actualLayerCrossingCount += 1;
    metrics.lastDepthLayerId = sample.depthLayerId;
  }
}

function createTerrainEventSummary() {
  return {
    eventCount: 0,
    eventTypeCounts: {},
    severityCounts: {},
    perAgentCounts: {},
    perSegmentCounts: {},
    latestEvent: null,
    activeConditionCount: 0,
    duplicateSuppressionCount: 0
  };
}

function appendTerrainEvent(diagnostics, event) {
  if (!diagnostics || !event) return;
  diagnostics.events ??= [];
  diagnostics.events.push(event);
  diagnostics.eventSummary ??= createTerrainEventSummary();
  const summary = diagnostics.eventSummary;
  summary.eventCount += 1;
  summary.eventTypeCounts[event.type] = (summary.eventTypeCounts[event.type] ?? 0) + 1;
  summary.severityCounts[event.severity ?? 'UNKNOWN'] = (summary.severityCounts[event.severity ?? 'UNKNOWN'] ?? 0) + 1;
  if (event.agentId) summary.perAgentCounts[event.agentId] = (summary.perAgentCounts[event.agentId] ?? 0) + 1;
  if (event.segmentId) summary.perSegmentCounts[event.segmentId] = (summary.perSegmentCounts[event.segmentId] ?? 0) + 1;
  summary.latestEvent = compactTerrainEvent(event);
  summary.activeConditionCount = Object.values(diagnostics.activeConditions ?? {}).filter(Boolean).length;
  summary.duplicateSuppressionCount = diagnostics.counters?.terrainEventDuplicateSuppressionCount ?? 0;
  diagnostics.counters ??= {};
  diagnostics.counters.terrainEventSummaryIncrementCount = Number(diagnostics.counters.terrainEventSummaryIncrementCount ?? 0) + 1;
}

function terrainEventSummarySnapshot(diagnostics = {}) {
  if (diagnostics.eventSummary) {
    diagnostics.eventSummary.activeConditionCount = Object.values(diagnostics.activeConditions ?? {}).filter(Boolean).length;
    diagnostics.eventSummary.duplicateSuppressionCount = diagnostics.counters?.terrainEventDuplicateSuppressionCount ?? 0;
    return cloneJson(diagnostics.eventSummary);
  }
  const summary = createTerrainEventSummary();
  for (const event of diagnostics.events ?? []) {
    summary.eventCount += 1;
    summary.eventTypeCounts[event.type] = (summary.eventTypeCounts[event.type] ?? 0) + 1;
    summary.severityCounts[event.severity ?? 'UNKNOWN'] = (summary.severityCounts[event.severity ?? 'UNKNOWN'] ?? 0) + 1;
    if (event.agentId) summary.perAgentCounts[event.agentId] = (summary.perAgentCounts[event.agentId] ?? 0) + 1;
    if (event.segmentId) summary.perSegmentCounts[event.segmentId] = (summary.perSegmentCounts[event.segmentId] ?? 0) + 1;
    summary.latestEvent = compactTerrainEvent(event);
  }
  summary.activeConditionCount = Object.values(diagnostics.activeConditions ?? {}).filter(Boolean).length;
  summary.duplicateSuppressionCount = diagnostics.counters?.terrainEventDuplicateSuppressionCount ?? 0;
  diagnostics.counters ??= {};
  diagnostics.counters.terrainEventSummaryFullRebuildCount = Number(diagnostics.counters.terrainEventSummaryFullRebuildCount ?? 0) + 1;
  return summary;
}

function compactTerrainEvent(event = {}) {
  return {
    id: event.id ?? null,
    type: event.type ?? null,
    severity: event.severity ?? null,
    issueCode: event.issueCode ?? null,
    agentId: event.agentId ?? null,
    segmentId: event.segmentId ?? null,
    tick: finiteOrNull(event.tick),
    timeSeconds: finiteOrNull(event.timeSeconds ?? event.t),
    position: event.position ?? null,
    clearanceMeters: finiteOrNull(event.clearanceMeters)
  };
}
function createMetrics(patch = {}) {
  return {
    sampleCount: 0,
    minimumActualClearanceMeters: null,
    minimumActualClearancePosition: null,
    minimumActualClearanceTimeSeconds: null,
    maximumActualDepthMeters: 0,
    actualBottomTurnCount: 0,
    actualLayerCrossingCount: 0,
    terrainLimitedDiveCount: 0,
    lowClearanceEventCount: 0,
    clearanceViolationCount: 0,
    coastlineRiskEventCount: 0,
    landIntersectionCount: 0,
    lastDepthLayerId: null,
    ...patch
  };
}

function ensureMetrics(collection, key, patch = {}) {
  collection[key] ??= createMetrics(patch);
  return collection[key];
}

function compactMetrics(metrics = {}) {
  return {
    agentId: metrics.agentId ?? null,
    segmentId: metrics.segmentId ?? null,
    segmentIndex: finiteOrNull(metrics.segmentIndex),
    sampleCount: Number(metrics.sampleCount ?? 0),
    minimumActualClearanceMeters: finiteOrNull(metrics.minimumActualClearanceMeters),
    minimumActualClearancePosition: metrics.minimumActualClearancePosition ?? null,
    minimumActualClearanceTimeSeconds: finiteOrNull(metrics.minimumActualClearanceTimeSeconds),
    maximumActualDepthMeters: finiteOrNull(metrics.maximumActualDepthMeters) ?? 0,
    actualBottomTurnCount: Number(metrics.actualBottomTurnCount ?? 0),
    actualLayerCrossingCount: Number(metrics.actualLayerCrossingCount ?? 0),
    terrainLimitedDiveCount: Number(metrics.terrainLimitedDiveCount ?? 0),
    lowClearanceEventCount: Number(metrics.lowClearanceEventCount ?? 0),
    clearanceViolationCount: Number(metrics.clearanceViolationCount ?? 0),
    coastlineRiskEventCount: Number(metrics.coastlineRiskEventCount ?? 0),
    landIntersectionCount: Number(metrics.landIntersectionCount ?? 0)
  };
}

function sampleBottomDepthMeters(level, x, y, fallback = null) {
  const grid = level?.bathymetry?.depthMeters ?? level?.layers?.bathymetry?.depthMeters ?? level?.layers?.bottomDepthMeters ?? null;
  if (!Array.isArray(grid) || !grid.length) {
    const value = Number(fallback);
    return Number.isFinite(value) ? Math.max(0, value) : Infinity;
  }
  const sample = sampleBathymetryContinuous({ field: { depthMeters: grid }, x, y });
  const value = Number(sample.bottomDepthMeters ?? sample.value);
  return Number.isFinite(value) ? Math.max(0, value) : Infinity;
}

function sampleBathymetryContinuous({ field = {}, x = 0, y = 0 } = {}) {
  const depthMeters = field.depthMeters ?? field;
  const value = sampleGridBilinear(depthMeters, x, y);
  return { bottomDepthMeters: value, value };
}

function sampleGridBilinear(grid = [], x = 0, y = 0) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!height || !width) return Infinity;
  const bx = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const by = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const x0 = Math.floor(bx);
  const y0 = Math.floor(by);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = bx - x0;
  const ty = by - y0;
  const a = Number(grid[y0]?.[x0]);
  const b = Number(grid[y0]?.[x1]);
  const c = Number(grid[y1]?.[x0]);
  const d = Number(grid[y1]?.[x1]);
  if (![a, b, c, d].every(Number.isFinite)) return Infinity;
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function terrainSourceDigest(level = {}) {
  const depth = level?.bathymetry?.depthMeters ?? level?.layers?.bathymetry?.depthMeters ?? level?.layers?.bottomDepthMeters ?? null;
  const land = level?.bathymetry?.landMask ?? level?.bathymetry?.landSeaMask ?? level?.layers?.terrain ?? null;
  return MissionSimulationUtil.stableDigest({ depth, land, levelId: level?.levelId ?? null });
}

function conditionKey(sample, conditionId) {
  return [sample.agentId ?? 'agent', sample.segmentId ?? 'mission', conditionId].join(':');
}

function safeId(value) {
  return String(value ?? 'none').replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '') || 'none';
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  return JSON.parse(JSON.stringify(value));
}

module.exports = {TERRAIN_SIMULATION_EVENT_TYPES, createTerrainSimulationDiagnostics, updateTerrainSimulationDiagnostics, recordTerrainSimulationObservation, recordTerrainSimulationSurfacing, finalizeTerrainSimulationDiagnostics, terrainSimulationDiagnosticsSummary, validateTerrainSimulationDiagnostics, terrainSimulationEventsDigest}