 const MOTION_DIAGNOSTICS_VERSION = 'motion-diagnostics-motion-r1';

 function computeCurrentAssistDiagnostics(track = []) {
  const list = Array.isArray(track) ? track : [];
  const values = list.map((point) => Number(point.currentAssist)).filter(Number.isFinite);
  return {
    currentAssistMean: mean(values),
    currentAssistMax: max(values),
    currentOppositionMean: mean(values.map((value) => Math.max(0, -value))),
    currentOppositionMax: max(values.map((value) => Math.max(0, -value)))
  };
}

 function computeCrossCurrentDiagnostics(track = []) {
  const values = (Array.isArray(track) ? track : []).map((point) => Number(point.crossCurrent)).filter(Number.isFinite);
  return {
    crossCurrentMean: mean(values),
    crossCurrentMax: max(values)
  };
}

 function computeTrackErrorDiagnostics(trace = {}) {
  const values = (trace.plannedVsRealized?.trackErrors ?? trace.trackErrors ?? []).map(Number).filter(Number.isFinite);
  return {
    trackErrorMean: mean(values),
    trackErrorMax: max(values),
    finalTrackError: values.length ? round(values.at(-1)) : Number(trace.plannedVsRealized?.finalTrackError ?? 0) || 0
  };
}

 function computeEnergyDiagnostics(track = []) {
  const list = Array.isArray(track) ? track : [];
  return {
    energyUsed: round(list.reduce((sum, point) => sum + Number(point.energyUsedIncrement ?? 0), 0)),
    energyRemainingFinal: list.length ? Number(list.at(-1).energyRemaining ?? 0) : 0,
    energyPointCount: list.length
  };
}

 function computeControlEffortDiagnostics(controls = [], track = []) {
  const turnEffort = sumAdjacentHeadingDelta(track);
  const depthChangeEffort = sumAdjacentDepthDelta(track);
  return {
    controlCount: Array.isArray(controls) ? controls.length : 0,
    turnEffort: round(turnEffort),
    depthChangeEffort: round(depthChangeEffort)
  };
}

 function computeMotionFeasibilityDiagnostics(trace = {}) {
  const track = trace.realizedTrack ?? trace.track ?? [];
  const planned = trace.plannedVsRealized ?? {};
  const diagnostics = {
    ...computeCurrentAssistDiagnostics(track),
    ...computeCrossCurrentDiagnostics(track),
    ...computeTrackErrorDiagnostics(trace),
    ...computeEnergyDiagnostics(track),
    ...computeControlEffortDiagnostics(trace.controlCommands, track),
    hazardExposure: track.filter((point) => Number(point.hazard ?? 0) >= 0.35).length,
    bottomClearanceWarnings: track.filter((point) => point.bottomClearanceMeters !== null && Number(point.bottomClearanceMeters) < 2).length,
    constraintViolations: track.filter((point) => Number(point.constraintMask ?? 0) >= 0.5).length,
    sampleCoverageCount: trace.sampledObservations?.length ?? track.filter((point) => point.sampleEnabled !== false).length,
    arrivalStatus: planned.arrivalStatus ?? 'unknown',
    generatedRoute: false,
    usesNewPlanner: false,
    usesWebGPUFluid: false,
    usesMARL: false
  };
  return {
    type: 'anchor.motion.diagnostics',
    version: MOTION_DIAGNOSTICS_VERSION,
    ...diagnostics,
    summary: motionDiagnosticsSummary(diagnostics),
    notA: ['not official scoring', 'not a route planner', 'not WebGPU', 'not MARL/RL']
  };
}

 function motionDiagnosticsSummary(diagnostics = {}) {
  return {
    type: 'anchor.motion.diagnostics-summary',
    version: MOTION_DIAGNOSTICS_VERSION,
    currentAssistMean: round(diagnostics.currentAssistMean ?? 0),
    currentOppositionMean: round(diagnostics.currentOppositionMean ?? 0),
    crossCurrentMean: round(diagnostics.crossCurrentMean ?? 0),
    trackErrorMean: round(diagnostics.trackErrorMean ?? 0),
    trackErrorMax: round(diagnostics.trackErrorMax ?? 0),
    energyUsed: round(diagnostics.energyUsed ?? 0),
    turnEffort: round(diagnostics.turnEffort ?? 0),
    depthChangeEffort: round(diagnostics.depthChangeEffort ?? 0),
    hazardExposure: Number(diagnostics.hazardExposure ?? 0),
    bottomClearanceWarnings: Number(diagnostics.bottomClearanceWarnings ?? 0),
    constraintViolations: Number(diagnostics.constraintViolations ?? 0),
    sampleCoverageCount: Number(diagnostics.sampleCoverageCount ?? 0),
    arrivalStatus: diagnostics.arrivalStatus ?? 'unknown',
    feasible: (diagnostics.constraintViolations ?? 0) === 0 && (diagnostics.energyUsed ?? 0) >= 0,
    generatedRoute: false,
    usesNewPlanner: false,
    usesWebGPUFluid: false,
    usesMARL: false,
    officialBrowserScoring: false
  };
}

function sumAdjacentHeadingDelta(track) {
  let total = 0;
  for (let index = 1; index < track.length; index += 1) {
    total += Math.abs(wrapAngle(Number(track[index].headingRadians ?? 0) - Number(track[index - 1].headingRadians ?? 0)));
  }
  return total;
}

function sumAdjacentDepthDelta(track) {
  let total = 0;
  for (let index = 1; index < track.length; index += 1) {
    total += Math.abs(Number(track[index].depthMeters ?? 0) - Number(track[index - 1].depthMeters ?? 0));
  }
  return total;
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
}

function max(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(Math.max(...finite)) : 0;
}

function wrapAngle(value) {
  let angle = Number(value) || 0;
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

module.exports = {MOTION_DIAGNOSTICS_VERSION, computeCurrentAssistDiagnostics, computeCrossCurrentDiagnostics, computeTrackErrorDiagnostics, computeEnergyDiagnostics, computeControlEffortDiagnostics, computeMotionFeasibilityDiagnostics, motionDiagnosticsSummary}