export const DIFFICULTY_PRESETS = {
  tutorial: {
    width: 12,
    height: 12,
    currentStrength: 0.45,
    currentPattern: 'wave',
    roiPattern: 'single',
    roiHotspots: 1,
    hazardDensity: 0.02,
    terrainDensity: 0.02,
    duration: 40,
    planningWindow: 10,
    forecastMode: 'none'
  },
  easy: {
    width: 12,
    height: 12,
    currentStrength: 0.65,
    currentPattern: 'uniform',
    roiPattern: 'multiple',
    roiHotspots: 2,
    hazardDensity: 0.04,
    terrainDensity: 0.04,
    duration: 50,
    planningWindow: 10,
    forecastMode: 'none'
  },
  medium: {
    width: 14,
    height: 14,
    currentStrength: 0.9,
    currentPattern: 'vortex',
    roiPattern: 'multiple',
    roiHotspots: 3,
    hazardDensity: 0.07,
    terrainDensity: 0.08,
    duration: 60,
    planningWindow: 10,
    forecastMode: 'noisy'
  },
  hard: {
    width: 16,
    height: 16,
    currentStrength: 1.15,
    currentPattern: 'eddies',
    roiPattern: 'moving',
    roiHotspots: 4,
    hazardDensity: 0.1,
    terrainDensity: 0.12,
    duration: 70,
    planningWindow: 10,
    forecastMode: 'confidence'
  },
  chaotic: {
    width: 18,
    height: 18,
    currentStrength: 1.4,
    currentPattern: 'eddies',
    roiPattern: 'clustered',
    roiHotspots: 5,
    hazardDensity: 0.14,
    terrainDensity: 0.16,
    duration: 80,
    planningWindow: 8,
    forecastMode: 'confidence'
  }
};

export function applyDifficultyPreset(config = {}) {
  const preset = DIFFICULTY_PRESETS[config.difficulty ?? 'medium'] ?? DIFFICULTY_PRESETS.medium;
  return { ...preset, ...config };
}
