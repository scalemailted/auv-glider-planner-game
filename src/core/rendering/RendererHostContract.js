import { normalizeRendererBackend, RENDERER_BACKEND_IDS } from './RendererCapabilityModel.js';

export const RENDERER_HOST_CONTRACT_VERSION = 'renderer-host-contract-gfx-arch-r1';

const DEFAULT_NOT_A = Object.freeze([
  'not simulation authority',
  'not scoring authority',
  'not planner',
  'not MARL/RL'
]);

export function createRendererSceneDescriptor(options = {}) {
  return {
    type: 'anchor.rendering.scene-descriptor',
    version: RENDERER_HOST_CONTRACT_VERSION,
    id: cleanId(options.id, 'renderer-scene'),
    label: String(options.label ?? 'Renderer Scene'),
    rendererBackend: normalizeRendererBackend(options.rendererBackend ?? options.backend ?? 'phaser2d'),
    fallbackBackend: normalizeRendererBackend(options.fallbackBackend ?? 'phaser2d'),
    purpose: String(options.purpose ?? 'Renderer host scene descriptor.'),
    requiredCapabilities: normalizeStringList(options.requiredCapabilities),
    optionalCapabilities: normalizeStringList(options.optionalCapabilities),
    consumesViewModelTypes: normalizeStringList(options.consumesViewModelTypes),
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    warnings: normalizeStringList(options.warnings),
    notA: DEFAULT_NOT_A.slice()
  };
}

export function validateRendererSceneDescriptor(descriptor = {}) {
  const errors = [];
  const warnings = [];
  if (descriptor.type !== 'anchor.rendering.scene-descriptor') errors.push('Scene descriptor type must be anchor.rendering.scene-descriptor.');
  if (!descriptor.id) errors.push('Scene descriptor requires an id.');
  if (!descriptor.label) errors.push('Scene descriptor requires a label.');
  if (!RENDERER_BACKEND_IDS.includes(normalizeRendererBackend(descriptor.rendererBackend))) errors.push('Scene descriptor rendererBackend is not recognized.');
  if (!RENDERER_BACKEND_IDS.includes(normalizeRendererBackend(descriptor.fallbackBackend))) errors.push('Scene descriptor fallbackBackend is not recognized.');
  if (descriptor.ownsSimulationState === true) errors.push('Renderer scene descriptors must not own simulation state.');
  if (descriptor.ownsScoring === true) errors.push('Renderer scene descriptors must not own scoring.');
  if (descriptor.ownsPlanning === true) errors.push('Renderer scene descriptors must not own planning.');
  if (!Array.isArray(descriptor.consumesViewModelTypes) || descriptor.consumesViewModelTypes.length === 0) {
    warnings.push('Scene descriptor should declare consumed view model types.');
  }
  return validationResult('anchor.rendering.scene-descriptor-validation', errors, warnings);
}

export function createRendererHostConfig(options = {}) {
  const scenes = normalizeSceneDescriptors(options.scenes ?? options.sceneDescriptors);
  return {
    type: 'anchor.rendering.host-config',
    version: RENDERER_HOST_CONTRACT_VERSION,
    id: cleanId(options.id, 'renderer-host'),
    label: String(options.label ?? 'Renderer Host'),
    capabilities: options.capabilities ?? null,
    preferredBackend: normalizeRendererBackend(options.preferredBackend ?? options.capabilities?.preferredBackend ?? 'phaser2d'),
    fallbackBackend: normalizeRendererBackend(options.fallbackBackend ?? options.capabilities?.fallbackBackend ?? 'phaser2d'),
    scenes,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesWebGPUFluid: false,
    usesMARL: false,
    warnings: normalizeStringList(options.warnings),
    notA: DEFAULT_NOT_A.slice()
  };
}

export function validateRendererHostConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (config.type !== 'anchor.rendering.host-config') errors.push('Renderer host config type must be anchor.rendering.host-config.');
  if (!config.id) errors.push('Renderer host config requires an id.');
  if (!RENDERER_BACKEND_IDS.includes(normalizeRendererBackend(config.preferredBackend))) errors.push('Renderer host preferredBackend is not recognized.');
  if (!RENDERER_BACKEND_IDS.includes(normalizeRendererBackend(config.fallbackBackend))) errors.push('Renderer host fallbackBackend is not recognized.');
  if (config.ownsSimulationState === true) errors.push('Renderer host must not own simulation state.');
  if (config.ownsScoring === true) errors.push('Renderer host must not own scoring.');
  if (config.ownsPlanning === true) errors.push('Renderer host must not own planning.');
  if (config.usesWebGPUFluid === true) errors.push('GFX-ARCH-R1 must not enable WebGPU fluid simulation.');
  if (config.usesMARL === true) errors.push('GFX-ARCH-R1 must not enable MARL/RL.');
  const scenes = Array.isArray(config.scenes) ? config.scenes : [];
  if (scenes.length === 0) warnings.push('Renderer host has no registered scene descriptors.');
  for (const descriptor of scenes) {
    const result = validateRendererSceneDescriptor(descriptor);
    errors.push(...result.errors.map((message) => `${descriptor.id ?? 'scene'}: ${message}`));
    warnings.push(...result.warnings.map((message) => `${descriptor.id ?? 'scene'}: ${message}`));
  }
  return validationResult('anchor.rendering.host-config-validation', errors, warnings);
}

export function rendererHostSummary(config = {}) {
  const validation = validateRendererHostConfig(config);
  const scenes = Array.isArray(config.scenes) ? config.scenes : [];
  return {
    type: 'anchor.rendering.host-summary',
    version: RENDERER_HOST_CONTRACT_VERSION,
    id: config.id ?? null,
    label: config.label ?? null,
    preferredBackend: normalizeRendererBackend(config.preferredBackend),
    fallbackBackend: normalizeRendererBackend(config.fallbackBackend),
    sceneCount: scenes.length,
    sceneIds: scenes.map((scene) => scene.id).filter(Boolean),
    consumesViewModelTypes: [...new Set(scenes.flatMap((scene) => scene.consumesViewModelTypes ?? []))],
    status: validation.status,
    warningCount: validation.warnings.length,
    errorCount: validation.errors.length,
    ownsSimulationState: false,
    ownsScoring: false,
    ownsPlanning: false,
    usesWebGPUFluid: false,
    usesMARL: false,
    notA: DEFAULT_NOT_A.slice()
  };
}

function normalizeSceneDescriptors(scenes) {
  return (Array.isArray(scenes) ? scenes : []).map((scene) => {
    if (scene?.type === 'anchor.rendering.scene-descriptor') return createRendererSceneDescriptor(scene);
    return createRendererSceneDescriptor(scene ?? {});
  });
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
}

function cleanId(value, fallback) {
  const id = String(value ?? fallback).trim();
  return id || fallback;
}

function validationResult(type, errors, warnings) {
  return {
    type,
    version: RENDERER_HOST_CONTRACT_VERSION,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}