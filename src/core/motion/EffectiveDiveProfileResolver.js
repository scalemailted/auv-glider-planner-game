// Compatibility forwarding module.
// Canonical implementation lives in packages/mission-simulator.
export { EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION, CANONICAL_MODERN_DIVE_PROFILE_ID, resolveEffectiveDiveProfile, effectiveDiveProfileSummary } from '../../../packages/mission-simulator/src/WaterColumnProfileRuntime.js';

export function validateEffectiveDiveProfileResult(result = {}) {
  const errors = [];
  if (!result.profileId && !result.profile?.id) errors.push('Effective dive profile requires a profileId.');
  if (!result.targetDepthLayerId) errors.push('Effective dive profile requires a targetDepthLayerId.');
  if (result.routeEmpty === true && result.profileId !== 'surfaceOnly') errors.push('Empty routes must resolve to surfaceOnly.');
  if (result.usesFull3DPlanning === true) errors.push('Effective dive profile resolver must not enable arbitrary XYZ planning.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : (result.warnings?.length ? 'WARN' : 'PASS'), errors, warnings: result.warnings ?? [], summary: { profileId: result.profileId ?? result.profile?.id ?? null, source: result.source ?? null, targetDepthLayerId: result.targetDepthLayerId ?? null } };
}
