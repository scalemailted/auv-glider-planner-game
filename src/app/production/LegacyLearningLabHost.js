export const ANCHOR_LEGACY_LEARNING_LAB_HOST_VERSION = 'three-r3a-legacy-learning-lab-host';

export async function mountLegacyLearningLabIsland(container, options = {}) {
  const debug = ensureLegacyDebug();
  await ensureLegacyPhaserLoaded();
  debug.loaded = Boolean(globalThis.Phaser?.Game);
  debug.active = true;
  debug.activeScene = options.sceneKey ?? 'R3ALegacyLearningLabScene';
  container.innerHTML = '';
  const host = document.createElement('div');
  host.className = 'legacy-learning-lab-island';
  host.setAttribute('aria-label', 'Learning Lab legacy island');
  container.appendChild(host);
  const SceneBase = globalThis.Phaser?.Scene ?? class {};
  class R3ALegacyLearningLabScene extends SceneBase {
    constructor() { super('R3ALegacyLearningLabScene'); }
    create() {
      const width = this.scale?.width ?? 960;
      const height = this.scale?.height ?? 640;
      this.add?.rectangle?.(width / 2, height / 2, width, height, 0x06111f, 1);
      this.add?.text?.(width / 2, height / 2, 'Learning Lab island', { color: '#dff8ff', fontSize: '28px', fontFamily: 'Arial' })?.setOrigin?.(0.5);
    }
  }
  const game = new globalThis.Phaser.Game({
    type: globalThis.Phaser.AUTO,
    parent: host,
    width: Math.max(320, container.clientWidth || 960),
    height: Math.max(240, container.clientHeight || 640),
    backgroundColor: '#06111f',
    scene: [R3ALegacyLearningLabScene],
    scale: { mode: globalThis.Phaser.Scale.RESIZE, autoCenter: globalThis.Phaser.Scale.NO_CENTER }
  });
  debug.instanceCount += 1;
  return {
    type: 'anchor.production.legacy-learning-lab-island',
    version: ANCHOR_LEGACY_LEARNING_LAB_HOST_VERSION,
    game,
    dispose() {
      try { game.destroy?.(true); } catch (error) { debug.failures.push(String(error?.message ?? error)); }
      host.remove?.();
      debug.active = false;
      debug.activeScene = null;
      debug.destroyCount += 1;
      debug.staleCanvasCount = document.querySelectorAll('.legacy-learning-lab-island canvas').length;
    }
  };
}

function ensureLegacyDebug() {
  globalThis.ANCHOR_LEGACY_ISLAND_DEBUG ??= {
    loaded: false,
    active: false,
    activeScene: null,
    instanceCount: 0,
    destroyCount: 0,
    staleCanvasCount: 0,
    failures: []
  };
  return globalThis.ANCHOR_LEGACY_ISLAND_DEBUG;
}

async function ensureLegacyPhaserLoaded() {
  if (globalThis.Phaser?.Game) return;
  const script = document.createElement('script');
  script.src = new URL('../../../vendor/phaser.min.js', import.meta.url).href;
  script.async = false;
  script.dataset.anchorLegacyPhaserVendor = 'true';
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${script.src}`));
    document.head.appendChild(script);
  });
}
