 const VECTOR_FIELD_PRESETS = {
  calm: preset('Calm', 'calm', 0.2, 0.15, false, 'Baseline low-flow control field.'),
  uniformDrift: preset('Uniform Drift', 'uniformDrift', 0.75, 0.25, false, 'Constant broad drift for assistance/opposition testing.'),
  shearFlow: preset('Shear Flow', 'shearFlow', 1.0, 0.45, true, 'Flow strength and direction vary by band.'),
  currentCorridor: preset('Current Corridor', 'corridor', 1.05, 0.4, true, 'Meandering current corridor for stream-like route tradeoffs.'),
  eddyField: preset('Eddy / Vortex Field', 'eddies', 1.1, 0.55, true, 'Rotational eddies that distort local routes.'),
  doubleGyre: preset('Double Gyre', 'doubleGyre', 1.05, 0.5, true, 'Two counter-rotating circulation cells.'),
  tidalOscillation: preset('Tidal Oscillation', 'tidalOscillation', 0.95, 0.8, true, 'Direction and magnitude oscillate over mission time.'),
  meanderingJet: preset('Meandering Jet', 'meanderingJet', 1.15, 0.65, true, 'Strong bending jet/current corridor.'),
  westernBoundaryCurrent: preset('Western Boundary Current', 'westernBoundaryCurrent', 1.15, 0.62, true, 'Synthetic western boundary jet with eddy shedding.'),
  stormPulse: preset('Storm Pulse', 'stormPulse', 1.25, 0.85, true, 'Temporary strong current pulse.'),
  islandWake: preset('Island Wake', 'islandWake', 1.1, 0.5, true, 'Wake-like flow around terrain obstacles.'),
  curlNoise: preset('Curl Noise Texture', 'curlNoise', 0.95, 0.75, true, 'Small-scale synthetic turbulence from a stream-function texture.'),
  gulfInspired: preset('Gulf Inspired', 'gulfInspired', 1.0, 0.65, true, 'Synthetic Gulf-like loop current and eddy behavior.'),
  hycomInspiredComposite: preset('HYCOM-Inspired Composite', 'hycomInspiredComposite', 1.1, 0.75, true, 'Composite background drift, jet, eddies, shear, and tide. Not real HYCOM forecast data.', 'HYCOM-inspired synthetic composite. Not real HYCOM forecast data.'),
  topologyAwareComposite: preset('Topology-Aware Composite', 'topologyAwareComposite', 1.05, 0.72, true, 'Synthetic topology-aware ocean-inspired current field. Blends open-water, shoreline, channel, bay, and island-wake behavior from the terrain map.', 'Synthetic topology-aware ocean-inspired current field. Not validated CFD or HYCOM forecast data.'),
  chaotic: preset('Chaotic', 'chaotic', 1.25, 0.9, true, 'High-variation synthetic current texture.'),

  // Legacy aliases kept for imported configs and older saved scenarios.
  none: preset('Calm', 'calm', 0.2, 0.15, false, 'Legacy calm alias.'),
  uniform: preset('Uniform Drift', 'uniformDrift', 0.75, 0.25, false, 'Legacy uniform drift alias.'),
  corridor: preset('Current Corridor', 'corridor', 1.05, 0.4, true, 'Legacy corridor alias.'),
  vortex: preset('Eddy / Vortex Field', 'eddies', 1.1, 0.55, true, 'Legacy vortex alias.'),
  eddies: preset('Eddy / Vortex Field', 'eddies', 1.1, 0.55, true, 'Legacy eddies alias.'),
  wave: preset('Gulf Inspired', 'gulfInspired', 1.0, 0.65, true, 'Legacy wave alias.'),
  fluid: preset('Eddy / Vortex Field', 'eddies', 1.1, 0.55, true, 'Legacy fluid alias.')
};

 const CURRENT_PRESET_CHOICES = [
  'calm',
  'uniformDrift',
  'shearFlow',
  'currentCorridor',
  'eddyField',
  'doubleGyre',
  'tidalOscillation',
  'meanderingJet',
  'westernBoundaryCurrent',
  'stormPulse',
  'islandWake',
  'curlNoise',
  'gulfInspired',
  'hycomInspiredComposite',
  'topologyAwareComposite',
  'chaotic'
];


 const FLOW_FIELD_CLAIM_LEVELS = [
  'teachingVectorField',
  'syntheticOceanInspired',
  'topologyAwareSynthetic',
  'analyticalFlowPattern',
  'notCalibratedForecast'
];

 const FLOW_FIELD_PRESET_METADATA = {
  calm: flowMetadata({
    id: 'calm',
    label: 'Calm',
    description: 'Near-zero baseline flow for checking that particles, arrows, and diagnostics behave when currents are weak.',
    equation: 'F(x,y,t) = <epsilon_u(t), epsilon_v(t)>',
    inWords: 'Every point has very weak residual current. It is useful as a low-flow control case.',
    claimLevel: 'teachingVectorField',
    expectedDiagnostics: 'Very low mean speed with near-zero divergence, vorticity, and strain.',
    recommendedUse: 'Baseline controls, display sanity checks, and route comparisons with minimal current influence.',
    notA: 'dead-calm ocean forecast, tidal slack-water prediction, or calibrated circulation model.',
    validationTargets: { speed: 'low', divergence: 'nearZero', vorticity: 'nearZero', strain: 'nearZero', maxMagnitude: 0.25 }
  }),
  uniformDrift: flowMetadata({
    id: 'uniformDrift',
    label: 'Uniform Drift',
    description: 'A broad same-direction current for teaching assist and opposition.',
    equation: 'F(x,y,t) = <u0(t), v0(t)>',
    inWords: 'Every water cell pushes in nearly the same direction with nearly the same speed.',
    claimLevel: 'analyticalFlowPattern',
    expectedDiagnostics: 'Low spatial variance, near-zero divergence, and near-zero vorticity unless dynamic direction variation is enabled.',
    recommendedUse: 'Current assist/opposition examples, planner cost intuition, and deterministic drift baselines.',
    notA: 'real ocean forecast, spatial circulation model, or calibrated current product.',
    validationTargets: { speed: 'spatiallyUniform', divergence: 'nearZero', vorticity: 'nearZero', strain: 'nearZero', maxMagnitude: 0.75 }
  }),
  shearFlow: flowMetadata({
    id: 'shearFlow',
    label: 'Shear Flow',
    description: 'Banded flow with speed and direction changing across one axis.',
    equation: 'F(x,y,t) = <a(y,t), b(x,y,t)>',
    inWords: 'Different horizontal bands push differently, teaching shear and route-dependent current cost.',
    claimLevel: 'analyticalFlowPattern',
    expectedDiagnostics: 'Nonzero strain, speed gradient across bands, and usually low mean divergence.',
    recommendedUse: 'Teaching lateral gradients, cross-current routing, and why nearby routes can have different travel costs.',
    notA: 'measured shear profile, boundary-layer model, or turbulence closure.',
    validationTargets: { speed: 'bandedGradient', divergence: 'low', vorticity: 'mayBeNonzero', strain: 'nonzero', maxMagnitude: 1 }
  }),
  currentCorridor: flowMetadata({
    id: 'currentCorridor',
    label: 'Current Corridor',
    description: 'A smooth meandering current band that is stronger in the corridor than outside it.',
    equation: 'F(x,y,t) = jet(y - c(x,t)) + weak cross-flow',
    inWords: 'A stronger stream runs through the map and bends over space or time.',
    claimLevel: 'syntheticOceanInspired',
    expectedDiagnostics: 'High speed along a band, lateral speed gradient, bounded cross-flow, and no explosive values.',
    recommendedUse: 'Route tradeoff examples where riding or crossing a current corridor matters.',
    notA: 'validated Gulf Stream, river plume, or operational current-core forecast.',
    validationTargets: { speed: 'jetCore', divergence: 'lowToModerate', vorticity: 'edgeShear', strain: 'nonzero', maxMagnitude: 1.05 }
  }),
  eddyField: flowMetadata({
    id: 'eddyField',
    label: 'Eddy / Vortex Field',
    description: 'Rotational synthetic eddies that curve particle paths and local routes.',
    equation: 'F(x,y,t) = sum_i swirl_i(x-c_i(t), y-c_i(t))',
    inWords: 'Water-like motion rotates around one or more centers with bounded radial falloff.',
    claimLevel: 'analyticalFlowPattern',
    expectedDiagnostics: 'Nonzero vorticity, bounded center behavior, curved particle tracks, and finite magnitudes.',
    recommendedUse: 'Teaching circulation, trapped or curved particle motion, and vorticity diagnostics.',
    notA: 'validated mesoscale eddy model, Navier-Stokes vortex solver, or real drifter forecast.',
    validationTargets: { speed: 'rotationalBands', divergence: 'low', vorticity: 'nonzero', strain: 'nonzero', maxMagnitude: 1.1 }
  }),
  doubleGyre: flowMetadata({
    id: 'doubleGyre',
    label: 'Double Gyre',
    description: 'Two counter-rotating circulation cells for side-by-side circulation comparison.',
    equation: 'F(x,y,t) = vortex_left(x,y,t) - vortex_right(x,y,t) + meander',
    inWords: 'Two neighboring cells rotate in opposite directions and create a moving separation zone.',
    claimLevel: 'analyticalFlowPattern',
    expectedDiagnostics: 'Positive and negative vorticity regions, bounded center behavior, and moderate strain near the dividing line.',
    recommendedUse: 'Teaching counter-rotation, separatrices, and route choices near rotating cells.',
    notA: 'calibrated basin circulation, validated ocean gyre model, or physical solver.',
    validationTargets: { speed: 'twoCells', divergence: 'low', vorticity: 'signedPair', strain: 'moderate', maxMagnitude: 1.05 }
  }),
  tidalOscillation: flowMetadata({
    id: 'tidalOscillation',
    label: 'Tidal Oscillation',
    description: 'Time-varying oscillatory current that reverses direction and strength.',
    equation: 'F(x,y,t) = <A sin(omega t), B cos(omega t) cos(pi x)>',
    inWords: 'The field strengthens, slackens, reverses, and strengthens again.',
    claimLevel: 'syntheticOceanInspired',
    expectedDiagnostics: 'Time-varying speed and sign with low-to-moderate divergence and vorticity depending on phase.',
    recommendedUse: 'Teaching time-dependent planning and why a route can be easier at one time than another.',
    notA: 'harmonic tide prediction, tide-gauge calibrated model, or tidal hydrodynamics simulation.',
    validationTargets: { speed: 'oscillatory', divergence: 'lowToModerate', vorticity: 'phaseDependent', strain: 'phaseDependent', maxMagnitude: 0.95 }
  }),
  meanderingJet: flowMetadata({
    id: 'meanderingJet',
    label: 'Meandering Jet',
    description: 'A bending jet/current core with strong flow near a smooth centerline.',
    equation: 'F(x,y,t) = <J exp(-(y-c(x,t))^2/sigma^2), cross(x,t)>',
    inWords: 'A narrow current core snakes through the domain, with weaker flow away from the centerline.',
    claimLevel: 'syntheticOceanInspired',
    expectedDiagnostics: 'High speed along a band, lateral gradients, nonzero strain, and smooth directional change.',
    recommendedUse: 'Teaching current-core routing, stream crossing, and spatially coherent dynamic flow.',
    notA: 'validated jet forecast, Gulf Stream product, or data-assimilative circulation model.',
    validationTargets: { speed: 'jetCore', divergence: 'low', vorticity: 'edgeShear', strain: 'nonzero', maxMagnitude: 1.15 }
  }),
  westernBoundaryCurrent: flowMetadata({
    id: 'westernBoundaryCurrent',
    label: 'Western Boundary Current',
    description: 'Synthetic boundary-intensified current with eddy-like variability.',
    equation: 'F(x,y,t) = boundaryJet(x) + eddy(x,y,t)',
    inWords: 'Flow is stronger near one side of the map and includes a bounded eddy-like perturbation.',
    claimLevel: 'syntheticOceanInspired',
    expectedDiagnostics: 'High speed near one boundary, lateral gradient, nonzero vorticity from the eddy component, and bounded magnitude.',
    recommendedUse: 'Teaching boundary-intensified currents and shoreline-adjacent route cost.',
    notA: 'validated western boundary current forecast or operational ocean analysis.',
    validationTargets: { speed: 'boundaryCore', divergence: 'lowToModerate', vorticity: 'nonzero', strain: 'nonzero', maxMagnitude: 1.15 }
  }),
  stormPulse: flowMetadata({
    id: 'stormPulse',
    label: 'Storm Pulse',
    description: 'A localized energetic current pulse that grows, peaks, and fades.',
    equation: 'F(x,y,t) = pulse(t) exp(-r^2/(2 sigma^2)) direction(x,y,t)',
    inWords: 'A moving local patch of stronger current appears, intensifies, and weakens.',
    claimLevel: 'syntheticOceanInspired',
    expectedDiagnostics: 'Localized high speed during the pulse, finite gradients, and bounded values away from the pulse center.',
    recommendedUse: 'Teaching transient events, timing risk, and why ing time windows matters.',
    notA: 'storm surge model, wind-driven ocean forecast, or weather-coupled hydrodynamic model.',
    validationTargets: { speed: 'localizedPulse', divergence: 'localized', vorticity: 'localized', strain: 'localized', maxMagnitude: 1.25 }
  }),
  islandWake: flowMetadata({
    id: 'islandWake',
    label: 'Island Wake',
    description: 'Wake-like flow around a terrain obstacle when terrain is available.',
    equation: 'F(x,y,t) = upstreamFlow + wake(x-island,t) + boundedSwirl',
    inWords: 'Current bends and circulates near an island-like obstacle.',
    claimLevel: 'topologyAwareSynthetic',
    expectedDiagnostics: 'Suppressed land cells, wake-adjacent vorticity, and bounded acceleration around obstacles.',
    recommendedUse: 'Teaching qualitative obstacle effects and shoreline/current risk.',
    notA: 'CFD wake simulation, island-scale hydrodynamic forecast, or validated turbulence model.',
    validationTargets: { speed: 'obstacleWake', divergence: 'localized', vorticity: 'wakePair', strain: 'nonzero', maxMagnitude: 1.1 }
  }),
  curlNoise: flowMetadata({
    id: 'curlNoise',
    label: 'Curl Noise Texture',
    description: 'A deterministic stream-function-like texture that creates small-scale rotational variation.',
    equation: 'F(x,y,t) approx <d psi/dy, -d psi/dx>',
    inWords: 'Smooth waves create a textured current field with bounded rotational patterns.',
    claimLevel: 'analyticalFlowPattern',
    expectedDiagnostics: 'Nonzero vorticity, bounded speed, spatial texture, and no random flicker for fixed time/config.',
    recommendedUse: 'Teaching texture-like flow variation without stochastic noise.',
    notA: 'large-eddy simulation, turbulence model, or measured submesoscale current product.',
    validationTargets: { speed: 'textured', divergence: 'low', vorticity: 'nonzero', strain: 'nonzero', maxMagnitude: 0.95 }
  }),
  gulfInspired: flowMetadata({
    id: 'gulfInspired',
    label: 'Gulf Inspired',
    description: 'Synthetic loop-current-like circulation and eddy behavior.',
    equation: 'F(x,y,t) = loopVortex + counterEddy + weakBand',
    inWords: 'A large rotating loop and companion eddy create ocean-inspired circulation structure.',
    claimLevel: 'syntheticOceanInspired',
    expectedDiagnostics: 'Nonzero vorticity, circulation regions, finite values, and smooth temporal variation.',
    recommendedUse: 'Teaching qualitative circulation, eddy interactions, and route timing.',
    notA: 'Gulf of Mexico forecast, HYCOM output, or calibrated loop-current analysis.',
    validationTargets: { speed: 'circulationComposite', divergence: 'lowToModerate', vorticity: 'nonzero', strain: 'nonzero', maxMagnitude: 1 }
  }),
  hycomInspiredComposite: flowMetadata({
    id: 'hycomInspiredComposite',
    label: 'HYCOM-Inspired Composite',
    description: 'A synthetic composite that combines background drift, jet, eddies, shear, tide, and texture.',
    equation: 'F(x,y,t) = jet + gyre + boundary + tide + curlTexture',
    inWords: 'Several deterministic teaching patterns are blended to resemble the variety of current maps students may see.',
    claimLevel: 'notCalibratedForecast',
    expectedDiagnostics: 'Mixed nonzero vorticity and strain, bounded magnitude, smooth temporal change, and no invalid vectors.',
    recommendedUse: 'Rich visual stress tests and solver-facing synthetic current examples.',
    notA: 'HYCOM data, HYCOM-quality forecast, data-assimilated model, or operational ocean product.',
    validationTargets: { speed: 'composite', divergence: 'mixedBounded', vorticity: 'mixed', strain: 'mixed', maxMagnitude: 1.1 }
  }),
  topologyAwareComposite: flowMetadata({
    id: 'topologyAwareComposite',
    label: 'Topology-Aware Composite',
    description: 'Synthetic terrain-aware composite with open-water, shoreline, channel, bay, and island-adjacent behaviors.',
    equation: 'F(x,y,t) = sum_r w_r(mask(x,y),t) behavior_r(x,y,t), then boundary-adjusted',
    inWords: 'The terrain mask changes which synthetic behavior is emphasized, and boundary handling reduces or deflects into-land flow.',
    claimLevel: 'topologyAwareSynthetic',
    expectedDiagnostics: 'Flow masked or reduced over land, visible channel/shoreline effects, bounded speed, and no meaningful arrows over land.',
    recommendedUse: 'Teaching qualitative topology effects, current risk near land, and planner-facing terrain-aware currents.',
    notA: 'CFD, ROMS, HYCOM, Delft3D, Navier-Stokes, or calibrated coastal hydrodynamics.',
    validationTargets: { speed: 'terrainAwareComposite', divergence: 'mixedBounded', vorticity: 'mixed', strain: 'mixed', terrainMask: 'suppressedLand', maxMagnitude: 1.05 }
  }),
  chaotic: flowMetadata({
    id: 'chaotic',
    label: 'Chaotic',
    description: 'High-variation deterministic texture for stress-testing dynamic current displays.',
    equation: 'F(x,y,t) = weighted sine/cosine texture',
    inWords: 'Smooth deterministic waves combine into a busy but bounded vector texture.',
    claimLevel: 'teachingVectorField',
    expectedDiagnostics: 'Mixed vorticity and strain, finite vectors, and deterministic repeatability for fixed time/config.',
    recommendedUse: 'Display stress tests and teaching why busy synthetic fields need diagnostics.',
    notA: 'chaotic fluid solver, turbulence simulation, or measured ocean-current product.',
    validationTargets: { speed: 'busyTexture', divergence: 'mixedBounded', vorticity: 'mixed', strain: 'mixed', maxMagnitude: 1.25 }
  })
};

 function normalizeVectorPreset(value = 'currentCorridor') {
  if (value === 'none') return 'calm';
  if (value === 'uniform') return 'uniformDrift';
  if (value === 'corridor') return 'currentCorridor';
  if (value === 'vortex') return 'eddyField';
  if (value === 'eddies') return 'eddyField';
  if (value === 'wave') return 'gulfInspired';
  if (value === 'fluid') return 'eddyField';
  if (value === 'hycomInspired') return 'hycomInspiredComposite';
  if (value === 'hycom') return 'hycomInspiredComposite';
  if (value === 'smartCoastalComposite') return 'topologyAwareComposite';
  if (value === 'smartComposite') return 'topologyAwareComposite';
  return VECTOR_FIELD_PRESETS[value] ? value : 'currentCorridor';
}

 function getVectorPresetConfig(value = 'currentCorridor', overrides = {}) {
  const preset = normalizeVectorPreset(value);
  const base = VECTOR_FIELD_PRESETS[preset];
  const scientificMetadata = getVectorPresetScientificMetadata(preset);
  return {
    preset,
    id: preset,
    label: base.label,
    category: base.category,
    type: 'parametric',
    timeVarying: Boolean(base.timeVarying),
    deterministic: true,
    temporalEvolution: overrides.temporalEvolution ?? base.timeVarying,
    strength: Number(overrides.currentStrength ?? overrides.strength ?? base.currentStrength),
    variability: Number(overrides.currentVariability ?? overrides.variability ?? base.variability ?? 0.5),
    seed: overrides.seed ?? null,
    currentPattern: base.currentPattern,
    description: base.description,
    warning: base.warning,
    notes: base.warning,
    scientificMetadata,
    claimLevel: scientificMetadata.claimLevel,
    equation: scientificMetadata.equation,
    expectedDiagnostics: scientificMetadata.expectedDiagnostics,
    recommendedUse: scientificMetadata.recommendedUse,
    notA: scientificMetadata.notA,
    validationTargets: scientificMetadata.validationTargets
  };
}

 function getVectorPresetScientificMetadata(value = 'currentCorridor') {
  const preset = normalizeVectorPreset(value);
  const base = VECTOR_FIELD_PRESETS[preset];
  const metadata = FLOW_FIELD_PRESET_METADATA[preset] ?? fallbackFlowMetadata(preset, base);
  return {
    ...metadata,
    id: preset,
    label: metadata.label ?? base?.label ?? preset
  };
}

 function validateVectorPresetScientificMetadata(metadata = {}) {
  const errors = [];
  if (!metadata.id) errors.push('metadata.id is required');
  if (!metadata.label) errors.push(`metadata.label is required for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.description) errors.push(`metadata.description is required for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.equation) errors.push(`metadata.equation is required for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.inWords) errors.push(`metadata.inWords is required for ${metadata.id ?? 'unknown preset'}`);
  if (!FLOW_FIELD_CLAIM_LEVELS.includes(metadata.claimLevel)) errors.push(`metadata.claimLevel is invalid for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.expectedDiagnostics) errors.push(`metadata.expectedDiagnostics is required for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.recommendedUse) errors.push(`metadata.recommendedUse is required for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.notA) errors.push(`metadata.notA is required for ${metadata.id ?? 'unknown preset'}`);
  if (!metadata.validationTargets || typeof metadata.validationTargets !== 'object') errors.push(`metadata.validationTargets is required for ${metadata.id ?? 'unknown preset'}`);
  return { valid: errors.length === 0, errors };
}

