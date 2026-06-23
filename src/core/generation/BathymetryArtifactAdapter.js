import {
  BATHYMETRY_PACKAGE_VERSION,
  bathymetryArtifactSummary,
  createBathymetryArtifact,
  createBathymetrySampler,
  validateBathymetryArtifact
} from '../../../packages/bathymetry/src/index.js';

export const BATHYMETRY_ARTIFACT_ADAPTER_VERSION = 'bathymetry-artifact-adapter-bathy-pkg-r1';

export function createBathymetryArtifactFromField(bathymetry = {}, options = {}) {
  const physicalExtentMeters = options.physicalExtentMeters ?? extentFromDomain(options.operationalDomain ?? bathymetry.operationalDomain);
  const artifact = createBathymetryArtifact({
    id: options.id ?? bathymetry.id ?? bathymetry.seed ?? 'production-bathymetry-artifact',
    bathymetry,
    signedTerrainSurface: options.signedTerrainSurface ?? bathymetry.signedTerrainSurface,
    physicalExtentMeters,
    sourceMetadata: options.sourceMetadata ?? bathymetry.sourceMetadata,
    provenance: {
      generatedBy: 'src/core/generation/BathymetryArtifactAdapter.js',
      generatorVersion: BATHYMETRY_ARTIFACT_ADAPTER_VERSION,
      synthetic: bathymetry.synthetic !== false,
      calibratedBathymetry: false,
      operationalNavigationProduct: false,
      ...(options.provenance ?? {})
    },
    boundaryFlags: {
      rendererOwnsBathymetry: false,
      simulationOwnsBathymetryGeneration: false,
      packageUsesThree: false,
      packageUsesPhaser: false,
      packageUsesDom: false,
      ...(options.boundaryFlags ?? {})
    }
  });
  return {
    ...artifact,
    adapterVersion: BATHYMETRY_ARTIFACT_ADAPTER_VERSION,
    bathymetryPackageVersion: BATHYMETRY_PACKAGE_VERSION,
    validationReport: validateBathymetryArtifact(artifact)
  };
}

export function bathymetryArtifactAdapterSummary(artifact = {}) {
  const summary = bathymetryArtifactSummary(artifact);
  return {
    ...summary,
    type: 'anchor.generation.bathymetry-artifact-adapter-summary',
    adapterVersion: BATHYMETRY_ARTIFACT_ADAPTER_VERSION,
    bathymetryPackageVersion: BATHYMETRY_PACKAGE_VERSION,
    rendererOwnsBathymetry: false,
    simulationOwnsBathymetryGeneration: false,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false
  };
}

export function createPreparedBathymetryArtifactSampler(artifact) {
  return createBathymetrySampler(artifact);
}

function extentFromDomain(domain = {}) {
  const horizontal = domain?.horizontal ?? domain;
  const east = Number(horizontal.widthMeters ?? (Number(horizontal.maxEastMeters) - Number(horizontal.minEastMeters)));
  const north = Number(horizontal.heightMeters ?? (Number(horizontal.maxNorthMeters) - Number(horizontal.minNorthMeters)));
  if (Number.isFinite(east) && Number.isFinite(north) && east > 0 && north > 0) return { east, north };
  return null;
}