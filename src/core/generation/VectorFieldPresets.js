export const VECTOR_FIELD_PRESETS = {
  calm: { label: 'Calm', currentPattern: 'calm', currentStrength: 0.2, variability: 0.15 },
  uniformDrift: { label: 'Uniform Drift', currentPattern: 'uniformDrift', currentStrength: 0.75, variability: 0.25 },
  shearFlow: { label: 'Shear Flow', currentPattern: 'shearFlow', currentStrength: 1.0, variability: 0.45 },
  currentCorridor: { label: 'Current Corridor', currentPattern: 'corridor', currentStrength: 1.05, variability: 0.4 },
  eddyField: { label: 'Eddy Field', currentPattern: 'eddies', currentStrength: 1.1, variability: 0.55 },
  doubleGyre: { label: 'Double Gyre', currentPattern: 'doubleGyre', currentStrength: 1.05, variability: 0.5 },
  tidalOscillation: { label: 'Tidal Oscillation', currentPattern: 'tidalOscillation', currentStrength: 0.95, variability: 0.8 },
  stormPulse: { label: 'Storm Pulse', currentPattern: 'stormPulse', currentStrength: 1.25, variability: 0.85 },
  islandWake: { label: 'Island Wake', currentPattern: 'islandWake', currentStrength: 1.1, variability: 0.5 },
  gulfInspired: { label: 'Gulf Inspired', currentPattern: 'gulfInspired', currentStrength: 1.0, variability: 0.65 },
  chaotic: { label: 'Chaotic', currentPattern: 'chaotic', currentStrength: 1.25, variability: 0.9 },

  // Legacy aliases kept for imported configs and older saved scenarios.
  none: { label: 'Calm', currentPattern: 'calm', currentStrength: 0.2, variability: 0.15 },
  uniform: { label: 'Uniform Drift', currentPattern: 'uniformDrift', currentStrength: 0.75, variability: 0.25 },
  corridor: { label: 'Current Corridor', currentPattern: 'corridor', currentStrength: 1.05, variability: 0.4 },
  vortex: { label: 'Eddy Field', currentPattern: 'eddies', currentStrength: 1.1, variability: 0.55 },
  eddies: { label: 'Eddy Field', currentPattern: 'eddies', currentStrength: 1.1, variability: 0.55 },
  wave: { label: 'Gulf Inspired', currentPattern: 'gulfInspired', currentStrength: 1.0, variability: 0.65 },
  fluid: { label: 'Eddy Field', currentPattern: 'eddies', currentStrength: 1.1, variability: 0.55 }
};

export const CURRENT_PRESET_CHOICES = [
  'calm',
  'uniformDrift',
  'shearFlow',
  'currentCorridor',
  'eddyField',
  'doubleGyre',
  'tidalOscillation',
  'stormPulse',
  'islandWake',
  'gulfInspired',
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
  return VECTOR_FIELD_PRESETS[value] ? value : 'currentCorridor';
}

export function getVectorPresetConfig(value = 'currentCorridor', overrides = {}) {
  const preset = normalizeVectorPreset(value);
  const base = VECTOR_FIELD_PRESETS[preset];
  return {
    preset,
    label: base.label,
    type: 'parametric',
    temporalEvolution: overrides.temporalEvolution !== false,
    strength: Number(overrides.currentStrength ?? overrides.strength ?? base.currentStrength),
    variability: Number(overrides.currentVariability ?? overrides.variability ?? base.variability ?? 0.5),
    seed: overrides.seed ?? null,
    currentPattern: base.currentPattern,
    notes: 'Synthetic ocean-inspired current field for gameplay.'
  };
}
