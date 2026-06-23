export const CURRENT_VISUALIZATION_BACKEND_CONTRACT_VERSION = 'current-visualization-backend-contract-flow-r2a-3';

export const CURRENT_VISUALIZATION_BACKEND_IDS = Object.freeze([
  'webglInstancedGlyphsV1',
  'webgpuInstancedGlyphsV1',
  'webgpuTracerAdvectionV1',
  'webgpuLocalFluidPerturbationV1'
]);

export function createCurrentVisualizationBackendDescriptor(id = 'webglInstancedGlyphsV1', options = {}) {
  const supported = id === 'webglInstancedGlyphsV1';
  return {
    type: 'anchor.rendering.current-visualization-backend-descriptor',
    version: CURRENT_VISUALIZATION_BACKEND_CONTRACT_VERSION,
    id,
    implemented: supported,
    reserved: !supported,
    ownsCurrentAuthority: false,
    ownsSimulation: false,
    ownsScoring: false,
    changesOfficialScoring: false,
    usesWebGpu: id.startsWith('webgpu'),
    supportsInstancedGlyphs: id === 'webglInstancedGlyphsV1',
    supportsTracers: false,
    supportsPathlines: false,
    notes: supported
      ? 'Implemented FLOW-R2A.3 WebGL/Three instanced glyph presentation backend. OceanCurrentField4D remains the current authority.'
      : 'Reserved for a later FLOW phase; not implemented in FLOW-R2A.3. WebGPU may accelerate rendering or tracer advection, but it does not replace the canonical regional current source.',
    initialize: options.includeMethods ? noop : undefined,
    updateField: options.includeMethods ? noop : undefined,
    dispose: options.includeMethods ? noop : undefined
  };
}

export function currentVisualizationBackendRoadmap() {
  return {
    version: CURRENT_VISUALIZATION_BACKEND_CONTRACT_VERSION,
    phases: [
      { id: 'FLOW-R2A', scope: 'canonical current cube and instanced slab vectors' },
      { id: 'FLOW-R2A.3', scope: 'scientifically constrained 4D currents, diagnostics, and volumetric depth-time rendering' },
      { id: 'FLOW-R2B', scope: 'display-only tracers, pathlines, stream ribbons, and route-current inspection' },
      { id: 'DATA-R1', scope: 'checked-in NetCDF-derived fixture pipeline' },
      { id: 'FLOW-R3', scope: 'optional WebGPU compute backend for tracer/pathline advection' },
      { id: 'FLUID-R1', scope: 'optional bounded local WebGPU fluid perturbation research layer' }
    ],
    boundaries: {
      oceanCurrentField4DRemainsCurrentAuthority: true,
      webGpuDoesNotReplaceRegionalCurrentAuthority: true,
      webGpuFluidMechanicsDoNotBecomeRegionalForecast: true,
      mlsMpmAndSphAreNotHycom: true,
      localPerturbationsMustBeOptionalBoundedAndExplicitlySourced: true,
      localPerturbationsMustBeCompositedExplicitly: true
    }
  };
}

export function validateCurrentVisualizationBackendDescriptor(descriptor = {}) {
  const errors = [];
  if (descriptor.type !== 'anchor.rendering.current-visualization-backend-descriptor') errors.push('Unexpected current visualization backend descriptor type.');
  if (!CURRENT_VISUALIZATION_BACKEND_IDS.includes(descriptor.id)) errors.push(`Unsupported current visualization backend id: ${descriptor.id}.`);
  if (descriptor.ownsCurrentAuthority) errors.push('Current visualization backend must not own current authority.');
  if (descriptor.changesOfficialScoring) errors.push('Current visualization backend must not change official scoring.');
  if (descriptor.id !== 'webglInstancedGlyphsV1' && descriptor.implemented === true) errors.push(`${descriptor.id} is reserved and must not be implemented in FLOW-R2A.`);
  return { valid: errors.length === 0, errors, descriptor };
}

function noop() {
  return { implemented: false, reason: 'Descriptor-only method placeholder.' };
}
