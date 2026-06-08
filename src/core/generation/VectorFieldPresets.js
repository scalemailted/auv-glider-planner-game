export const VECTOR_FIELD_PRESETS = {
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

export const CURRENT_PRESET_CHOICES = [
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

export function normalizeVectorPreset(value = 'currentCorridor') {
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

export function getVectorPresetConfig(value = 'currentCorridor', overrides = {}) {
  const preset = normalizeVectorPreset(value);
  const base = VECTOR_FIELD_PRESETS[preset];
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
    notes: base.warning
  };
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