function flowMetadata(metadata) {
  return {
    ...metadata,
    claimLevel: FLOW_FIELD_CLAIM_LEVELS.includes(metadata.claimLevel) ? metadata.claimLevel : 'syntheticOceanInspired',
    validationTargets: metadata.validationTargets ?? {},
    notA: metadata.notA ?? 'calibrated ocean forecast or physical hydrodynamic model.'
  };
}

function fallbackFlowMetadata(id, base = {}) {
  return flowMetadata({
    id,
    label: base.label ?? id,
    description: base.description ?? 'Synthetic deterministic teaching current preset.',
    equation: 'F(x,y,t) = deterministic synthetic vector sampler',
    inWords: 'The preset returns finite deterministic vector components for each sampled water cell.',
    claimLevel: 'teachingVectorField',
    expectedDiagnostics: 'Finite vectors, bounded magnitude, and deterministic repeatability for fixed time/config.',
    recommendedUse: 'Teaching and diagnostic use when a more specific preset description is unavailable.',
    notA: 'validated ocean forecast, CFD solver, or calibrated circulation model.',
    validationTargets: {
      speed: 'bounded',
      divergence: 'documentedByAudit',
      vorticity: 'documentedByAudit',
      strain: 'documentedByAudit',
      maxMagnitude: base.currentStrength ?? 1.25
    }
  });
}

function preset(label, currentPattern, currentStrength, variability, timeVarying, description, warning = 'Synthetic ocean-inspired current field; not validated HYCOM forecast data.') {
  return {
    id: currentPattern,
    label,
    category: 'synthetic-ocean',
    currentPattern,
    currentStrength,
    variability,
    timeVarying,
    deterministic: true,
    description,
    warning
  };
}

module.exports = {VECTOR_FIELD_PRESETS, CURRENT_PRESET_CHOICES, FLOW_FIELD_CLAIM_LEVELS, FLOW_FIELD_PRESET_METADATA, normalizeVectorPreset, getVectorPresetConfig, getVectorPresetScientificMetadata, validateVectorPresetScientificMetadata}