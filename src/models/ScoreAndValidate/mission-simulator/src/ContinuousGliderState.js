 const CONTINUOUS_GLIDER_STATE_VERSION = 'continuous-glider-state-three-r1-2a-3';

 function createContinuousGliderState(options = {}) {
  return normalizeContinuousGliderState(options);
}

 function normalizeContinuousGliderState(state = {}) {
  const agentId = state.agentId ?? state.id ?? 'glider';
  const position = normalizePosition(state.position ?? state);
  const velocity = normalizeVelocity(state.velocity ?? state.groundRelativeVelocity, { x: 0, y: 0, vertical: 0 });
  const waterRelativeVelocity = normalizeVelocity(state.waterRelativeVelocity ?? state.throughWaterVelocity, velocity);
  const groundRelativeVelocity = normalizeVelocity(state.groundRelativeVelocity ?? state.velocity, velocity);
  const headingRadians = finite(state.headingRadians ?? state.heading, 0);
  const courseOverGroundRadians = finite(state.courseOverGroundRadians ?? courseFromVelocity(groundRelativeVelocity), headingRadians);
  const pitchRadians = finite(state.pitchRadians ?? state.pitch, 0);
  return {
    type: 'anchor.sim.continuous-glider-state',
    version: CONTINUOUS_GLIDER_STATE_VERSION,
    agentId,
    position,
    velocity,
    waterRelativeVelocity,
    groundRelativeVelocity,
    headingRadians,
    courseOverGroundRadians,
    pitchRadians,
    rollRadians: finite(state.rollRadians ?? state.roll, 0),
    divePhase: normalizeDivePhase(state.divePhase ?? state.diveState ?? (position.depthMeters > 0 ? 'descending' : 'surfaced')),
    activeSegmentId: state.activeSegmentId ?? null,
    activeWaypointId: state.activeWaypointId ?? state.waypointId ?? null,
    profileProgress: clamp01(state.profileProgress),
    segmentProgress: clamp01(state.segmentProgress),
    surfaced: state.surfaced ?? position.depthMeters <= 0.1,
    transmitting: state.transmitting ?? normalizeDivePhase(state.divePhase ?? state.diveState) === 'transmitting',
    timeSeconds: finite(state.timeSeconds ?? state.t, 0),
    bottomDepthMeters: finiteOrNull(state.bottomDepthMeters),
    bottomClearanceMeters: finiteOrNull(state.bottomClearanceMeters),
    currentVector: normalizeCurrent(state.currentVector ?? state.current)
  };
}

 function validateContinuousGliderState(state = {}) {
  const normalized = normalizeContinuousGliderState(state);
  const errors = [];
  if (!normalized.agentId) errors.push('Continuous glider state requires agentId.');
  for (const key of ['x', 'y', 'depthMeters']) {
    if (!Number.isFinite(Number(normalized.position[key]))) errors.push(`Continuous glider position ${key} must be finite.`);
  }
  for (const key of ['headingRadians', 'courseOverGroundRadians', 'pitchRadians', 'rollRadians', 'timeSeconds']) {
    if (!Number.isFinite(Number(normalized[key]))) errors.push(`Continuous glider ${key} must be finite.`);
  }
  if (normalized.position.depthMeters < -1e-6) errors.push('Depth must be positive downward and cannot be negative.');
  return { valid: errors.length === 0, errors, state: normalized };
}

 function continuousGliderStateSummary(state = {}) {
  const normalized = normalizeContinuousGliderState(state);
  return {
    version: CONTINUOUS_GLIDER_STATE_VERSION,
    agentId: normalized.agentId,
    x: round(normalized.position.x),
    y: round(normalized.position.y),
    depthMeters: round(normalized.position.depthMeters),
    headingRadians: round(normalized.headingRadians),
    courseOverGroundRadians: round(normalized.courseOverGroundRadians),
    pitchRadians: round(normalized.pitchRadians),
    divePhase: normalized.divePhase,
    profileProgress: round(normalized.profileProgress),
    segmentProgress: round(normalized.segmentProgress),
    surfaced: normalized.surfaced === true,
    transmitting: normalized.transmitting === true
  };
}

 function normalizeDivePhase(value) {
  const phase = String(value ?? '').trim();
  const allowed = ['surfaced', 'inflectingDown', 'descending', 'bottomTurn', 'ascending', 'inflectingUp', 'surfacing', 'transmitting'];
  if (phase === 'surface') return 'surfaced';
  if (phase === 'submerged') return 'descending';
  return allowed.includes(phase) ? phase : 'surfaced';
}

function normalizePosition(position = {}) {
  return {
    x: finite(position.x ?? position.col, 0),
    y: finite(position.y ?? position.row, 0),
    depthMeters: Math.max(0, finite(position.depthMeters ?? position.depth ?? 0, 0))
  };
}

function normalizeVelocity(value = {}, fallback = {}) {
  if (Array.isArray(value)) return { x: finite(value[0], 0), y: finite(value[1], 0), vertical: finite(value[2], 0) };
  return {
    x: finite(value.x ?? value.u ?? value.vx, fallback.x ?? 0),
    y: finite(value.y ?? value.v ?? value.vy, fallback.y ?? 0),
    vertical: finite(value.vertical ?? value.z ?? value.w ?? value.vz, fallback.vertical ?? 0)
  };
}

function normalizeCurrent(value = null) {
  if (!value) return null;
  if (Array.isArray(value)) return { u: finite(value[0], 0), v: finite(value[1], 0), w: finite(value[2], 0) };
  return { u: finite(value.u ?? value.x, 0), v: finite(value.v ?? value.y, 0), w: finite(value.w ?? value.z, 0) };
}

function courseFromVelocity(velocity = {}) {
  const speed = Math.hypot(Number(velocity.x ?? 0), Number(velocity.y ?? 0));
  return speed > 1e-6 ? Math.atan2(Number(velocity.y), Number(velocity.x)) : null;
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

module.exports = {CONTINUOUS_GLIDER_STATE_VERSION, createContinuousGliderState, normalizeContinuousGliderState, validateContinuousGliderState, continuousGliderStateSummary, normalizeDivePhase}