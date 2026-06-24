export const CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION = 'current-vertical-profile-contract-flow-pkg-r2';

export const CURRENT_VERTICAL_PROFILE_FAMILIES = Object.freeze([
  'barotropicDepthUniform',
  'surfaceIntensifiedExponential',
  'linearVerticalShear',
  'thermoclineJet',
  'bottomBoundaryDecay',
  'twoLayerShear',
  'ekmanLikeVeering'
]);

export function createCurrentVerticalStructureDescriptor(options = {}) {
  const id = String(options.id ?? 'mixedRegionalBaroclinicV1');
  const profileFamilies = normalizeFamilies(options.profileFamilies ?? (
    id === 'barotropicDepthUniform'
      ? ['barotropicDepthUniform']
      : ['surfaceIntensifiedExponential', 'linearVerticalShear', 'thermoclineJet', 'bottomBoundaryDecay']
  ));
  return {
    id,
    version: CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION,
    profileFamily: profileFamilies.length === 1 ? profileFamilies[0] : 'mixed',
    profileFamilies,
    magnitudeProfile: options.magnitudeProfile ?? (profileFamilies.includes('surfaceIntensifiedExponential') ? 'surface-intensified exponential decay with coherent shear terms' : 'depth uniform'),
    directionProfile: options.directionProfile ?? (profileFamilies.includes('linearVerticalShear') ? 'coherent vector shear with optional declared turning' : 'depth uniform'),
    surfaceReferenceDepthMeters: finite(options.surfaceReferenceDepthMeters, 0),
    thermoclineDepthMeters: finite(options.thermoclineDepthMeters, 35),
    bottomBoundaryThicknessMeters: finite(options.bottomBoundaryThicknessMeters, 45),
    shearStrength: finite(options.shearStrength, 0.09),
    turningDegrees: finite(options.turningDegrees, 0),
    componentSupport: options.componentSupport ?? defaultComponentSupport(profileFamilies),
    parameters: {
      surfaceDecayMeters: finite(options.surfaceDecayMeters, 70),
      surfaceDeepFloor: finite(options.surfaceDeepFloor, 0.42),
      linearShearUEast: finite(options.linearShearUEast, -0.055),
      linearShearVNorth: finite(options.linearShearVNorth, 0.072),
      thermoclineJetStrength: finite(options.thermoclineJetStrength, 0.085),
      thermoclineJetWidthMeters: finite(options.thermoclineJetWidthMeters, 22),
      bottomBoundaryMinimumScale: finite(options.bottomBoundaryMinimumScale, 0.22),
      bottomBoundaryThicknessMeters: finite(options.bottomBoundaryThicknessMeters, 45),
      turningDegrees: finite(options.turningDegrees, 0)
    },
    units: {
      depth: 'meters positive down',
      velocity: 'meters per second east/north',
      shear: 'meters per second per normalized water-column depth'
    },
    claimBoundary: 'Deterministic synthetic vertical current profiles for benchmark scenarios. Not a calibrated ocean forecast.'
  };
}

export function applyVerticalProfileToVector(options = {}) {
  const family = String(options.profileFamily ?? 'barotropicDepthUniform');
  const descriptor = options.verticalStructure ?? createCurrentVerticalStructureDescriptor({ profileFamilies: [family] });
  const params = { ...(descriptor.parameters ?? {}), ...(options.parameters ?? {}) };
  const depthMeters = Math.max(0, finite(options.depthMeters, 0));
  const bottomDepthMeters = Math.max(depthMeters + 1e-6, finite(options.bottomDepthMeters, 250));
  const depthNorm = Math.max(0, Math.min(1, depthMeters / Math.max(1e-6, bottomDepthMeters)));
  const input = { u: finite(options.u, 0), v: finite(options.v, 0) };
  if (family === 'barotropicDepthUniform') return { ...input, scale: 1, rotationDegrees: 0, profileFamily: family };
  if (family === 'surfaceIntensifiedExponential') {
    const floor = Math.max(0, Math.min(1, finite(params.surfaceDeepFloor, 0.42)));
    const decay = Math.max(1, finite(params.surfaceDecayMeters, 70));
    const scale = floor + (1 - floor) * Math.exp(-depthMeters / decay);
    return { u: input.u * scale, v: input.v * scale, scale, rotationDegrees: 0, profileFamily: family };
  }
  if (family === 'linearVerticalShear') {
    const centered = depthNorm - 0.38;
    const u = input.u + finite(params.linearShearUEast, -0.055) * centered;
    const v = input.v + finite(params.linearShearVNorth, 0.072) * centered;
    return { u, v, scale: magnitudeRatio(input, { u, v }), rotationDegrees: vectorBearingDelta(input, { u, v }), profileFamily: family };
  }
  if (family === 'thermoclineJet') {
    const center = finite(descriptor.thermoclineDepthMeters, finite(params.thermoclineDepthMeters, 35));
    const width = Math.max(1, finite(params.thermoclineJetWidthMeters, 22));
    const jet = finite(params.thermoclineJetStrength, 0.085) * Math.exp(-Math.pow((depthMeters - center) / width, 2));
    const unit = unitVector(input, { u: 0.82, v: 0.57 });
    const u = input.u + unit.u * jet;
    const v = input.v + unit.v * jet;
    return { u, v, scale: magnitudeRatio(input, { u, v }), rotationDegrees: vectorBearingDelta(input, { u, v }), profileFamily: family };
  }
  if (family === 'bottomBoundaryDecay') {
    const clearance = Math.max(0, bottomDepthMeters - depthMeters);
    const thickness = Math.max(1, finite(params.bottomBoundaryThicknessMeters, descriptor.bottomBoundaryThicknessMeters ?? 45));
    const minScale = Math.max(0, Math.min(1, finite(params.bottomBoundaryMinimumScale, 0.22)));
    const s = smoothstep(Math.max(0, Math.min(1, clearance / thickness)));
    const scale = minScale + (1 - minScale) * s;
    return { u: input.u * scale, v: input.v * scale, scale, rotationDegrees: 0, profileFamily: family };
  }
  if (family === 'twoLayerShear') {
    const transition = 0.5 + 0.5 * Math.tanh((depthNorm - 0.48) / 0.08);
    const u = input.u * (1 - transition) - input.u * 0.55 * transition;
    const v = input.v * (1 - transition) + input.v * 0.35 * transition;
    return { u, v, scale: magnitudeRatio(input, { u, v }), rotationDegrees: vectorBearingDelta(input, { u, v }), profileFamily: family };
  }
  if (family === 'ekmanLikeVeering') {
    const decay = Math.max(1, finite(params.surfaceDecayMeters, 70));
    const angle = (Math.PI / 180) * finite(params.turningDegrees, descriptor.turningDegrees ?? 28) * depthNorm;
    const scale = 0.35 + 0.65 * Math.exp(-depthMeters / decay);
    const rotated = rotate(input, angle);
    return { u: rotated.u * scale, v: rotated.v * scale, scale, rotationDegrees: angle * 180 / Math.PI, profileFamily: family };
  }
  return { ...input, scale: 1, rotationDegrees: 0, profileFamily: family };
}

