export const GLIDER_POSE_VIEW_MODEL_VERSION = 'glider-pose-view-model-three-r1-1e';
const EPSILON_SPEED = 1e-4;

export function buildGliderPoseViewModel(options = {}) {
  const agent = options.agent ?? options.glider ?? options;
  const warnings = [];
  const agentId = agent.agentId ?? agent.id ?? options.agentId ?? 'glider';
  const position = normalizePosition(agent.position ?? agent);
  const depthMeters = finite(agent.depthMeters ?? position.depthMeters, 0);
  const canonicalHeading = finiteOrNull(agent.headingRadians ?? agent.heading);
  const canonicalPitch = finiteOrNull(agent.pitchRadians ?? agent.pitch);
  const canonicalRoll = finiteOrNull(agent.rollRadians ?? agent.roll);
  const groundVelocity = normalizeVector(agent.groundRelativeVelocity ?? agent.velocity ?? agent.groundVelocity);
  const waterVelocity = normalizeVector(agent.waterRelativeVelocity ?? agent.throughWaterVelocity);
  const trajectoryCourse = courseFromTrajectory(agent.history ?? options.history ?? [], position);
  const segmentCourse = courseBetween(agent.priorTrajectoryPoint ?? options.priorTrajectoryPoint, agent.nextTrajectoryPoint ?? agent.targetWaypoint ?? options.nextTrajectoryPoint);
  let headingRadians = canonicalHeading;
  let orientationSource = 'canonicalHeading';
  if (headingRadians == null) {
    const velocityCourse = courseFromVector(groundVelocity);
    if (velocityCourse != null) {
      headingRadians = velocityCourse;
      orientationSource = 'groundVelocityCourse';
    } else if (trajectoryCourse != null) {
      headingRadians = trajectoryCourse;
      orientationSource = 'trajectoryTangent';
    } else if (segmentCourse != null) {
      headingRadians = segmentCourse;
      orientationSource = 'plannedSegmentFallback';
    } else {
      headingRadians = 0;
      orientationSource = 'defaultEast';
      warnings.push('No canonical heading, velocity, trajectory, or segment direction was available.');
    }
  }
  const velocityCourse = courseFromVector(groundVelocity);
  const courseOverGroundRadians = velocityCourse ?? trajectoryCourse ?? headingRadians;
  const courseSource = velocityCourse != null ? 'groundVelocity' : trajectoryCourse != null ? 'trajectoryTangent' : orientationSource;
  const speedOverGround = speedFromVector(groundVelocity) ?? trajectoryCourse?.speed ?? 0;
  const waterRelativeSpeed = speedFromVector(waterVelocity) ?? finite(agent.waterRelativeSpeed, 0);
  if (speedOverGround <= EPSILON_SPEED && canonicalHeading == null && trajectoryCourse == null && segmentCourse != null) warnings.push('Near-zero movement; using planned segment as startup fallback only.');
  return {
    type: 'anchor.rendering.glider-pose-view-model',
    version: GLIDER_POSE_VIEW_MODEL_VERSION,
    agentId,
    position,
    depthMeters,
    headingRadians: normalizeRadians(headingRadians),
    pitchRadians: canonicalPitch ?? finite(agent.diveState === 'descending' ? 0.12 : agent.diveState === 'ascending' || agent.surfaced ? -0.08 : 0, 0),
    rollRadians: canonicalRoll ?? 0,
    courseOverGroundRadians: normalizeRadians(courseOverGroundRadians),
    speedOverGround,
    waterRelativeSpeed,
    orientationSource,
    courseSource,
    diveState: agent.diveState ?? (depthMeters <= 0.1 || agent.surfaced ? 'surface' : 'subsurface'),
    status: agent.status ?? 'unknown',
    warnings
  };
}

export function validateGliderPoseViewModel(pose = {}) {
  const errors = [];
  if (!pose.agentId) errors.push('Glider pose requires an agentId.');
  if (!Number.isFinite(Number(pose.position?.x)) || !Number.isFinite(Number(pose.position?.y))) errors.push('Glider pose requires finite x/y position.');
  for (const key of ['headingRadians', 'pitchRadians', 'rollRadians', 'courseOverGroundRadians']) {
    if (!Number.isFinite(Number(pose[key]))) errors.push(`Glider pose ${key} must be finite.`);
  }
  return { valid: errors.length === 0, errors, warnings: pose.warnings ?? [] };
}

export function gliderPoseViewModelSummary(pose = {}) {
  return {
    version: GLIDER_POSE_VIEW_MODEL_VERSION,
    agentId: pose.agentId ?? null,
    headingRadians: round(pose.headingRadians),
    pitchRadians: round(pose.pitchRadians),
    rollRadians: round(pose.rollRadians),
    courseOverGroundRadians: round(pose.courseOverGroundRadians),
    speedOverGround: round(pose.speedOverGround),
    waterRelativeSpeed: round(pose.waterRelativeSpeed),
    orientationSource: pose.orientationSource ?? null,
    courseSource: pose.courseSource ?? null,
    diveState: pose.diveState ?? null,
    status: pose.status ?? null,
    warnings: [...(pose.warnings ?? [])]
  };
}

function normalizePosition(position = {}) {
  return {
    x: finite(position.x ?? position.col, 0),
    y: finite(position.y ?? position.row, 0),
    z: finite(position.z, -finite(position.depthMeters, 0)),
    depthMeters: finite(position.depthMeters, 0)
  };
}

function normalizeVector(value = null) {
  if (!value) return null;
  if (Array.isArray(value)) return { x: finite(value[0], 0), y: finite(value[1], 0) };
  return { x: finite(value.x ?? value.u ?? value.vx, 0), y: finite(value.y ?? value.v ?? value.vy, 0) };
}

function courseFromVector(vector) {
  if (!vector) return null;
  const speed = Math.hypot(Number(vector.x), Number(vector.y));
  if (speed <= EPSILON_SPEED) return null;
  return Math.atan2(Number(vector.y), Number(vector.x));
}

function speedFromVector(vector) {
  if (!vector) return null;
  return Math.hypot(Number(vector.x), Number(vector.y));
}

function courseFromTrajectory(history = [], fallbackPosition = null) {
  if (!Array.isArray(history) || history.length < 2) return null;
  const last = normalizePosition(history[history.length - 1] ?? fallbackPosition ?? {});
  for (let index = history.length - 2; index >= 0; index -= 1) {
    const prev = normalizePosition(history[index]);
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const speed = Math.hypot(dx, dy);
    if (speed > EPSILON_SPEED) return Math.atan2(dy, dx);
  }
  return null;
}

function courseBetween(from = null, to = null) {
  if (!from || !to) return null;
  const a = normalizePosition(from);
  const b = normalizePosition(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) <= EPSILON_SPEED) return null;
  return Math.atan2(dy, dx);
}

function normalizeRadians(value) {
  const numeric = finite(value, 0);
  return Math.atan2(Math.sin(numeric), Math.cos(numeric));
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function round(value, digits = 5) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null;
}
