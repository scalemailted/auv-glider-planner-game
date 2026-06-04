import { PHASER_HEIGHT, PHASER_WIDTH } from './PhaserCoreAdapter.js';

const DEFAULT_PADDING = 28;
export function getViewportMapBounds(app, {
  topPadding = DEFAULT_PADDING,
  sidePadding = DEFAULT_PADDING,
  bottomPadding = DEFAULT_PADDING,
  fallbackTop = 72,
  fallbackBottom = 92
} = {}) {
  const canvas = app?.phaser?.canvas ?? globalThis.document?.getElementById?.('game-canvas');
  const shell = app?.elements?.viewportShell ?? app?.elements?.gameContainer;
  const canvasRect = canvas?.getBoundingClientRect?.();
  const shellRect = shell?.getBoundingClientRect?.();
  const gameSize = getGameSize(app, canvasRect);
  if (!canvasRect || !shellRect || canvasRect.width <= 0 || canvasRect.height <= 0) {
    return {
      x: sidePadding,
      y: fallbackTop,
      width: gameSize.width - sidePadding * 2,
      height: gameSize.height - fallbackTop - fallbackBottom
    };
  }

  const scaleX = gameSize.width / canvasRect.width;
  const scaleY = gameSize.height / canvasRect.height;
  const overlay = app?.elements?.overlay ?? {};
  const topCss = maxVisibleBottom(shellRect, [
    overlay.missionSummaryHud,
    overlay.topHud
  ]);
  const bottomCss = minVisibleTop(shellRect, [
    overlay.bottomTimeline,
    overlay.agentPerformanceHud
  ]);

  const top = Math.max(fallbackTop, Math.ceil(topCss * scaleY) + topPadding);
  const bottom = Math.min(
    gameSize.height - fallbackBottom,
    Math.floor((bottomCss || shellRect.height) * scaleY) - bottomPadding
  );
  const x = sidePadding;
  const y = Math.max(topPadding, top);
  const width = Math.max(1, gameSize.width - sidePadding * 2);
  const height = Math.max(1, bottom - y);

  if (y + height > gameSize.height - bottomPadding) {
    return {
      x,
      y: topPadding,
      width,
      height: Math.max(1, gameSize.height - topPadding - bottomPadding)
    };
  }

  return { x, y, width, height };
}

function getGameSize(app, canvasRect) {
  const scale = app?.phaser?.scale;
  return {
    width: Math.max(1, Number(scale?.width ?? app?.phaser?.canvas?.width ?? canvasRect?.width ?? PHASER_WIDTH)),
    height: Math.max(1, Number(scale?.height ?? app?.phaser?.canvas?.height ?? canvasRect?.height ?? PHASER_HEIGHT))
  };
}

function maxVisibleBottom(shellRect, elements) {
  let bottom = 0;
  for (const element of elements) {
    if (!isVisibleElement(element)) continue;
    const rect = element.getBoundingClientRect();
    bottom = Math.max(bottom, rect.bottom - shellRect.top);
  }
  return bottom;
}

function minVisibleTop(shellRect, elements) {
  let top = null;
  for (const element of elements) {
    if (!isVisibleElement(element)) continue;
    const rect = element.getBoundingClientRect();
    const value = rect.top - shellRect.top;
    top = top === null ? value : Math.min(top, value);
  }
  return top;
}

function isVisibleElement(element) {
  if (!element || !element.innerHTML?.trim()) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}
