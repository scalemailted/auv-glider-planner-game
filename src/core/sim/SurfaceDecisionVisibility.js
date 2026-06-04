export const DEBUG_SURFACE_DECISION = false;

export function isSurfaceDecisionModalVisible(gameState = {}, domRoot = null) {
  const decision = gameState?.surfaceDecision;
  const stateActive = Boolean(decision?.active);
  const fallbackVisible = isElementVisible(findSurfaceFallback(domRoot));
  const domModalVisible = isElementVisible(findSurfaceModal(domRoot));
  const stateUiMounted = Boolean(decision?.uiMounted || decision?.modalVisible || decision?.fallbackVisible);

  return Boolean(
    domModalVisible ||
    fallbackVisible ||
    (stateActive && stateUiMounted)
  );
}

export function debugSurfaceDecision(message, details = {}) {
  if (!DEBUG_SURFACE_DECISION && !globalThis.DEBUG_SURFACE_DECISION) return;
  console.debug('[surface-decision]', message, details);
}

function findSurfaceFallback(domRoot) {
  const root = queryRoot(domRoot);
  return root?.querySelector?.('#simulation-surface-decision-actions, [data-surface-decision-fallback="true"]') ?? null;
}

function findSurfaceModal(domRoot) {
  const root = queryRoot(domRoot);
  return root?.querySelector?.('[data-surface-decision-modal="true"], [data-surface-decision-visible="true"]') ?? null;
}

function queryRoot(domRoot) {
  if (domRoot?.querySelector) return domRoot;
  return globalThis.document ?? null;
}

function isElementVisible(element) {
  if (!element) return false;
  if (element.hidden || element.getAttribute?.('aria-hidden') === 'true') return false;
  const style = globalThis.getComputedStyle?.(element);
  if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
  if (typeof element.getClientRects === 'function') return element.getClientRects().length > 0;
  return true;
}
