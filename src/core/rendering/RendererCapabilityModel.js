export const RENDERER_CAPABILITY_MODEL_VERSION = 'renderer-capability-model-gfx-arch-r1';

export const RENDERER_BACKEND_IDS = Object.freeze([
  'phaser2d',
  'canvas2d',
  'webgl',
  'threeWebGL',
  'threeWebGPU',
  'rawWebGPU',
  'unsupported'
]);

const NOT_A = Object.freeze([
  'not simulation authority',
  'not scoring authority',
  'not planner',
  'not MARL/RL'
]);

export function normalizeRendererBackend(id) {
  const value = String(id ?? '').trim();
  const aliases = {
    phaser: 'phaser2d',
    phaser2D: 'phaser2d',
    canvas: 'canvas2d',
    canvas2D: 'canvas2d',
    webgl2: 'webgl',
    three: 'threeWebGL',
    threejs: 'threeWebGL',
    threeWebgl: 'threeWebGL',
    webgpu: 'rawWebGPU',
    threeWebgpu: 'threeWebGPU',
    none: 'unsupported'
  };
  const normalized = aliases[value] ?? value;
  return RENDERER_BACKEND_IDS.includes(normalized) ? normalized : 'unsupported';
}

export function detectRendererCapabilities(options = {}) {
  const injected = options.globals ?? options.globalThis ?? options.window ?? globalThis;
  const documentRef = options.document ?? injected?.document ?? null;
  const navigatorRef = options.navigator ?? injected?.navigator ?? null;
  const secureContext = Boolean(options.secureContext ?? injected?.isSecureContext ?? false);
  const supportsCanvas2D = Boolean(options.supportsCanvas2D ?? detectCanvasContext(documentRef, '2d'));
  const supportsWebGL = Boolean(options.supportsWebGL ?? (detectCanvasContext(documentRef, 'webgl2') || detectCanvasContext(documentRef, 'webgl')));
  const supportsWebGPU = Boolean(options.supportsWebGPU ?? (secureContext && navigatorRef?.gpu));
  const supportsThree = Boolean(options.supportsThree ?? options.three ?? injected?.THREE);
  const phaserAvailable = Boolean(options.phaserAvailable ?? injected?.Phaser);
  const warnings = [];

  if ((options.preferredBackend === 'rawWebGPU' || options.preferredBackend === 'threeWebGPU') && !supportsWebGPU) {
    warnings.push('Requested WebGPU backend is unavailable; use WebGL, Canvas2D, or Phaser fallback.');
  }
  if (navigatorRef?.gpu && !secureContext) warnings.push('WebGPU requires a secure context and is disabled here.');
  if ((options.preferredBackend === 'threeWebGL' || options.preferredBackend === 'threeWebGPU') && !supportsThree) {
    warnings.push('Three.js is not available; renderer host must use a non-Three fallback.');
  }

  const requested = normalizeRendererBackend(options.preferredBackend);
  const preferredBackend = backendSupported(requested, { supportsCanvas2D, supportsWebGL, supportsWebGPU, supportsThree, phaserAvailable })
    ? requested
    : choosePreferredBackend({ supportsCanvas2D, supportsWebGL, supportsWebGPU, supportsThree, phaserAvailable });
  const fallbackBackend = chooseFallbackBackend({ supportsCanvas2D, supportsWebGL, supportsWebGPU, supportsThree, phaserAvailable, preferredBackend });
  if (preferredBackend === 'unsupported') warnings.push('No supported browser rendering backend was detected.');

  return {
    type: 'anchor.rendering.capabilities',
    version: RENDERER_CAPABILITY_MODEL_VERSION,
    supportsCanvas2D,
    supportsWebGL,
    supportsWebGPU,
    supportsThree,
    secureContext,
    preferredBackend,
    fallbackBackend,
    warnings,
    notA: NOT_A.slice()
  };
}

export function rendererCapabilitySummary(capabilitiesInput = {}) {
  const capabilities = capabilitiesInput?.type === 'anchor.rendering.capabilities'
    ? capabilitiesInput
    : detectRendererCapabilities(capabilitiesInput);
  return {
    type: 'anchor.rendering.capability-summary',
    version: RENDERER_CAPABILITY_MODEL_VERSION,
    preferredBackend: normalizeRendererBackend(capabilities.preferredBackend),
    fallbackBackend: normalizeRendererBackend(capabilities.fallbackBackend),
    supportsCanvas2D: Boolean(capabilities.supportsCanvas2D),
    supportsWebGL: Boolean(capabilities.supportsWebGL),
    supportsWebGPU: Boolean(capabilities.supportsWebGPU),
    supportsThree: Boolean(capabilities.supportsThree),
    secureContext: Boolean(capabilities.secureContext),
    warningCount: capabilities.warnings?.length ?? 0,
    webgpuProgressiveEnhancement: true,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesWebGPUFluid: false,
    usesMARL: false,
    notA: NOT_A.slice()
  };
}

function choosePreferredBackend(caps) {
  if (caps.supportsThree && caps.supportsWebGPU) return 'threeWebGPU';
  if (caps.supportsThree && caps.supportsWebGL) return 'threeWebGL';
  if (caps.supportsWebGL) return 'webgl';
  if (caps.supportsCanvas2D) return 'canvas2d';
  if (caps.phaserAvailable) return 'phaser2d';
  return 'unsupported';
}

function chooseFallbackBackend(caps) {
  for (const backend of ['phaser2d', 'webgl', 'canvas2d']) {
    if (backend !== caps.preferredBackend && backendSupported(backend, caps)) return backend;
  }
  return backendSupported(caps.preferredBackend, caps) ? caps.preferredBackend : 'unsupported';
}

function backendSupported(backend, caps) {
  if (backend === 'unsupported') return false;
  if (backend === 'phaser2d') return caps.phaserAvailable;
  if (backend === 'canvas2d') return caps.supportsCanvas2D;
  if (backend === 'webgl') return caps.supportsWebGL;
  if (backend === 'threeWebGL') return caps.supportsThree && caps.supportsWebGL;
  if (backend === 'threeWebGPU') return caps.supportsThree && caps.supportsWebGPU;
  if (backend === 'rawWebGPU') return caps.supportsWebGPU;
  return false;
}

function detectCanvasContext(documentRef, contextId) {
  try {
    const canvas = documentRef?.createElement?.('canvas');
    return Boolean(canvas?.getContext?.(contextId));
  } catch (_error) {
    return false;
  }
}