export const ENVIRONMENT_GENERATOR_BACKEND_CONTRACT_VERSION = 'environment-generator-backend-contract-flow-r2a-5-1';

export const ENVIRONMENT_GENERATOR_BACKENDS = Object.freeze([
  {
    id: 'cpuBathymetryConditionedSyntheticV2',
    label: 'CPU bathymetry-conditioned synthetic environment V2',
    implemented: true,
    deterministic: true,
    browserCompatible: true,
    usesWebGpu: false,
    importsOperationalData: false,
    claimBoundary: 'Synthetic educational environment generator. Not calibrated ocean forecast data.'
  },
  {
    id: 'cpuBathymetryConditionedSyntheticV3',
    label: 'CPU bathymetry-conditioned depth-structured synthetic environment V3',
    implemented: true,
    deterministic: true,
    browserCompatible: true,
    usesWebGpu: false,
    importsOperationalData: false,
    claimBoundary: 'Synthetic educational depth-structured current generator. Not calibrated ocean forecast data.'
  },
  {
    id: 'webgpuOceanSyntheticV1Reserved',
    label: 'Reserved WebGPU ocean synthetic backend',
    implemented: false,
    deterministic: null,
    browserCompatible: false,
    usesWebGpu: true,
    importsOperationalData: false,
    claimBoundary: 'Reserved only; not implemented in ENV-PKG-R1.'
  },
  {
    id: 'importedOperationalFieldReserved',
    label: 'Reserved imported operational field backend',
    implemented: false,
    deterministic: null,
    browserCompatible: false,
    usesWebGpu: false,
    importsOperationalData: true,
    claimBoundary: 'Reserved only; no calibrated external ocean product is imported by this phase.'
  }
]);

export function normalizeEnvironmentGeneratorBackend(value = 'cpuBathymetryConditionedSyntheticV3') {
  const id = String(value?.id ?? value ?? 'cpuBathymetryConditionedSyntheticV3').trim() || 'cpuBathymetryConditionedSyntheticV3';
  return ENVIRONMENT_GENERATOR_BACKENDS.find((backend) => backend.id === id) ?? {
    id,
    label: id,
    implemented: false,
    deterministic: null,
    browserCompatible: false,
    usesWebGpu: false,
    importsOperationalData: false,
    claimBoundary: 'Unknown environment generator backend; not implemented.'
  };
}

export function validateEnvironmentGeneratorBackend(value = 'cpuBathymetryConditionedSyntheticV3') {
  const backend = normalizeEnvironmentGeneratorBackend(value);
  const errors = [];
  const warnings = [];
  if (!backend.implemented) errors.push(`Environment generator backend ${backend.id} is not implemented in this browser build.`);
  if (backend.usesWebGpu) warnings.push('WebGPU environment generation is reserved and not active.');
  if (backend.importsOperationalData) warnings.push('Imported operational-field generation is reserved and not active.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, backend };
}