export function applyVerticalProfileSequence(vector = {}, options = {}) {
  const descriptor = options.verticalStructure ?? createCurrentVerticalStructureDescriptor(options);
  let current = { u: finite(vector.u, 0), v: finite(vector.v, 0) };
  const appliedProfiles = [];
  for (const family of descriptor.profileFamilies ?? ['barotropicDepthUniform']) {
    const result = applyVerticalProfileToVector({ ...options, ...current, profileFamily: family, verticalStructure: descriptor });
    current = { u: result.u, v: result.v };
    appliedProfiles.push({ family, scale: round(result.scale), rotationDegrees: round(result.rotationDegrees) });
  }
  return { ...current, appliedProfiles, profileFamilies: descriptor.profileFamilies ?? [] };
}

export function materialVectorDeltaForColumn(samples = [], options = {}) {
  const finiteSamples = samples.filter((sample) => Number.isFinite(Number(sample?.u)) && Number.isFinite(Number(sample?.v)));
  const speeds = finiteSamples.map((sample) => Math.hypot(Number(sample.u), Number(sample.v)));
  const meanSpeed = speeds.length ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length : 0;
  return Math.max(finite(options.absoluteMetersPerSecond, 0.01), finite(options.relativeMeanSpeed, 0.08) * meanSpeed);
}

function defaultComponentSupport(profileFamilies) {
  const mixed = !profileFamilies.includes('barotropicDepthUniform') || profileFamilies.length > 1;
  return {
    alongShelfJet: mixed ? 'surface-to-midwater configurable shear' : 'full-depth barotropic',
    shelfBreakJet: mixed ? 'surface-intensified with thermocline support' : 'full-depth barotropic',
    barotropicTide: 'depth-uniform before declared bottom-boundary decay',
    optionalWindDrivenSurfaceShear: 'surface-intensified',
    mesoscaleEddy: mixed ? 'depth-decaying coherent column' : 'full-depth barotropic',
    translatingEddy: mixed ? 'depth-decaying coherent column' : 'full-depth barotropic',
    localizedCanyonExchange: mixed ? 'midwater/deep-localized declared envelope' : 'full-depth declared envelope',
    islandWakeApproximation: mixed ? 'surface/shallow dominant' : 'full-depth barotropic',
    calmOrWeakCurrentRegion: 'coherent damping envelope across valid wet depths'
  };
}

function normalizeFamilies(value) {
  const families = (Array.isArray(value) && value.length ? value : ['barotropicDepthUniform'])
    .map((family) => String(family))
    .filter((family) => CURRENT_VERTICAL_PROFILE_FAMILIES.includes(family));
  return families.length ? [...new Set(families)] : ['barotropicDepthUniform'];
}

function unitVector(vector = {}, fallback = { u: 1, v: 0 }) {
  const u = finite(vector.u, 0);
  const v = finite(vector.v, 0);
  const m = Math.hypot(u, v);
  if (m > 1e-9) return { u: u / m, v: v / m };
  const fu = finite(fallback.u, 1);
  const fv = finite(fallback.v, 0);
  const fm = Math.hypot(fu, fv) || 1;
  return { u: fu / fm, v: fv / fm };
}

function magnitudeRatio(before = {}, after = {}) {
  const a = Math.hypot(finite(after.u, 0), finite(after.v, 0));
  const b = Math.hypot(finite(before.u, 0), finite(before.v, 0));
  return b > 1e-9 ? a / b : a;
}

function vectorBearingDelta(before = {}, after = {}) {
  const b0 = Math.atan2(finite(before.u, 0), finite(before.v, 0));
  const b1 = Math.atan2(finite(after.u, 0), finite(after.v, 0));
  let delta = (b1 - b0) * 180 / Math.PI;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function rotate(vector = {}, radians = 0) {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const u = finite(vector.u, 0);
  const v = finite(vector.v, 0);
  return { u: u * c - v * s, v: u * s + v * c };
}

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, Number(x) || 0));
  return t * t * (3 - 2 * t);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}