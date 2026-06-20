export const THREE_RENDER_COST_POLICY_VERSION = 'three-render-cost-policy-r1-2a-4-4';

export const THREE_QUALITY_PROFILES = Object.freeze({
  performance: Object.freeze({
    id: 'performance',
    label: 'Performance',
    pixelRatioLimit: 1,
    presentationCadenceLimit: 20,
    contextSlabMode: 'outline',
    allLayerFieldTexturesDefault: false,
    currentVectorStride: 3
  }),
  balanced: Object.freeze({
    id: 'balanced',
    label: 'Balanced',
    pixelRatioLimit: 1.25,
    presentationCadenceLimit: 30,
    contextSlabMode: 'outline',
    allLayerFieldTexturesDefault: false,
    currentVectorStride: 2
  }),
  high: Object.freeze({
    id: 'high',
    label: 'High',
    pixelRatioLimit: 2,
    presentationCadenceLimit: 60,
    contextSlabMode: 'outline',
    allLayerFieldTexturesDefault: false,
    currentVectorStride: 1
  })
});

export const THREE_MATERIAL_RENDER_ORDER_POLICY = Object.freeze({
  opaqueTerrain: 10,
  waterFrame: 42,
  contextSlabs: 56,
  activeScalarSlab: 84,
  plannedAndRealizedPaths: 120,
  gliders: 150,
  targetsAndObservations: 170,
  labelsAndSelection: 220
});

export function normalizeThreeQualityProfile(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (id === 'perf' || id === 'performance') return 'performance';
  if (id === 'high' || id === 'quality') return 'high';
  return 'balanced';
}

export function threeQualityProfileSettings(value) {
  return THREE_QUALITY_PROFILES[normalizeThreeQualityProfile(value)] ?? THREE_QUALITY_PROFILES.balanced;
}

export function effectiveThreePixelRatio({ devicePixelRatio = globalThis.devicePixelRatio, qualityProfile = 'balanced' } = {}) {
  const limit = threeQualityProfileSettings(qualityProfile).pixelRatioLimit;
  const device = positiveNumber(devicePixelRatio, 1);
  return round(Math.max(0.75, Math.min(limit, device)));
}

export function waterColumnDisplayPolicy(viewModel = {}) {
  const waterColumn = viewModel.displaySettings?.waterColumn ?? viewModel.waterColumn ?? {};
  const qualityProfile = normalizeThreeQualityProfile(waterColumn.qualityProfile ?? viewModel.displaySettings?.qualityProfile ?? viewModel.options?.qualityProfile ?? 'balanced');
  const settings = threeQualityProfileSettings(qualityProfile);
  const allLayerFieldTexturesEnabled = waterColumn.fieldDisplayMode === 'allLayers'
    || waterColumn.showFieldOnAllLayers === true
    || viewModel.visibility?.activeLayerOnlyFields === false;
  return {
    version: THREE_RENDER_COST_POLICY_VERSION,
    qualityProfile,
    pixelRatioLimit: settings.pixelRatioLimit,
    presentationCadenceLimit: settings.presentationCadenceLimit,
    contextSlabMode: settings.contextSlabMode,
    allLayerFieldTexturesEnabled,
    activeDepthLayerId: viewModel.activeDepthLayerId ?? waterColumn.activeDepthLayerId ?? 'surface'
  };
}

export function depthLayerPresentationMode(viewModel = {}, depthLayerId = null) {
  const policy = waterColumnDisplayPolicy(viewModel);
  const id = String(depthLayerId ?? '');
  if (policy.allLayerFieldTexturesEnabled || id === String(policy.activeDepthLayerId ?? '')) return 'activeTextured';
  return policy.contextSlabMode === 'hidden' ? 'hidden' : 'contextOutline';
}

export function shouldRenderVolumetricFieldPlanes(viewModel = {}) {
  const waterColumn = viewModel.displaySettings?.waterColumn ?? viewModel.waterColumn ?? {};
  const mode = String(waterColumn.scalarRenderMode ?? waterColumn.volumeRenderMode ?? '').trim();
  const policy = waterColumnDisplayPolicy(viewModel);
  return policy.allLayerFieldTexturesEnabled === true || mode === 'volumetricCloud' || mode === 'hybrid';
}

export function renderCostPolicySummary(viewModel = {}) {
  const policy = waterColumnDisplayPolicy(viewModel);
  return {
    type: 'anchor.renderer.three-render-cost-policy-summary',
    version: THREE_RENDER_COST_POLICY_VERSION,
    ...policy,
    materialRenderOrderPolicy: { ...THREE_MATERIAL_RENDER_ORDER_POLICY },
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    usesWebGPU: false
  };
}

function positiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function round(value, digits = 3) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : 0;
}
