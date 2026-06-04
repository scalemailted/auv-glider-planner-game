const MIN_HEADING_VECTOR = 1e-6;

export function computeHeadingAngle(from, to, fallbackAngle = 0) {
  const dx = Number(to?.x) - Number(from?.x);
  const dy = Number(to?.y) - Number(from?.y);
  return computeHeadingFromVelocity(dx, dy, fallbackAngle);
}

export function computeHeadingFromVelocity(vx, vy, fallbackAngle = 0) {
  const x = Number(vx);
  const y = Number(vy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return fallbackAngle;
  if (Math.hypot(x, y) < MIN_HEADING_VECTOR) return fallbackAngle;
  return Math.atan2(y, x);
}

export function isUsableHeading(angle) {
  return Number.isFinite(Number(angle));
}
