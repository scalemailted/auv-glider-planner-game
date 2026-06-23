export const CURRENT_PRESENTATION_STATE_VERSION = 'current-presentation-state-flow-r2a-4';

export function normalizeCurrentDisplayMode(mode = 'activeSlice') {
  if (mode === 'activeLayerOnly' || mode === 'activeCurrentSlice') return 'activeSlice';
  if (mode === 'allLayers' || mode === 'stackedCurrentSlabs') return 'allLayers';
  if (mode === 'stackedDepthField' || mode === 'volumetricStackedCurrent') return 'stackedDepthField';
  if (mode === 'explodedDepthField' || mode === 'volumetricExplodedCurrent') return 'explodedDepthField';
  if (mode === 'sparseVolumetricField' || mode === 'volumetricCurrentField') return 'sparseVolumetricField';
  return String(mode ?? 'activeSlice');
}

export function normalizeRendererCurrentDisplayMode(mode = 'activeSlice') {
  const normalized = normalizeCurrentDisplayMode(mode);
  if (normalized === 'activeSlice') return 'activeCurrentSlice';
  if (normalized === 'allLayers') return 'stackedCurrentSlabs';
  return normalized;
}

export function isExplicitCurrentSafeMode(locationOrSearch = null) {
  try {
    const search = typeof locationOrSearch === 'string'
      ? locationOrSearch
      : locationOrSearch?.search ?? globalThis.location?.search ?? '';
    return new URLSearchParams(search).get('currentDisplay') === 'safe';
  } catch (_error) {
    return false;
  }
}

export function currentVectorsVisible({ ui = {}, layers = {}, search = null } = {}) {
  if (isExplicitCurrentSafeMode(search)) return false;
  if (ui.showCurrents === false) return false;
  return layers.currentVectors !== false;
}

export function currentPresentationCacheSignature(viewModel = {}, search = null) {
  const waterColumn = viewModel.waterColumn ?? viewModel.displaySettings?.waterColumn ?? {};
  return [
    CURRENT_PRESENTATION_STATE_VERSION,
    normalizeCurrentDisplayMode(waterColumn.currentDisplayMode ?? viewModel.currentDisplayMode ?? 'activeSlice'),
    waterColumn.currentLayerMode ?? 'followSelectedGlider',
    viewModel.currentActiveLayerId ?? viewModel.currentVisualization?.currentActiveLayerId ?? viewModel.activeDepthLayerId ?? 'none',
    waterColumn.currentVectorDensity ?? 'balanced',
    Number(waterColumn.currentMagnitudeScale ?? 1.8),
    waterColumn.currentColorMode ?? 'speed',
    waterColumn.showContextCurrents === true,
    viewModel.visibility?.currentVectors !== false,
    isExplicitCurrentSafeMode(search)
  ].join(':');
}

export function buildCurrentPresentationDebug({
  phase = null,
  runtimeShell = 'default',
  viewModel = {},
  rendererSummary = null,
  currentDebug = null,
  ui = {},
  layerVisibility = {},
  search = null,
  warnings = []
} = {}) {
  const waterColumn = viewModel.waterColumn ?? viewModel.displaySettings?.waterColumn ?? ui.waterColumn ?? {};
  const safeModeExplicit = isExplicitCurrentSafeMode(search);
  const normalizedDisplayMode = normalizeCurrentDisplayMode(waterColumn.currentDisplayMode ?? currentDebug?.currentDisplayMode ?? 'activeSlice');
  const rendererDisplayMode = normalizeRendererCurrentDisplayMode(normalizedDisplayMode);
  const sourceVectorSampleCount = Number(currentDebug?.sourceVectorSampleCount ?? rendererSummary?.sourceVectorSampleCount ?? 0);
  const finiteVectorSampleCount = Number(currentDebug?.finiteVectorSampleCount ?? rendererSummary?.finiteVectorSampleCount ?? 0);
  const nonzeroVectorSampleCount = Number(currentDebug?.nonzeroVectorSampleCount ?? rendererSummary?.nonzeroVectorSampleCount ?? 0);
  const glyphInstanceCount = Number(currentDebug?.glyphInstanceCount ?? rendererSummary?.glyphInstanceCount ?? 0);
  const visibleVectorInstanceCount = Number(currentDebug?.visibleVectorInstanceCount ?? rendererSummary?.visibleVectorInstanceCount ?? glyphInstanceCount ?? 0);
  const requested = safeModeExplicit ? false : (ui.showCurrents !== false && layerVisibility.currentVectors !== false && currentDebug?.currentPresentationRequested !== false);
  const enabled = requested && rendererSummary?.currentGlyphPresentationFailed !== true && visibleVectorInstanceCount > 0;
  const reason = enabled
    ? null
    : safeModeExplicit
      ? 'Safe Display mode'
      : ui.showCurrents === false || layerVisibility.currentVectors === false
        ? 'current vectors hidden by UI controls'
        : rendererSummary?.currentGlyphPresentationFailed === true
          ? rendererSummary.currentGlyphPresentationWarning ?? 'current glyph presentation failed'
          : sourceVectorSampleCount <= 0
            ? 'no current samples reached the renderer'
            : finiteVectorSampleCount <= 0
              ? 'current samples are not finite'
              : nonzeroVectorSampleCount <= 0
                ? 'current samples are zero magnitude'
                : 'current glyphs are not visible in the active renderer';
  return {
    type: 'anchor.debug.current-presentation',
    version: CURRENT_PRESENTATION_STATE_VERSION,
    phase,
    runtimeShell,
    normalizedDisplayMode,
    rendererDisplayMode,
    safeModeExplicit,
    currentPresentationRequested: requested,
    currentPresentationEnabled: enabled,
    currentLayerMode: waterColumn.currentLayerMode ?? 'followSelectedGlider',
    currentActiveLayerId: currentDebug?.currentActiveLayerId ?? viewModel.currentActiveLayerId ?? viewModel.currentVisualization?.currentActiveLayerId ?? null,
    currentActiveDepthMeters: currentDebug?.currentActiveDepthMeters ?? viewModel.currentActiveDepthMeters ?? null,
    sourceVectorSampleCount,
    finiteVectorSampleCount,
    nonzeroVectorSampleCount,
    visibleVectorInstanceCount,
    glyphInstanceCount,
    glyphDrawCallCount: Number(currentDebug?.glyphDrawCallCount ?? rendererSummary?.glyphDrawCallCount ?? 0),
    glyphBoundsInFrustum: currentDebug?.glyphBoundsInFrustum ?? rendererSummary?.glyphBoundsInFrustum ?? null,
    noVisibleVectorsReason: currentDebug?.noVisibleVectorsReason ?? reason,
    cacheSignature: currentPresentationCacheSignature(viewModel, search),
    rendererOwnsCurrent: false,
    displayLayerChangesCurrent: false,
    changesOfficialScoring: false,
    warnings: [...warnings]
  };
}