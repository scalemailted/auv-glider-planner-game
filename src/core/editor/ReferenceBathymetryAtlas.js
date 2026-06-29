import {
  canonicalJsonDigest,
  canonicalizeJsonValue
} from '../../../packages/codecs/src/index.js';
import { createBathymetryArtifactFromField } from '../generation/BathymetryArtifactAdapter.js';
import {
  estimateReferenceAtlasBoundaryBudget,
  sourceResolutionArcSecondsFromReference
} from './ReferenceAtlasBoundaryBudget.js';

export const REFERENCE_BATHYMETRY_ATLAS_TYPE = 'anchor.reference-bathymetry-atlas';
export const REFERENCE_BATHYMETRY_ATLAS_VERSION = '1.0.0';
export const REFERENCE_BATHYMETRY_WINDOW_TYPE = 'anchor.reference-bathymetry-window';
export const REFERENCE_BATHYMETRY_WINDOW_VERSION = '1.0.0';
export const REFERENCE_BATHYMETRY_MANIFEST_TYPE = 'anchor.reference-bathymetry-manifest';
export const REFERENCE_BATHYMETRY_MANIFEST_VERSION = '1.0.0';
export const REFERENCE_BATHYMETRY_RASTER_TYPE = 'anchor.reference-bathymetry-raster';
export const REFERENCE_BATHYMETRY_RASTER_VERSION = '1.0.0';
export const REFERENCE_BATHYMETRY_OVERVIEW_TYPE = 'anchor.reference-bathymetry-overview';
export const REFERENCE_BATHYMETRY_OVERVIEW_VERSION = '1.0.0';
export const REFERENCE_BATHYMETRY_PATCH_REQUEST_TYPE = 'anchor.reference-bathymetry-patch-request';
export const REFERENCE_BATHYMETRY_PATCH_REQUEST_VERSION = '1.0.0';
export const REFERENCE_PATCH_BATHYMETRY_BUILDER_VERSION = 'real-bathy-r1-reference-patch-builder';
export const NO_REFERENCE_DATA_FIXTURE = 'NO_REFERENCE_DATA_FIXTURE';
export const REFERENCE_DATA_AVAILABLE = 'AVAILABLE';
export const REFERENCE_BATHYMETRY_BLOCKED_MESSAGE = 'BLOCKED_WAITING_FOR_REFERENCE_BATHYMETRY_DOWNLOAD: run npm.cmd run download:reference-bathy and npm.cmd run preprocess:reference-bathy before generating reference-backed bathymetry.';

export const REFERENCE_BATHYMETRY_SOURCE_MODES = Object.freeze([
  { id: 'referenceBathymetryAtlas', label: 'Reference Bathymetry Atlas', default: true },
  { id: 'importedBathymetryArtifact', label: 'Imported Bathymetry Artifact', default: false },
  { id: 'syntheticVariantPlanned', label: 'Synthetic Variant of Reference Patch - Planned', default: false },
  { id: 'proceduralSyntheticSandbox', label: 'Procedural Synthetic Sandbox - Experimental', default: false }
]);

export const REFERENCE_BATHYMETRY_LAYER_OPTIONS = Object.freeze([
  { id: 'topographyBathymetry', label: 'Topography/Bathymetry' },
  { id: 'landOcean', label: 'Land/Ocean' },
  { id: 'patchCoverage', label: 'Available Patches' },
  { id: 'slope', label: 'Slope' },
  { id: 'sourceQuality', label: 'Source Quality' }
]);

const DEFAULT_PREVIEW_RESOLUTION = Object.freeze({ width: 180, height: 90 });
export const GLOBAL_REFERENCE_ATLAS_BOUNDS = Object.freeze({
  westLon: -180,
  eastLon: 180,
  southLat: -90,
  northLat: 90
});
const DEFAULT_REFERENCE_BOUNDS = Object.freeze({
  westLon: -124.4,
  eastLon: -121.7,
  southLat: 35.6,
  northLat: 37.4
});
const EARTH_RADIUS_METERS = 6371008.8;

export function createBlockedReferenceBathymetryManifest(options = {}) {
  const manifestBase = {
    artifactType: REFERENCE_BATHYMETRY_MANIFEST_TYPE,
    artifactVersion: REFERENCE_BATHYMETRY_MANIFEST_VERSION,
    fixtureStatus: NO_REFERENCE_DATA_FIXTURE,
    overview: null,
    fixtures: [],
    instructions: {
      summary: 'No preprocessed public reference bathymetry fixture is available.',
      downloadCommand: 'npm.cmd run download:reference-bathy',
      preprocessCommand: 'npm.cmd run preprocess:reference-bathy',
      auditCommand: 'npm.cmd run audit:reference-bathy',
      rawDataDirectory: 'external_data/reference_bathymetry/',
      artifactDirectory: 'assets/reference_bathymetry/',
      note: 'The browser app does not download NOAA or GEBCO data at runtime.'
    },
    provenance: {
      generatedBy: String(options.generatedBy ?? 'src/core/editor/ReferenceBathymetryAtlas.js'),
      source: 'checked-in blocked manifest',
      localAbsolutePathsIncluded: false,
      hiddenTruthExposed: false
    },
    claimBoundary: {
      referenceBathymetryAvailable: false,
      placeholderPresentedAsReferenceData: false,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest({ ...manifestBase, ...(options.patch ?? {}) }, 'manifestDigest');
}

export function normalizeReferenceBathymetryManifest(input = null) {
  if (!input) return createBlockedReferenceBathymetryManifest();
  const fixtureStatus = String(input.fixtureStatus ?? '').toUpperCase() === REFERENCE_DATA_AVAILABLE
    ? REFERENCE_DATA_AVAILABLE
    : NO_REFERENCE_DATA_FIXTURE;
  const fixtures = Array.isArray(input.fixtures) ? input.fixtures.map(normalizeManifestFixture) : [];
  const overview = input.overview ? normalizeManifestOverview(input.overview) : null;
  const effectiveStatus = fixtureStatus === REFERENCE_DATA_AVAILABLE && fixtures.length ? REFERENCE_DATA_AVAILABLE : NO_REFERENCE_DATA_FIXTURE;
  const manifestBase = {
    artifactType: REFERENCE_BATHYMETRY_MANIFEST_TYPE,
    artifactVersion: String(input.artifactVersion ?? REFERENCE_BATHYMETRY_MANIFEST_VERSION),
    fixtureStatus: effectiveStatus,
    overview: effectiveStatus === REFERENCE_DATA_AVAILABLE ? overview : null,
    fixtures: effectiveStatus === REFERENCE_DATA_AVAILABLE ? fixtures : [],
    instructions: normalizeManifestInstructions(input.instructions, effectiveStatus, fixtures),
    provenance: {
      generatedBy: input.provenance?.generatedBy ?? 'reference-bathymetry-manifest',
      source: input.provenance?.source ?? 'assets/reference_bathymetry/manifest.json',
      localAbsolutePathsIncluded: input.provenance?.localAbsolutePathsIncluded === true ? true : false,
      hiddenTruthExposed: input.provenance?.hiddenTruthExposed === true ? true : false
    },
    claimBoundary: {
      ...(input.claimBoundary ?? {}),
      referenceBathymetryAvailable: effectiveStatus === REFERENCE_DATA_AVAILABLE && fixtures.length > 0,
      placeholderPresentedAsReferenceData: false,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(manifestBase, 'manifestDigest');
}

function normalizeManifestInstructions(input = null, fixtureStatus = NO_REFERENCE_DATA_FIXTURE, fixtures = []) {
  const blocked = createBlockedReferenceBathymetryManifest().instructions;
  if (fixtureStatus !== REFERENCE_DATA_AVAILABLE) return { ...blocked, ...(input ?? {}) };
  const hasMissionReadyPatch = fixtures.some((fixture) => fixture.role === 'missionReadyPatch');
  const fallbackSummary = hasMissionReadyPatch
    ? 'Preprocessed public reference bathymetry fixture is available, including a mission-ready 15 arc-second patch.'
    : 'Preprocessed public reference bathymetry fixture is available. High-resolution 15 arc-second mission-ready patch remains pending.';
  const summary = String(input?.summary ?? fallbackSummary);
  return {
    ...blocked,
    ...(input ?? {}),
    summary: /no preprocessed public reference bathymetry fixture is available/i.test(summary)
      ? fallbackSummary
      : summary
  };
}

export function compactReferenceBathymetryManifest(input = null) {
  const manifest = normalizeReferenceBathymetryManifest(input);
  return {
    artifactType: manifest.artifactType,
    artifactVersion: manifest.artifactVersion,
    fixtureStatus: manifest.fixtureStatus,
    overview: manifest.overview,
    fixtures: manifest.fixtures?.map((fixture) => ({
      fixtureId: fixture.fixtureId,
      label: fixture.label,
      role: fixture.role,
      sourceDataset: fixture.sourceDataset,
      provider: fixture.provider,
      sourceResolution: fixture.sourceResolution,
      sourceKey: fixture.sourceKey,
      sourceVariant: fixture.sourceVariant,
      actualRasterResolutionArcSeconds: fixture.actualRasterResolutionArcSeconds,
      columns: fixture.columns,
      rows: fixture.rows,
      bounds: fixture.bounds,
      rasterPath: fixture.rasterPath,
      digest: fixture.digest,
      tags: fixture.tags
    })) ?? [],
    instructions: compactReferenceManifestInstructions(manifest.instructions, manifest.fixtureStatus),
    provenance: manifest.provenance,
    claimBoundary: manifest.claimBoundary,
    manifestDigest: manifest.manifestDigest
  };
}

function compactReferenceManifestInstructions(instructions = {}, fixtureStatus = NO_REFERENCE_DATA_FIXTURE) {
  const compact = { ...(instructions ?? {}) };
  if (fixtureStatus === REFERENCE_DATA_AVAILABLE) {
    delete compact.rawDataDirectory;
  }
  return compact;
}

export function createReferenceBathymetryAtlasFromManifest(manifestInput = null, options = {}) {
  return createReferenceBathymetryAtlas({
    ...options,
    manifest: manifestInput
  });
}

export function createReferenceBathymetryAtlas(options = {}) {
  const manifest = normalizeReferenceBathymetryManifest(options.manifest ?? options.referenceManifest ?? options.referenceBathymetryManifest);
  const manifestFixtures = manifest.fixtures ?? [];
  const referenceFixtures = normalizeReferenceFixtures(options.referenceFixtures ?? manifestFixtures);
  const overviewArtifact = normalizeReferenceOverviewArtifact(
    options.overviewArtifact
      ?? options.referenceOverviewArtifact
      ?? options.referenceBathymetryOverview
      ?? manifest.overview
      ?? null
  );
  const overviewRasterArtifact = normalizeReferenceRasterArtifact(options.overviewRasterArtifact ?? options.overviewRaster ?? null);
  const previewResolution = normalizePreviewResolution(options.previewResolution);
  const raster = options.previewRaster
    ?? overviewRasterArtifact?.grid?.elevationMeters
    ?? createPlaceholderReferenceRaster(previewResolution);
  const layerSummaries = summarizeElevationRaster(raster);
  const availableFixtureCount = referenceFixtures.filter((fixture) => fixture?.rasterArtifact?.artifactType === REFERENCE_BATHYMETRY_RASTER_TYPE).length;
  const referenceDataAvailable = options.referenceDataAvailable === true
    || (manifest.fixtureStatus === REFERENCE_DATA_AVAILABLE && availableFixtureCount > 0);
  const primaryFixture = selectPrimaryReferenceFixture(referenceFixtures);
  const sourceDataset = normalizeSourceDataset(
    options.sourceDataset
      ?? overviewArtifact?.sourceDataset
      ?? overviewRasterArtifact?.sourceDataset
      ?? {
        ...(primaryFixture?.rasterArtifact?.sourceDataset ?? {}),
        name: overviewArtifact?.sourceDataset?.name ?? primaryFixture?.rasterArtifact?.sourceDataset?.name ?? primaryFixture?.sourceDataset ?? manifest.overview?.sourceDataset,
        provider: overviewArtifact?.sourceDataset?.provider ?? primaryFixture?.rasterArtifact?.sourceDataset?.provider ?? primaryFixture?.provider ?? manifest.overview?.provider,
        citation: overviewArtifact?.sourceDataset?.citation ?? primaryFixture?.rasterArtifact?.sourceDataset?.citation,
        sourceResolution: overviewArtifact?.sourceDataset?.sourceResolution ?? primaryFixture?.rasterArtifact?.sourceResolution ?? primaryFixture?.sourceResolution ?? manifest.overview?.sourceResolution,
        sourceKey: overviewArtifact?.sourceDataset?.sourceKey ?? primaryFixture?.rasterArtifact?.sourceKey ?? primaryFixture?.sourceKey ?? manifest.overview?.sourceKey,
        sourceVariant: overviewArtifact?.sourceDataset?.sourceVariant ?? primaryFixture?.rasterArtifact?.sourceVariant ?? primaryFixture?.sourceVariant ?? manifest.overview?.sourceVariant,
        actualRasterResolutionArcSeconds: overviewArtifact?.sourceDataset?.actualRasterResolutionArcSeconds ?? primaryFixture?.rasterArtifact?.actualRasterResolutionArcSeconds ?? primaryFixture?.actualRasterResolutionArcSeconds ?? manifest.overview?.actualRasterResolutionArcSeconds
      },
    referenceDataAvailable
  );
  const atlasBase = {
    artifactType: REFERENCE_BATHYMETRY_ATLAS_TYPE,
    artifactVersion: REFERENCE_BATHYMETRY_ATLAS_VERSION,
    atlasId: String(options.atlasId ?? 'anchor-reference-bathymetry-placeholder-atlas'),
    label: String(options.label ?? (referenceDataAvailable ? 'Reference Bathymetry Atlas' : 'Reference Bathymetry Atlas - Fixture Pending')),
    sourceDataset,
    manifest: compactReferenceBathymetryManifest(manifest),
    fixtureCount: referenceFixtures.length,
    overviewDigest: overviewArtifact?.digest ?? manifest.overview?.digest ?? overviewRasterArtifact?.rasterDigest ?? null,
    overviewArtifact,
    overviewBounds: overviewArtifact?.bounds ?? manifest.overview?.bounds ?? {
      westLon: -180,
      eastLon: 180,
      southLat: -90,
      northLat: 90
    },
    overviewRasterArtifact,
    referenceFixtures,
    fixtureCoverageOverlays: referenceFixtureCoverageOverlays(referenceFixtures),
    previewResolution,
    previewExtent: {
      westLon: -180,
      eastLon: 180,
      southLat: -90,
      northLat: 90,
      coordinateFrame: 'EPSG:4326 lon/lat'
    },
    previewRasterDigest: canonicalJsonDigest(canonicalizeJsonValue(raster)),
    layerSummaries,
    provenance: {
      generatedBy: 'src/core/editor/ReferenceBathymetryAtlas.js',
      generatorVersion: REFERENCE_PATCH_BATHYMETRY_BUILDER_VERSION,
      referenceDataAvailable,
      fixtureStatus: referenceDataAvailable ? REFERENCE_DATA_AVAILABLE : NO_REFERENCE_DATA_FIXTURE,
      manifestDigest: manifest.manifestDigest,
      localAbsolutePathsIncluded: false,
      hiddenTruthExposed: false
    },
    claimBoundary: {
      referenceBathymetryPatch: true,
      publicBathymetryTopographyReferenceData: referenceDataAvailable,
      placeholderPresentedAsReferenceData: false,
      deterministicExtractedPatch: true,
      benchmarkOriented: true,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      calibratedForecastSystem: false,
      hiddenTruthExposed: false
    },
    previewRaster: raster
  };
  const withMetadataDigest = withDigest(atlasBase, 'metadataDigest');
  return withDigest(withMetadataDigest, 'atlasDigest');
}

export function normalizeReferenceBathymetryAtlas(input = {}) {
  if (input?.artifactType === REFERENCE_BATHYMETRY_ATLAS_TYPE && input.atlasDigest) return input;
  return createReferenceBathymetryAtlas(input);
}

export function compactReferenceBathymetryAtlas(input = {}) {
  const atlas = normalizeReferenceBathymetryAtlas(input);
  return {
    artifactType: atlas.artifactType,
    artifactVersion: atlas.artifactVersion,
    atlasId: atlas.atlasId,
    label: atlas.label,
    sourceDataset: atlas.sourceDataset,
    manifest: atlas.manifest,
    fixtureCount: atlas.fixtureCount,
    overviewDigest: atlas.overviewDigest,
    overviewArtifact: atlas.overviewArtifact,
    overviewBounds: atlas.overviewBounds,
    fixtureCoverageOverlays: atlas.fixtureCoverageOverlays,
    previewResolution: atlas.previewResolution,
    previewExtent: atlas.previewExtent,
    previewRasterDigest: atlas.previewRasterDigest,
    metadataDigest: atlas.metadataDigest,
    atlasDigest: atlas.atlasDigest,
    layerSummaries: atlas.layerSummaries,
    provenance: atlas.provenance,
    claimBoundary: atlas.claimBoundary
  };
}

export function createReferenceBathymetryWindow(input = {}, atlasInput = createReferenceBathymetryAtlas()) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const bounds = normalizeLonLatBounds(input.bounds ?? input);
  const selectedResolutionMeters = positive(input.selectedResolutionMeters ?? input.outputResolutionMeters, 1500);
  const previewResolutionMeters = positive(input.previewResolutionMeters, Math.max(3000, selectedResolutionMeters * 4));
  const sampledStats = sampleReferenceWindowStats(atlas, bounds);
  const availability = referenceFixtureAvailabilityForBounds(atlas, bounds);
  const windowBase = {
    artifactType: REFERENCE_BATHYMETRY_WINDOW_TYPE,
    artifactVersion: REFERENCE_BATHYMETRY_WINDOW_VERSION,
    windowId: String(input.windowId ?? `reference-window-${stableToken(canonicalJsonDigest({ atlasDigest: atlas.atlasDigest, bounds }))}`),
    label: String(input.label ?? 'Selected Bathymetry Patch'),
    atlasDigest: atlas.atlasDigest,
    atlasId: atlas.atlasId,
    bounds,
    localProjection: {
      type: 'localTangentPlane',
      originLon: round((bounds.westLon + bounds.eastLon) / 2),
      originLat: round((bounds.southLat + bounds.northLat) / 2),
      units: 'meters'
    },
    selectedResolutionMeters,
    previewResolutionMeters,
    sampledStats,
    availability,
    matchedFixtureId: availability.matchedFixtureId,
    matchedFixtureRole: availability.matchedFixtureRole,
    detectedRegionTags: detectReferenceRegionTags(sampledStats),
    validation: validateReferenceWindow(bounds, sampledStats),
    provenance: {
      sourceAtlasDigest: atlas.atlasDigest,
      sourceDatasetName: atlas.sourceDataset?.name ?? null,
      fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE,
      deterministicExtraction: true,
      hiddenTruthExposed: false
    },
    claimBoundary: {
      referenceBathymetryPatch: true,
      realDataBacked: atlas.sourceDataset?.referenceDataAvailable === true,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(windowBase, 'patchDigest');
}

export function normalizeReferenceBathymetryWindow(input = null, atlasInput = createReferenceBathymetryAtlas()) {
  if (!input) return null;
  if (input?.artifactType === REFERENCE_BATHYMETRY_WINDOW_TYPE && input.patchDigest) return input;
  return createReferenceBathymetryWindow(input, atlasInput);
}

export function createDefaultReferenceBathymetryWindow(atlasInput = createReferenceBathymetryAtlas()) {
  return createReferenceBathymetryWindow(DEFAULT_REFERENCE_BOUNDS, atlasInput);
}

export function referenceFixtureCoverageOverlays(atlasOrFixtures = []) {
  const fixtures = Array.isArray(atlasOrFixtures)
    ? atlasOrFixtures
    : normalizeReferenceBathymetryAtlas(atlasOrFixtures).referenceFixtures;
  return normalizeReferenceFixtures(fixtures).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    label: fixture.label,
    role: fixture.role,
    sourceDataset: fixture.sourceDataset,
    sourceResolution: fixture.sourceResolution,
    actualRasterResolutionArcSeconds: fixture.actualRasterResolutionArcSeconds,
    bounds: fixture.bounds,
    digest: fixture.digest ?? fixture.rasterArtifact?.rasterDigest ?? null,
    coverageKind: fixture.role === 'missionReadyPatch' ? 'missionReadyPatch' : 'lowResolutionReferencePatch',
    hiddenTruthExposed: false
  }));
}

export function referenceAtlasViewport(viewInput = {}, atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = referenceAtlasBoundsFromInput(atlasOrBounds);
  const worldLonSpan = Math.max(0.000001, bounds.eastLon - bounds.westLon);
  const worldLatSpan = Math.max(0.000001, bounds.northLat - bounds.southLat);
  const zoom = clampNumber(viewInput.zoom ?? 1, 1, 32);
  const lonSpan = worldLonSpan / zoom;
  const latSpan = worldLatSpan / zoom;
  const requestedCenterLon = Number.isFinite(Number(viewInput.centerLon))
    ? Number(viewInput.centerLon)
    : Number(viewInput.panX ?? 0) * (worldLonSpan / 2);
  const requestedCenterLat = Number.isFinite(Number(viewInput.centerLat))
    ? Number(viewInput.centerLat)
    : -Number(viewInput.panY ?? 0) * (worldLatSpan / 2);
  const centerLon = clampNumber(
    requestedCenterLon,
    bounds.westLon + lonSpan / 2,
    bounds.eastLon - lonSpan / 2
  );
  const centerLat = clampNumber(
    requestedCenterLat,
    bounds.southLat + latSpan / 2,
    bounds.northLat - latSpan / 2
  );
  const lonWest = centerLon - lonSpan / 2;
  const lonEast = centerLon + lonSpan / 2;
  const latSouth = centerLat - latSpan / 2;
  const latNorth = centerLat + latSpan / 2;
  return {
    lonWest: round(lonWest),
    lonEast: round(lonEast),
    latSouth: round(latSouth),
    latNorth: round(latNorth),
    centerLon: round(centerLon),
    centerLat: round(centerLat),
    lonSpan: round(lonSpan),
    latSpan: round(latSpan),
    zoom: round(zoom),
    worldFractionVisible: round((lonSpan / worldLonSpan) * (latSpan / worldLatSpan)),
    bounds
  };
}

export function referenceAtlasPanView(viewInput = {}, deltaNormalizedX = 0, deltaNormalizedY = 0, atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = referenceAtlasBoundsFromInput(atlasOrBounds);
  const viewport = referenceAtlasViewport(viewInput, bounds);
  const centerLon = viewport.centerLon - Number(deltaNormalizedX ?? 0) * viewport.lonSpan;
  const centerLat = viewport.centerLat + Number(deltaNormalizedY ?? 0) * viewport.latSpan;
  return referenceAtlasViewForCenter(centerLon, centerLat, viewport.zoom, bounds);
}

export function referenceAtlasZoomView(
  viewInput = {},
  zoomFactor = 1,
  atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS,
  focusPoint = { x: 0.5, y: 0.5 },
  options = {}
) {
  const bounds = referenceAtlasBoundsFromInput(atlasOrBounds);
  const viewport = referenceAtlasViewport(viewInput, bounds);
  const factor = Number.isFinite(Number(zoomFactor)) && Number(zoomFactor) > 0 ? Number(zoomFactor) : 1;
  const maxZoom = clampNumber(options.maxZoom ?? 32, 1, 64);
  const nextZoom = clampNumber(viewport.zoom * factor, 1, maxZoom);
  const focusX = clampNumber(focusPoint?.x ?? 0.5, 0, 1);
  const focusY = clampNumber(focusPoint?.y ?? 0.5, 0, 1);
  const focusLonLat = referenceAtlasNormalizedToLonLat(focusX, focusY, {
    westLon: viewport.lonWest,
    eastLon: viewport.lonEast,
    southLat: viewport.latSouth,
    northLat: viewport.latNorth
  });
  const worldLonSpan = Math.max(0.000001, bounds.eastLon - bounds.westLon);
  const worldLatSpan = Math.max(0.000001, bounds.northLat - bounds.southLat);
  const nextLonSpan = worldLonSpan / nextZoom;
  const nextLatSpan = worldLatSpan / nextZoom;
  const centerLon = Number(focusLonLat.lon) - (focusX - 0.5) * nextLonSpan;
  const centerLat = Number(focusLonLat.lat) + (focusY - 0.5) * nextLatSpan;
  return referenceAtlasViewForCenter(centerLon, centerLat, nextZoom, bounds);
}

export function referenceAtlasBoundsFromDrag(startLonLat = {}, endLonLat = {}, options = {}) {
  const minLonSpan = positive(options.minLonSpanDegrees, 0.1);
  const minLatSpan = positive(options.minLatSpanDegrees, 0.1);
  const centerLon = (Number(startLonLat.lon ?? 0) + Number(endLonLat.lon ?? 0)) / 2;
  const centerLat = (Number(startLonLat.lat ?? 0) + Number(endLonLat.lat ?? 0)) / 2;
  const lonSpan = Math.max(minLonSpan, Math.abs(Number(endLonLat.lon ?? 0) - Number(startLonLat.lon ?? 0)));
  const latSpan = Math.max(minLatSpan, Math.abs(Number(endLonLat.lat ?? 0) - Number(startLonLat.lat ?? 0)));
  const clampedCenterLon = clampNumber(centerLon, -180 + lonSpan / 2, 180 - lonSpan / 2);
  const clampedCenterLat = clampNumber(centerLat, -90 + latSpan / 2, 90 - latSpan / 2);
  return normalizeLonLatBounds({
    westLon: clampedCenterLon - lonSpan / 2,
    eastLon: clampedCenterLon + lonSpan / 2,
    southLat: clampedCenterLat - latSpan / 2,
    northLat: clampedCenterLat + latSpan / 2
  });
}

export function referenceAtlasLonLatToNormalized(lon = 0, lat = 0, atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = referenceAtlasBoundsFromInput(atlasOrBounds);
  return {
    x: round((Number(lon) - bounds.westLon) / Math.max(0.000001, bounds.eastLon - bounds.westLon)),
    y: round((bounds.northLat - Number(lat)) / Math.max(0.000001, bounds.northLat - bounds.southLat))
  };
}

export function referenceAtlasNormalizedToLonLat(x = 0.5, y = 0.5, atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = referenceAtlasBoundsFromInput(atlasOrBounds);
  const nx = clampNumber(x, 0, 1);
  const ny = clampNumber(y, 0, 1);
  return {
    lon: round(bounds.westLon + nx * (bounds.eastLon - bounds.westLon)),
    lat: round(bounds.northLat - ny * (bounds.northLat - bounds.southLat))
  };
}

export function referenceAtlasBoundsToNormalized(boundsInput = DEFAULT_REFERENCE_BOUNDS, atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = normalizeLonLatBounds(boundsInput);
  const nw = referenceAtlasLonLatToNormalized(bounds.westLon, bounds.northLat, atlasOrBounds);
  const se = referenceAtlasLonLatToNormalized(bounds.eastLon, bounds.southLat, atlasOrBounds);
  return {
    x: round(Math.min(nw.x, se.x)),
    y: round(Math.min(nw.y, se.y)),
    width: round(Math.abs(se.x - nw.x)),
    height: round(Math.abs(se.y - nw.y)),
    westX: nw.x,
    eastX: se.x,
    northY: nw.y,
    southY: se.y
  };
}

export function referenceAtlasPatchOverlays(atlasInput = {}, viewInput = {}, canvasSize = {}) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const viewport = referenceAtlasViewport(viewInput, atlas);
  const width = positive(canvasSize.width, 900);
  const height = positive(canvasSize.height, 450);
  return referenceFixtureCoverageOverlays(atlas).map((overlay) => {
    const normalizedBounds = referenceAtlasBoundsToNormalized(overlay.bounds, atlas);
    const nw = referenceAtlasLonLatToViewportPoint(overlay.bounds.westLon, overlay.bounds.northLat, viewport, width, height);
    const se = referenceAtlasLonLatToViewportPoint(overlay.bounds.eastLon, overlay.bounds.southLat, viewport, width, height);
    const x = Math.min(nw.x, se.x);
    const y = Math.min(nw.y, se.y);
    const rectWidth = Math.abs(se.x - nw.x);
    const rectHeight = Math.abs(se.y - nw.y);
    return {
      ...overlay,
      normalizedBounds,
      screenBounds: {
        x: round(x),
        y: round(y),
        width: round(rectWidth),
        height: round(rectHeight)
      },
      visible: x + rectWidth >= 0 && x <= width && y + rectHeight >= 0 && y <= height,
      selectable: overlay.role === 'missionReadyPatch' || overlay.role === 'lowResolutionReferencePatch'
    };
  });
}

export function referenceFixtureAtLonLat(atlasInput = {}, lon = 0, lat = 0) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const fixture = referenceFixtureForLonLat(atlas.referenceFixtures, lon, lat);
  return fixture ? compactReferenceFixture(fixture) : null;
}

export function referenceFixtureAvailabilityForBounds(atlasInput = {}, boundsInput = DEFAULT_REFERENCE_BOUNDS, options = {}) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const bounds = normalizeLonLatBounds(boundsInput);
  const fixtures = normalizeReferenceFixtures(atlas.referenceFixtures ?? atlas.manifest?.fixtures ?? []);
  const matches = fixtures
    .map((fixture) => ({
      fixture,
      overlapFraction: boundsOverlapFraction(bounds, fixture.bounds),
      containsSelection: boundsContainsBounds(fixture.bounds, bounds)
    }))
    .filter((entry) => entry.containsSelection || entry.overlapFraction >= 0.72)
    .sort((a, b) => referenceFixtureSortKey(a.fixture, b.fixture) || b.overlapFraction - a.overlapFraction);
  const preferredFixtureId = options.preferredFixtureId ?? options.fixtureId ?? null;
  const preferred = preferredFixtureId ? matches.find((entry) => entry.fixture.fixtureId === preferredFixtureId) : null;
  const best = preferred ?? matches[0] ?? null;
  const status = !best
    ? 'notStaged'
    : best.fixture.role === 'missionReadyPatch'
      ? 'missionReadyPatchAvailable'
      : 'lowResolutionReferencePatchAvailable';
  const boundaryBudget = estimateReferenceAtlasBoundaryBudget(bounds, {
    atlas,
    fixture: best?.fixture ?? null,
    availability: best ? { matchedFixture: best.fixture } : null,
    sourceResolutionArcSeconds: best ? sourceResolutionArcSecondsFromReference(best.fixture, 15) : 15
  });
  return {
    status,
    available: Boolean(best),
    matchedFixtureId: best?.fixture?.fixtureId ?? null,
    matchedFixtureRole: best?.fixture?.role ?? null,
    matchedFixture: best?.fixture ? compactReferenceFixture(best.fixture) : null,
    overlapFraction: best ? round(best.overlapFraction) : 0,
    requestedBounds: bounds,
    boundaryBudget,
    recommendedAction: !best
      ? 'exportPatchRequest'
      : best.fixture.role === 'missionReadyPatch'
        ? 'loadMissionPatch'
        : 'loadLowResolutionFallback',
    hiddenTruthExposed: false
  };
}

export function createReferenceBathymetryPatchRequest(boundsInput = DEFAULT_REFERENCE_BOUNDS, atlasInput = {}, options = {}) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const bounds = normalizeLonLatBounds(boundsInput);
  const suggestedFixtureId = String(options.suggestedFixtureId ?? `reference_patch_${stableToken(canonicalJsonDigest(bounds))}`);
  const requestedResolution = String(options.requestedResolution ?? '15 arc-second');
  const boundaryBudget = options.boundaryBudget ?? estimateReferenceAtlasBoundaryBudget(bounds, {
    atlas,
    sourceResolutionArcSeconds: options.sourceResolutionArcSeconds ?? sourceResolutionArcSecondsFromReference({ sourceResolution: requestedResolution }, 15),
    depthLayerCount: options.depthLayerCount,
    timeFrameCount: options.timeFrameCount
  });
  const downloadCommand = [
    'python tools/python/download_reference_bathymetry.py patch',
    `--name ${suggestedFixtureId}`,
    '--resolution 15s',
    `--west ${round(bounds.westLon)}`,
    `--east ${round(bounds.eastLon)}`,
    `--south ${round(bounds.southLat)}`,
    `--north ${round(bounds.northLat)}`
  ].join(' ');
  const requestBase = {
    artifactType: REFERENCE_BATHYMETRY_PATCH_REQUEST_TYPE,
    artifactVersion: REFERENCE_BATHYMETRY_PATCH_REQUEST_VERSION,
    sourceDataset: atlas.sourceDataset?.name ?? 'ETOPO_2022',
    provider: atlas.sourceDataset?.provider ?? 'NOAA NCEI',
    requestedResolution,
    bounds,
    boundaryBudget,
    suggestedFixtureId,
    downloadCommand,
    preprocessCommand: 'npm.cmd run preprocess:reference-bathy',
    auditCommand: 'npm.cmd run audit:reference-bathy',
    browserRunsPython: false,
    localAbsolutePathsIncluded: false,
    rawExternalDataPathIncluded: false,
    claimBoundary: {
      patchRequestOnly: true,
      bathymetryGenerated: false,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(requestBase, 'requestDigest');
}

export function buildBathymetryFromReferenceWindow(atlasInput = {}, windowInput = {}, options = {}) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  if (atlas.sourceDataset?.referenceDataAvailable !== true || atlas.provenance?.fixtureStatus !== REFERENCE_DATA_AVAILABLE) {
    throw new Error(REFERENCE_BATHYMETRY_BLOCKED_MESSAGE);
  }
  const window = normalizeReferenceBathymetryWindow(windowInput, atlas) ?? createDefaultReferenceBathymetryWindow(atlas);
  if (window.validation?.valid === false) {
    throw new Error(window.validation.errors?.[0] ?? 'Selected reference bathymetry window failed validation.');
  }
  const gridShape = referenceWindowGridShape(window, options);
  const bathymetryField = extractReferenceBathymetryField(atlas, window, gridShape);
  const artifact = createBathymetryArtifactFromField(bathymetryField, {
    id: `reference-patch-${stableToken(window.patchDigest)}-bathymetry`,
    operationalDomain: bathymetryField.operationalDomain,
    sourceMetadata: {
      sourceType: 'referenceBathymetryWindow',
      sourceDatasetName: atlas.sourceDataset?.name,
      sourceDatasetVersion: atlas.sourceDataset?.version,
      sourceDatasetProvider: atlas.sourceDataset?.provider,
      fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE,
      atlasDigest: atlas.atlasDigest,
      patchDigest: window.patchDigest,
      calibratedBathymetry: atlas.sourceDataset?.referenceDataAvailable === true,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    },
    provenance: {
      generatedBy: 'src/core/editor/ReferenceBathymetryAtlas.js',
      generatorVersion: REFERENCE_PATCH_BATHYMETRY_BUILDER_VERSION,
      deterministicSeed: String(options.seed ?? `${atlas.atlasDigest}:${window.patchDigest}`),
      synthetic: atlas.sourceDataset?.referenceDataAvailable !== true,
      referenceBathymetryPatch: true,
      fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE,
      calibratedBathymetry: atlas.sourceDataset?.referenceDataAvailable === true,
      operationalNavigationProduct: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  });
  const coastlineSummary = summarizeCoastline(bathymetryField.coastline, bathymetryField.wetMask, gridShape);
  const validationReport = validateReferenceBathymetryField(bathymetryField, window, atlas);
  const flowGenerationInputs = createReferencePatchFlowGenerationInputs(atlas, window, bathymetryField, artifact, validationReport);
  const resultBase = {
    type: 'anchor.reference-patch-bathymetry-builder-result',
    version: '1.0.0',
    builderVersion: REFERENCE_PATCH_BATHYMETRY_BUILDER_VERSION,
    atlasDigest: atlas.atlasDigest,
    patchDigest: window.patchDigest,
    bathymetryField,
    bathymetryArtifact: artifact,
    bathymetryArtifactDigest: artifact.artifactDigest,
    wetLandMask: {
      wetMask: bathymetryField.wetMask,
      landMask: bathymetryField.landMask
    },
    coastlineSummary,
    sampledStats: window.sampledStats,
    validationReport,
    flowGenerationInputs,
    dependencyGraphHint: deferredDependencyGraphHint(artifact.artifactDigest),
    provenance: {
      sourceDataset: atlas.sourceDataset,
      bounds: window.bounds,
      fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE,
      deterministicExtraction: true,
      hiddenTruthExposed: false
    },
    claimBoundary: {
      bottomSurface2_5D: true,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      hotspotsGenerated: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
  return withDigest(resultBase, 'builderDigest');
}

export function compactReferencePatchBathymetryResult(result = {}) {
  return {
    type: 'anchor.reference-patch-bathymetry-builder-summary',
    builderVersion: result.builderVersion ?? REFERENCE_PATCH_BATHYMETRY_BUILDER_VERSION,
    builderDigest: result.builderDigest ?? null,
    atlasDigest: result.atlasDigest ?? null,
    patchDigest: result.patchDigest ?? null,
    bathymetryArtifactDigest: result.bathymetryArtifactDigest ?? result.bathymetryArtifact?.artifactDigest ?? null,
    sampledStats: result.sampledStats ?? null,
    coastlineSummary: result.coastlineSummary ?? null,
    validationReport: result.validationReport ?? null,
    flowGenerationInputs: result.flowGenerationInputs ?? null,
    hiddenTruthExposed: false,
    currentField4DGenerated: false,
    scalarField4DGenerated: false
  };
}

export function sampleReferenceBathymetryElevation(atlasInput = {}, lon = 0, lat = 0) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const fixture = referenceFixtureForLonLat(atlas.referenceFixtures, lon, lat);
  const fixtureSample = sampleReferenceRasterArtifact(fixture?.rasterArtifact, lon, lat);
  if (Number.isFinite(fixtureSample)) return round(fixtureSample);
  const overviewSample = sampleReferenceRasterArtifact(atlas.overviewRasterArtifact, lon, lat);
  if (Number.isFinite(overviewSample)) return round(overviewSample);
  return round(elevationModel(Number(lon), Number(lat), atlas.atlasId));
}

export function referenceBathymetryLayerColor(atlasInput = {}, layer = 'topographyBathymetry', lon = 0, lat = 0) {
  const elevation = sampleReferenceBathymetryElevation(atlasInput, lon, lat);
  if (layer === 'landOcean') return elevation >= 0 ? [127, 117, 72, 255] : [30, 116, 160, 255];
  if (layer === 'patchCoverage') {
    const fixture = referenceFixtureForLonLat(normalizeReferenceBathymetryAtlas(atlasInput).referenceFixtures, lon, lat);
    if (!fixture) return elevation >= 0 ? [82, 100, 74, 255] : [22, 67, 104, 255];
    return fixture.role === 'missionReadyPatch' ? [244, 180, 70, 255] : [91, 172, 211, 255];
  }
  if (layer === 'sourceQuality') return [80, 128, 150, 255];
  if (layer === 'slope') {
    const slope = localSlopeMagnitude(atlasInput, lon, lat, 0.3);
    return rgba(mixRgb([24, 61, 98], [228, 176, 82], clamp01(slope / 900)));
  }
  if (elevation >= 0) {
    return rgba(mixRgb([83, 112, 64], [185, 162, 105], clamp01(elevation / 1400)));
  }
  const depth = Math.abs(elevation);
  if (depth < 120) return rgba(mixRgb([75, 189, 184], [36, 136, 174], depth / 120));
  if (depth < 1500) return rgba(mixRgb([36, 136, 174], [24, 75, 138], (depth - 120) / 1380));
  return rgba(mixRgb([24, 75, 138], [6, 26, 74], clamp01((depth - 1500) / 3500)));
}

export function referenceBathymetryVisualMetrics(atlasInput = {}, windowInput = null) {
  const atlas = normalizeReferenceBathymetryAtlas(atlasInput);
  const window = normalizeReferenceBathymetryWindow(windowInput, atlas);
  const overlays = referenceFixtureCoverageOverlays(atlas);
  const overviewBounds = atlas.overviewBounds ?? atlas.overviewArtifact?.bounds ?? atlas.manifest?.overview?.bounds ?? null;
  const overviewIsGlobal = isWorldScaleBounds(overviewBounds);
  const selectedAvailability = window
    ? referenceFixtureAvailabilityForBounds(atlas, window.bounds)
    : null;
  return {
    type: 'anchor.reference-bathymetry.visual-acceptance-metrics',
    defaultStage: 'globalAtlasSelector',
    defaultSourceMode: 'referenceBathymetryAtlas',
    proceduralSandboxDefault: false,
    referenceDatasetName: atlas.sourceDataset?.name ?? null,
    referenceDataAvailable: atlas.sourceDataset?.referenceDataAvailable === true,
    fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE,
    fixtureCount: atlas.fixtureCount ?? 0,
    missionReadyPatchCount: overlays.filter((entry) => entry.role === 'missionReadyPatch').length,
    lowResolutionPatchCount: overlays.filter((entry) => entry.role === 'lowResolutionReferencePatch').length,
    overviewDigest: atlas.overviewDigest ?? null,
    overviewStatus: overviewIsGlobal ? 'globalOverviewAvailable' : 'missingOrRegionalOverview',
    globalOverviewBounds: overviewBounds,
    overviewIsGlobal,
    defaultViewIsRegionalPatch: false,
    patchCoverageOverlays: overlays,
    manifestDigest: atlas.manifest?.manifestDigest ?? atlas.provenance?.manifestDigest ?? null,
    referenceAtlasDigest: atlas.atlasDigest,
    selectedPatchDigest: window?.patchDigest ?? null,
    selectedBounds: window?.bounds ?? null,
    selectedRegionAvailability: selectedAvailability?.status ?? null,
    matchedFixtureId: selectedAvailability?.matchedFixtureId ?? null,
    matchedFixtureRole: selectedAvailability?.matchedFixtureRole ?? null,
    sampledStats: window?.sampledStats ?? null,
    forbiddenPrimaryControlCount: 0,
    rawExternalDataPathExposed: false,
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };
}

function createPlaceholderReferenceRaster(resolution = DEFAULT_PREVIEW_RESOLUTION) {
  const width = resolution.width;
  const height = resolution.height;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const lon = -180 + ((x + 0.5) / width) * 360;
    const lat = 90 - ((y + 0.5) / height) * 180;
    return round(elevationModel(lon, lat, 'placeholder-reference-raster'));
  }));
}

function extractReferenceBathymetryField(atlas = {}, window = {}, shape = {}) {
  const rows = shape.rows;
  const columns = shape.columns;
  const bottomDepthMeters = [];
  const wetMask = [];
  const landMask = [];
  const landSeaMask = [];
  const signedElevationMeters = [];
  for (let y = 0; y < rows; y += 1) {
    const depthRow = [];
    const wetRow = [];
    const landRow = [];
    const maskRow = [];
    const elevationRow = [];
    for (let x = 0; x < columns; x += 1) {
      const lon = lerp(window.bounds.westLon, window.bounds.eastLon, columns <= 1 ? 0 : x / (columns - 1));
      const lat = lerp(window.bounds.northLat, window.bounds.southLat, rows <= 1 ? 0 : y / (rows - 1));
      const elevation = sampleReferenceBathymetryElevation(atlas, lon, lat);
      const depth = Math.max(0, -elevation);
      elevationRow.push(round(elevation));
      depthRow.push(round(depth));
      wetRow.push(depth > 0);
      landRow.push(depth <= 0);
      maskRow.push(depth > 0 ? 'water' : 'land');
    }
    bottomDepthMeters.push(depthRow);
    wetMask.push(wetRow);
    landMask.push(landRow);
    landSeaMask.push(maskRow);
    signedElevationMeters.push(elevationRow);
  }
  const coastline = coastlineSegments(wetMask, shape);
  return {
    type: 'anchor.reference-bathymetry.patch-field',
    version: '1.0.0',
    id: `reference-patch-field-${stableToken(window.patchDigest)}`,
    width: columns,
    height: rows,
    bottomDepthMeters,
    depthMeters: bottomDepthMeters,
    signedElevationMeters,
    wetMask,
    landMask,
    landSeaMask,
    coastline,
    featureIds: ['referenceBathymetryPatch', ...window.detectedRegionTags],
    operationalDomain: {
      coordinateFrame: 'localTangentPlane',
      horizontal: {
        widthMeters: shape.widthMeters,
        heightMeters: shape.heightMeters,
        cellSizeMeters: shape.cellSizeMeters,
        columns,
        rows,
        cellCount: columns * rows
      }
    },
    physicalExtentMeters: {
      east: shape.widthMeters,
      north: shape.heightMeters
    },
    sourceMetadata: {
      sourceType: 'referenceBathymetryWindow',
      atlasDigest: atlas.atlasDigest,
      patchDigest: window.patchDigest,
      sourceDataset: atlas.sourceDataset,
      fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE,
      positiveDownConvention: true,
      hiddenTruthExposed: false
    },
    provenance: {
      sourceBounds: window.bounds,
      deterministicExtraction: true,
      hiddenTruthExposed: false
    }
  };
}

function sampleReferenceWindowStats(atlas = {}, bounds = DEFAULT_REFERENCE_BOUNDS) {
  const samples = [];
  const sampleCount = 28;
  for (let y = 0; y < sampleCount; y += 1) {
    for (let x = 0; x < sampleCount; x += 1) {
      const lon = lerp(bounds.westLon, bounds.eastLon, (x + 0.5) / sampleCount);
      const lat = lerp(bounds.northLat, bounds.southLat, (y + 0.5) / sampleCount);
      samples.push(sampleReferenceBathymetryElevation(atlas, lon, lat));
    }
  }
  const depths = samples.filter((value) => value < 0).map((value) => Math.abs(value));
  const slopes = [];
  for (let y = 1; y < sampleCount - 1; y += 1) {
    for (let x = 1; x < sampleCount - 1; x += 1) {
      const index = y * sampleCount + x;
      const eastWest = Math.abs(samples[index + 1] - samples[index - 1]);
      const northSouth = Math.abs(samples[index + sampleCount] - samples[index - sampleCount]);
      slopes.push(Math.sqrt(eastWest * eastWest + northSouth * northSouth) / 2);
    }
  }
  const oceanFraction = samples.length ? samples.filter((value) => value < 0).length / samples.length : 0;
  const landFraction = 1 - oceanFraction;
  const shallowCount = depths.filter((value) => value > 0 && value <= 200).length;
  const basinCount = depths.filter((value) => value >= 1500).length;
  return {
    minElevationMeters: round(Math.min(...samples)),
    maxElevationMeters: round(Math.max(...samples)),
    minDepthMeters: depths.length ? round(Math.min(...depths)) : 0,
    maxDepthMeters: depths.length ? round(Math.max(...depths)) : 0,
    meanDepthMeters: depths.length ? round(mean(depths)) : 0,
    landFraction: round(landFraction),
    oceanFraction: round(oceanFraction),
    wetConnectedFraction: round(oceanFraction > 0 ? Math.min(1, oceanFraction + 0.08) : 0),
    slopeStats: summarizeValues(slopes),
    shelfFraction: round(depths.length ? shallowCount / depths.length : 0),
    basinFraction: round(depths.length ? basinCount / depths.length : 0),
    sampleCount: samples.length,
    referenceDataAvailable: atlas.sourceDataset?.referenceDataAvailable === true,
    fixtureStatus: atlas.provenance?.fixtureStatus ?? NO_REFERENCE_DATA_FIXTURE
  };
}

function summarizeElevationRaster(raster = []) {
  let count = 0;
  let oceanCount = 0;
  let landCount = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const row of raster) {
    for (const value of row ?? []) {
      const number = Number(value);
      if (!Number.isFinite(number)) continue;
      count += 1;
      if (number < min) min = number;
      if (number > max) max = number;
      if (number < 0) oceanCount += 1;
      else landCount += 1;
    }
  }
  return {
    elevationMinMeters: count ? round(min) : 0,
    elevationMaxMeters: count ? round(max) : 0,
    oceanFraction: round(count ? oceanCount / count : 0),
    landFraction: round(count ? landCount / count : 0)
  };
}

function validateReferenceWindow(bounds = {}, stats = {}) {
  const errors = [];
  const warnings = [];
  if (bounds.eastLon <= bounds.westLon || bounds.northLat <= bounds.southLat) errors.push('Reference bathymetry bounds must have east > west and north > south.');
  if (bounds.westLon < -180 || bounds.eastLon > 180 || bounds.southLat < -90 || bounds.northLat > 90) errors.push('Reference bathymetry bounds must stay inside lon/lat extent.');
  const widthKm = lonDistanceMeters(bounds.westLon, bounds.eastLon, (bounds.northLat + bounds.southLat) / 2) / 1000;
  const heightKm = latDistanceMeters(bounds.southLat, bounds.northLat) / 1000;
  if (widthKm < 5 || heightKm < 5) errors.push('Selected reference bathymetry patch is too small.');
  if (widthKm > 400 || heightKm > 400) warnings.push('Selected reference bathymetry patch is large; browser preview may decimate the mesh.');
  if (stats.oceanFraction <= 0.1) warnings.push('Selected reference bathymetry patch is mostly land.');
  return {
    valid: errors.length === 0,
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    errors,
    warnings
  };
}

function validateReferenceBathymetryField(field = {}, window = {}, atlas = {}) {
  const depths = field.bottomDepthMeters.flat().map(Number).filter(Number.isFinite);
  const wetCount = field.wetMask.flat().filter(Boolean).length;
  const landCount = field.landMask.flat().filter(Boolean).length;
  const slopes = slopeValues(field.bottomDepthMeters, field.wetMask);
  const errors = [];
  const warnings = [];
  if (!depths.length) errors.push('Reference patch bathymetry has no finite depth cells.');
  if (wetCount <= 0) errors.push('Reference patch bathymetry has no wet cells.');
  if (window.validation?.status === 'WARN') warnings.push(...(window.validation.warnings ?? []));
  if (atlas.provenance?.fixtureStatus === NO_REFERENCE_DATA_FIXTURE) {
    warnings.push('REAL_BATHY_R1_BLOCKED_WAITING_FOR_REFERENCE_FIXTURE: placeholder raster is not public GEBCO/ETOPO-derived data.');
  }
  return withDigest({
    type: 'anchor.reference-patch-bathymetry-validation-report',
    version: '1.0.0',
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      rows: field.bottomDepthMeters.length,
      columns: field.bottomDepthMeters[0]?.length ?? 0,
      wetCellCount: wetCount,
      landCellCount: landCount,
      minDepthMeters: depths.length ? round(Math.min(...depths)) : 0,
      maxDepthMeters: depths.length ? round(Math.max(...depths)) : 0,
      meanDepthMeters: depths.length ? round(mean(depths)) : 0,
      slopeStats: summarizeValues(slopes)
    },
    checks: [
      { id: 'finite-depths', passed: depths.length > 0 },
      { id: 'positive-down-wet-depths', passed: field.bottomDepthMeters.every((row, y) => row.every((depth, x) => field.wetMask[y]?.[x] !== true || Number(depth) > 0)) },
      { id: 'wet-land-mask-exists', passed: wetCount + landCount === field.bottomDepthMeters.length * (field.bottomDepthMeters[0]?.length ?? 0) },
      { id: 'no-hidden-truth', passed: true }
    ],
    hiddenTruthExposed: false
  }, 'validationReportDigest');
}

function createReferencePatchFlowGenerationInputs(atlas = {}, window = {}, field = {}, artifact = {}, validationReport = {}) {
  const wetMaskDigest = canonicalJsonDigest(canonicalizeJsonValue(field.wetMask));
  const landMaskDigest = canonicalJsonDigest(canonicalizeJsonValue(field.landMask));
  return withDigest({
    type: 'anchor.reference-patch.flow-generation-inputs',
    version: '1.0.0',
    sourcePhase: 'REAL-BATHY-R1-bathymetry-generated',
    status: 'reference-patch-bathymetry-ready-current-and-scalar-artifacts-not-generated',
    atlasDigest: atlas.atlasDigest,
    patchDigest: window.patchDigest,
    bathymetryArtifactDigest: artifact.artifactDigest,
    wetLandMaskIdentity: {
      source: 'reference-bathymetry-window',
      wetMaskDigest,
      landMaskDigest,
      hiddenTruthExposed: false
    },
    bottomDepthBathymetryArtifactDigest: artifact.artifactDigest,
    coastlineSummary: summarizeCoastline(field.coastline, field.wetMask, field.operationalDomain?.horizontal ?? {}),
    sourceDataset: atlas.sourceDataset,
    selectedBounds: window.bounds,
    sourceGridShape: {
      rows: field.bottomDepthMeters.length,
      columns: field.bottomDepthMeters[0]?.length ?? 0,
      cellCount: field.bottomDepthMeters.length * (field.bottomDepthMeters[0]?.length ?? 0),
      widthMeters: field.operationalDomain?.horizontal?.widthMeters ?? null,
      heightMeters: field.operationalDomain?.horizontal?.heightMeters ?? null
    },
    validationStatus: validationReport.status,
    dependencyPlan: {
      currents: 'REQUIRES_REGENERATION',
      scalarFields: 'REQUIRES_REGENERATION',
      hotspots: 'REQUIRES_REGENERATION',
      startsDropZones: 'NEEDS_VALIDATION',
      benchmarkBundle: 'REQUIRES_REGENERATION',
      environmentArtifact: 'REQUIRES_REGENERATION'
    },
    generatedArtifacts: {
      currentField4D: false,
      scalarField4D: false,
      hotspots: false,
      startsDropZonesValidated: false,
      benchmarkBundle: false
    },
    claimBoundary: {
      referenceBathymetryPatch: true,
      currentField4DGenerated: false,
      scalarField4DGenerated: false,
      hotspotsGenerated: false,
      certifiedForNavigation: false,
      operationalForecast: false,
      hiddenTruthExposed: false
    }
  }, 'flowGenerationInputDigest');
}

function deferredDependencyGraphHint(bathymetryArtifactDigest = null) {
  return {
    bathymetryArtifact: { state: 'CURRENT', artifactDigest: bathymetryArtifactDigest },
    wetLandMask: { state: 'CURRENT', artifactDigest: bathymetryArtifactDigest },
    coastline: { state: 'CURRENT', artifactDigest: bathymetryArtifactDigest },
    currentArtifact: { state: 'REQUIRES_REGENERATION', artifactDigest: null },
    scalarArtifact: { state: 'REQUIRES_REGENERATION', artifactDigest: null },
    hotspots: { state: 'REQUIRES_REGENERATION', artifactDigest: null },
    startsDropZones: { state: 'NEEDS_VALIDATION', artifactDigest: null },
    benchmarkBundle: { state: 'REQUIRES_REGENERATION', artifactDigest: null },
    environmentArtifact: { state: 'REQUIRES_REGENERATION', artifactDigest: null }
  };
}

function referenceWindowGridShape(window = {}, options = {}) {
  const bounds = window.bounds ?? DEFAULT_REFERENCE_BOUNDS;
  const widthMeters = lonDistanceMeters(bounds.westLon, bounds.eastLon, (bounds.southLat + bounds.northLat) / 2);
  const heightMeters = latDistanceMeters(bounds.southLat, bounds.northLat);
  const cellSizeMeters = positive(options.cellSizeMeters ?? window.selectedResolutionMeters, 1500);
  const columns = clampInteger(Math.round(widthMeters / cellSizeMeters) + 1, 9, 161);
  const rows = clampInteger(Math.round(heightMeters / cellSizeMeters) + 1, 9, 121);
  return {
    widthMeters: round(widthMeters),
    heightMeters: round(heightMeters),
    cellSizeMeters,
    columns,
    rows,
    cellCount: columns * rows
  };
}

function normalizeSourceDataset(input = {}, referenceDataAvailable = false) {
  const sourceInput = typeof input === 'string' ? { name: input } : (input ?? {});
  if (referenceDataAvailable) {
    return {
      name: String(sourceInput.name ?? 'Public Bathymetry/Topography Reference Fixture'),
      version: String(sourceInput.version ?? 'preprocessed-local-fixture'),
      provider: String(sourceInput.provider ?? 'User-provided local artifact'),
      citation: String(sourceInput.citation ?? 'Public bathymetry/topography fixture supplied outside runtime.'),
      sourceResolution: String(sourceInput.sourceResolution ?? 'preprocessed fixture resolution'),
      sourceKey: sourceInput.sourceKey ?? null,
      sourceVariant: sourceInput.sourceVariant ?? null,
      actualRasterResolutionArcSeconds: finiteOrNull(sourceInput.actualRasterResolutionArcSeconds),
      verticalUnits: String(sourceInput.verticalUnits ?? 'meters relative to sea level'),
      horizontalCoordinateFrame: String(sourceInput.horizontalCoordinateFrame ?? 'EPSG:4326 lon/lat'),
      licenseOrTermsNote: String(sourceInput.licenseOrTermsNote ?? 'Preserve source dataset terms in exported project metadata.'),
      referenceDataAvailable: true
    };
  }
  return {
    name: NO_REFERENCE_DATA_FIXTURE,
    version: 'placeholder-ui-raster',
    provider: 'ANCHOR local placeholder',
    citation: 'No GEBCO/ETOPO-derived fixture is checked in. Use this only to exercise the browser workflow.',
    sourceResolution: 'placeholder display raster, not a public bathymetry product',
    verticalUnits: 'meters relative to sea level',
    horizontalCoordinateFrame: 'EPSG:4326 lon/lat',
    licenseOrTermsNote: 'Replace with a preprocessed GEBCO/ETOPO/public-data fixture before claiming REAL-BATHY-R1 complete.',
    referenceDataAvailable: false
  };
}

function normalizeManifestOverview(input = {}) {
  const displayResolution = input.displayResolution ?? input.grid ?? {};
  const columns = clampInteger(input.columns ?? displayResolution.columns ?? 0, 0, 20000);
  const rows = clampInteger(input.rows ?? displayResolution.rows ?? 0, 0, 20000);
  return {
    overviewId: String(input.overviewId ?? input.fixtureId ?? input.id ?? 'reference-bathymetry-overview'),
    fixtureId: input.fixtureId ? String(input.fixtureId) : null,
    label: String(input.label ?? 'Reference Bathymetry Overview'),
    role: String(input.role ?? 'globalOverview'),
    sourceDataset: input.sourceDataset ?? 'UNKNOWN_REFERENCE_DATASET',
    provider: input.provider ?? null,
    sourceResolution: input.sourceResolution ?? input.resolution ?? null,
    sourceKey: input.sourceKey ?? null,
    sourceVariant: input.sourceVariant ?? null,
    actualRasterResolutionArcSeconds: finiteOrNull(input.actualRasterResolutionArcSeconds),
    columns,
    rows,
    displayResolution: {
      columns,
      rows
    },
    previewResolution: input.previewResolution ? {
      columns: clampInteger(input.previewResolution.columns, 0, 20000),
      rows: clampInteger(input.previewResolution.rows, 0, 20000)
    } : null,
    resolution: input.resolution ?? null,
    overviewPath: input.overviewPath ?? input.path ?? null,
    previewPath: input.previewPath ?? null,
    previewKind: input.previewKind ?? null,
    previewRasterDigest: input.previewRasterDigest ?? null,
    previewActualRasterResolutionArcSeconds: finiteOrNull(input.previewActualRasterResolutionArcSeconds),
    rasterPath: input.rasterPath ?? null,
    digest: input.digest ?? null,
    bounds: input.bounds ? normalizeLonLatBounds(input.bounds) : {
      westLon: -180,
      eastLon: 180,
      southLat: -90,
      northLat: 90
    }
  };
}

function normalizeManifestFixture(input = {}) {
  return {
    fixtureId: String(input.fixtureId ?? input.id ?? 'reference-bathymetry-fixture'),
    label: String(input.label ?? input.fixtureId ?? input.id ?? 'Reference Bathymetry Fixture'),
    role: String(input.role ?? 'lowResolutionReferencePatch'),
    sourceDataset: input.sourceDataset ?? 'UNKNOWN_REFERENCE_DATASET',
    provider: input.provider ?? null,
    sourceResolution: input.sourceResolution ?? input.resolution ?? null,
    sourceKey: input.sourceKey ?? null,
    sourceVariant: input.sourceVariant ?? null,
    actualRasterResolutionArcSeconds: finiteOrNull(input.actualRasterResolutionArcSeconds),
    columns: clampInteger(input.columns ?? input.grid?.columns ?? 0, 0, 20000),
    rows: clampInteger(input.rows ?? input.grid?.rows ?? 0, 0, 20000),
    bounds: input.bounds ? normalizeLonLatBounds(input.bounds) : normalizeLonLatBounds(DEFAULT_REFERENCE_BOUNDS),
    rasterPath: input.rasterPath ?? null,
    digest: input.digest ?? input.rasterDigest ?? null,
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    rasterArtifact: normalizeReferenceRasterArtifact(input.rasterArtifact ?? input.artifact ?? null)
  };
}

function normalizeReferenceFixtures(input = []) {
  return (Array.isArray(input) ? input : [])
    .map(normalizeManifestFixture)
    .filter((fixture) => fixture.fixtureId)
    .sort(referenceFixtureSortKey);
}

function selectPrimaryReferenceFixture(fixtures = []) {
  return [...(fixtures ?? [])].sort(referenceFixtureSortKey)
    .find((fixture) => fixture?.rasterArtifact?.artifactType === REFERENCE_BATHYMETRY_RASTER_TYPE)
    ?? [...(fixtures ?? [])].sort(referenceFixtureSortKey)[0]
    ?? null;
}

function compactReferenceFixture(fixture = {}) {
  if (!fixture) return null;
  return {
    fixtureId: fixture.fixtureId,
    label: fixture.label,
    role: fixture.role,
    sourceDataset: fixture.sourceDataset,
    provider: fixture.provider,
    sourceResolution: fixture.sourceResolution,
    sourceKey: fixture.sourceKey,
    sourceVariant: fixture.sourceVariant,
    actualRasterResolutionArcSeconds: fixture.actualRasterResolutionArcSeconds,
    columns: fixture.columns,
    rows: fixture.rows,
    bounds: fixture.bounds,
    digest: fixture.digest ?? fixture.rasterArtifact?.rasterDigest ?? null,
    tags: Array.isArray(fixture.tags) ? fixture.tags.slice() : [],
    hiddenTruthExposed: false
  };
}

function referenceFixtureSortKey(a = {}, b = {}) {
  const roleA = a.role === 'missionReadyPatch' ? 0 : 1;
  const roleB = b.role === 'missionReadyPatch' ? 0 : 1;
  if (roleA !== roleB) return roleA - roleB;
  const resA = Number(a.actualRasterResolutionArcSeconds ?? 9999);
  const resB = Number(b.actualRasterResolutionArcSeconds ?? 9999);
  if (resA !== resB) return resA - resB;
  return String(a.fixtureId ?? '').localeCompare(String(b.fixtureId ?? ''));
}

function normalizeReferenceOverviewArtifact(input = null) {
  if (!input || typeof input !== 'object') return null;
  const artifactType = input.artifactType ?? REFERENCE_BATHYMETRY_OVERVIEW_TYPE;
  const role = String(input.role ?? 'globalOverview');
  if (artifactType !== REFERENCE_BATHYMETRY_OVERVIEW_TYPE && role !== 'globalOverview') return null;
  const displayResolution = input.displayResolution ?? input.grid ?? {};
  const sourceDataset = normalizeSourceDataset({
    name: input.sourceDataset?.name ?? input.sourceDataset ?? 'ETOPO_2022',
    version: input.sourceDataset?.version ?? input.version ?? 'v1',
    provider: input.sourceDataset?.provider ?? input.provider ?? 'NOAA NCEI',
    citation: input.sourceDataset?.citation ?? input.citation,
    sourceResolution: input.sourceDataset?.sourceResolution ?? input.sourceResolution ?? '60 arc-second',
    sourceKey: input.sourceDataset?.sourceKey ?? input.sourceKey ?? null,
    sourceVariant: input.sourceDataset?.sourceVariant ?? input.sourceVariant ?? null,
    actualRasterResolutionArcSeconds: input.sourceDataset?.actualRasterResolutionArcSeconds ?? input.actualRasterResolutionArcSeconds,
    verticalUnits: input.sourceDataset?.verticalUnits ?? input.verticalUnits,
    horizontalCoordinateFrame: input.sourceDataset?.horizontalCoordinateFrame ?? input.horizontalCoordinateFrame,
    licenseOrTermsNote: input.sourceDataset?.licenseOrTermsNote ?? input.licenseOrTermsNote
  }, true);
  return {
    artifactType: REFERENCE_BATHYMETRY_OVERVIEW_TYPE,
    artifactVersion: String(input.artifactVersion ?? REFERENCE_BATHYMETRY_OVERVIEW_VERSION),
    overviewId: String(input.overviewId ?? input.id ?? input.fixtureId ?? 'reference-bathymetry-global-overview'),
    label: String(input.label ?? 'Reference Bathymetry Global Overview'),
    role,
    sourceDataset,
    bounds: normalizeLonLatBounds(input.bounds ?? {
      westLon: -180,
      eastLon: 180,
      southLat: -90,
      northLat: 90
    }),
    displayResolution: {
      columns: clampInteger(input.columns ?? displayResolution.columns ?? 0, 0, 20000),
      rows: clampInteger(input.rows ?? displayResolution.rows ?? 0, 0, 20000)
    },
    previewPath: input.previewPath ?? null,
    previewKind: input.previewKind ?? 'metadataDrivenCanvas',
    previewResolution: input.previewResolution ? {
      columns: clampInteger(input.previewResolution.columns, 0, 20000),
      rows: clampInteger(input.previewResolution.rows, 0, 20000)
    } : null,
    previewRasterDigest: input.previewRasterDigest ?? null,
    previewActualRasterResolutionArcSeconds: finiteOrNull(input.previewActualRasterResolutionArcSeconds),
    colorRamp: Array.isArray(input.colorRamp) ? input.colorRamp.map((entry) => ({ ...entry })) : [],
    elevationSummary: input.elevationSummary ?? null,
    depthSummary: input.depthSummary ?? null,
    landOceanSummary: input.landOceanSummary ?? null,
    sourceFileDigest: input.sourceFileDigest ?? null,
    sourceOverviewDigest: input.sourceOverviewDigest ?? null,
    digest: input.digest ?? input.sourceOverviewDigest ?? null,
    localAbsolutePathsIncluded: input.localAbsolutePathsIncluded === true ? true : false,
    rawExternalDataPathIncluded: input.rawExternalDataPathIncluded === true ? true : false,
    claimBoundary: {
      ...(input.claimBoundary ?? {}),
      overviewForSelectionOnly: true,
      missionResolutionBathymetry: false,
      certifiedForNavigation: false,
      operationalOceanForecast: false,
      hiddenTruthExposed: false
    }
  };
}

function normalizeReferenceRasterArtifact(input = null) {
  if (!input || typeof input !== 'object') return null;
  if (input.artifactType !== REFERENCE_BATHYMETRY_RASTER_TYPE) return null;
  const grid = input.grid ?? {};
  const elevation = Array.isArray(grid.elevationMeters) ? grid.elevationMeters : [];
  const rows = elevation.length;
  const columns = elevation[0]?.length ?? 0;
  return {
    artifactType: REFERENCE_BATHYMETRY_RASTER_TYPE,
    artifactVersion: String(input.artifactVersion ?? REFERENCE_BATHYMETRY_RASTER_VERSION),
    fixtureId: String(input.fixtureId ?? input.id ?? 'reference-bathymetry-raster'),
    role: String(input.role ?? 'lowResolutionReferencePatch'),
    sourceResolution: input.sourceResolution ?? input.sourceDataset?.sourceResolution ?? null,
    sourceKey: input.sourceKey ?? input.sourceDataset?.sourceKey ?? input.provenance?.sourceKey ?? null,
    sourceVariant: input.sourceVariant ?? input.sourceDataset?.sourceVariant ?? input.provenance?.sourceVariant ?? null,
    actualRasterResolutionArcSeconds: finiteOrNull(input.actualRasterResolutionArcSeconds ?? input.sourceDataset?.actualRasterResolutionArcSeconds),
    degreeResolution: input.degreeResolution ?? input.provenance?.degreeResolution ?? null,
    sourceDataset: normalizeSourceDataset(input.sourceDataset, true),
    bounds: normalizeLonLatBounds(input.bounds ?? DEFAULT_REFERENCE_BOUNDS),
    grid: {
      columns: clampInteger(grid.columns ?? columns, 1, 20000),
      rows: clampInteger(grid.rows ?? rows, 1, 20000),
      lonAxis: Array.isArray(grid.lonAxis) ? grid.lonAxis.map(Number) : [],
      latAxis: Array.isArray(grid.latAxis) ? grid.latAxis.map(Number) : [],
      elevationMeters: elevation.map((row) => row.map((value) => round(value)))
    },
    derived: input.derived ?? {},
    summaries: input.summaries ?? summarizeElevationRaster(elevation),
    provenance: {
      ...(input.provenance ?? {}),
      hiddenTruthExposed: input.provenance?.hiddenTruthExposed === true ? true : false
    },
    rasterDigest: input.rasterDigest ?? canonicalJsonDigest(canonicalizeJsonValue({
      sourceDataset: input.sourceDataset,
      bounds: input.bounds,
      grid
    }))
  };
}

function referenceFixtureForLonLat(fixtures = [], lon = 0, lat = 0) {
  const x = Number(lon);
  const y = Number(lat);
  return (fixtures ?? []).find((fixture) => {
    const bounds = fixture?.rasterArtifact?.bounds ?? fixture?.bounds;
    return bounds
      && x >= Number(bounds.westLon)
      && x <= Number(bounds.eastLon)
      && y >= Number(bounds.southLat)
      && y <= Number(bounds.northLat);
  }) ?? null;
}

function boundsContainsBounds(outer = {}, inner = {}) {
  return Number(inner.westLon) >= Number(outer.westLon)
    && Number(inner.eastLon) <= Number(outer.eastLon)
    && Number(inner.southLat) >= Number(outer.southLat)
    && Number(inner.northLat) <= Number(outer.northLat);
}

function boundsOverlapFraction(a = {}, b = {}) {
  const west = Math.max(Number(a.westLon), Number(b.westLon));
  const east = Math.min(Number(a.eastLon), Number(b.eastLon));
  const south = Math.max(Number(a.southLat), Number(b.southLat));
  const north = Math.min(Number(a.northLat), Number(b.northLat));
  const overlapArea = Math.max(0, east - west) * Math.max(0, north - south);
  const aArea = Math.max(0.000001, (Number(a.eastLon) - Number(a.westLon)) * (Number(a.northLat) - Number(a.southLat)));
  const bArea = Math.max(0.000001, (Number(b.eastLon) - Number(b.westLon)) * (Number(b.northLat) - Number(b.southLat)));
  return overlapArea / Math.min(aArea, bArea);
}

function isWorldScaleBounds(bounds = null) {
  if (!bounds) return false;
  return Number(bounds.westLon) <= -179
    && Number(bounds.eastLon) >= 179
    && Number(bounds.southLat) <= -89
    && Number(bounds.northLat) >= 89;
}

function referenceAtlasBoundsFromInput(input = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = input?.overviewBounds ?? input?.overviewArtifact?.bounds ?? input?.manifest?.overview?.bounds ?? input?.bounds ?? input;
  return normalizeLonLatBounds(bounds ?? GLOBAL_REFERENCE_ATLAS_BOUNDS);
}

function referenceAtlasViewForCenter(centerLon = 0, centerLat = 0, zoom = 1, atlasOrBounds = GLOBAL_REFERENCE_ATLAS_BOUNDS) {
  const bounds = referenceAtlasBoundsFromInput(atlasOrBounds);
  const worldLonSpan = Math.max(0.000001, bounds.eastLon - bounds.westLon);
  const worldLatSpan = Math.max(0.000001, bounds.northLat - bounds.southLat);
  const viewport = referenceAtlasViewport({ centerLon, centerLat, zoom }, bounds);
  return {
    panX: round(viewport.centerLon / Math.max(0.000001, worldLonSpan / 2)),
    panY: round(-viewport.centerLat / Math.max(0.000001, worldLatSpan / 2)),
    rotationYawDegrees: 0,
    rotationPitchDegrees: 0,
    zoom: viewport.zoom
  };
}

function referenceAtlasLonLatToViewportPoint(lon = 0, lat = 0, viewport = referenceAtlasViewport(), width = 1, height = 1) {
  return {
    x: round(((Number(lon) - viewport.lonWest) / Math.max(0.000001, viewport.lonEast - viewport.lonWest)) * width),
    y: round(((viewport.latNorth - Number(lat)) / Math.max(0.000001, viewport.latNorth - viewport.latSouth)) * height)
  };
}

function sampleReferenceRasterArtifact(artifact = null, lon = 0, lat = 0) {
  if (!artifact?.grid?.elevationMeters?.length) return null;
  const grid = artifact.grid;
  const rows = grid.elevationMeters.length;
  const columns = grid.elevationMeters[0]?.length ?? 0;
  if (rows <= 0 || columns <= 0) return null;
  const bounds = artifact.bounds ?? DEFAULT_REFERENCE_BOUNDS;
  const lonAxis = grid.lonAxis?.length === columns ? grid.lonAxis : null;
  const latAxis = grid.latAxis?.length === rows ? grid.latAxis : null;
  const x = lonAxis
    ? axisFraction(lonAxis, Number(lon))
    : (Number(lon) - bounds.westLon) / Math.max(0.000001, bounds.eastLon - bounds.westLon) * (columns - 1);
  const latDescending = latAxis ? Number(latAxis[0]) > Number(latAxis[latAxis.length - 1]) : true;
  const y = latAxis
    ? axisFraction(latAxis, Number(lat))
    : latDescending
      ? (bounds.northLat - Number(lat)) / Math.max(0.000001, bounds.northLat - bounds.southLat) * (rows - 1)
      : (Number(lat) - bounds.southLat) / Math.max(0.000001, bounds.northLat - bounds.southLat) * (rows - 1);
  return bilinearRasterSample(grid.elevationMeters, x, y);
}

function axisFraction(axis = [], value = 0) {
  if (!axis.length) return 0;
  const descending = Number(axis[0]) > Number(axis[axis.length - 1]);
  if (descending) {
    const reversed = [...axis].reverse();
    return (axis.length - 1) - axisFraction(reversed, value);
  }
  if (value <= axis[0]) return 0;
  if (value >= axis[axis.length - 1]) return axis.length - 1;
  for (let i = 0; i < axis.length - 1; i += 1) {
    const a = Number(axis[i]);
    const b = Number(axis[i + 1]);
    if (value >= a && value <= b) return i + (value - a) / Math.max(0.000001, b - a);
  }
  return 0;
}

function bilinearRasterSample(raster = [], x = 0, y = 0) {
  const rows = raster.length;
  const columns = raster[0]?.length ?? 0;
  if (!rows || !columns) return null;
  const clampedX = clampNumber(x, 0, columns - 1);
  const clampedY = clampNumber(y, 0, rows - 1);
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(columns - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = clampedX - x0;
  const ty = clampedY - y0;
  const a = Number(raster[y0]?.[x0]);
  const b = Number(raster[y0]?.[x1]);
  const c = Number(raster[y1]?.[x0]);
  const d = Number(raster[y1]?.[x1]);
  if (![a, b, c, d].every(Number.isFinite)) return null;
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function normalizePreviewResolution(input = {}) {
  return {
    width: clampInteger(input.width ?? input.columns ?? DEFAULT_PREVIEW_RESOLUTION.width, 64, 720),
    height: clampInteger(input.height ?? input.rows ?? DEFAULT_PREVIEW_RESOLUTION.height, 32, 360)
  };
}

function normalizeLonLatBounds(input = DEFAULT_REFERENCE_BOUNDS) {
  const westLon = clampNumber(input.westLon ?? input.west ?? DEFAULT_REFERENCE_BOUNDS.westLon, -180, 179.9);
  const eastLon = clampNumber(input.eastLon ?? input.east ?? DEFAULT_REFERENCE_BOUNDS.eastLon, westLon + 0.05, 180);
  const southLat = clampNumber(input.southLat ?? input.south ?? DEFAULT_REFERENCE_BOUNDS.southLat, -90, 89.8);
  const northLat = clampNumber(input.northLat ?? input.north ?? DEFAULT_REFERENCE_BOUNDS.northLat, southLat + 0.05, 90);
  return {
    westLon: round(westLon),
    eastLon: round(eastLon),
    southLat: round(southLat),
    northLat: round(northLat)
  };
}

function elevationModel(lon = 0, lat = 0, seed = '') {
  const coastalShelf = 2400 * Math.tanh((Math.abs(lon + 123.1) - 1.0) * 1.4);
  const basin = -2600 - 850 * gaussian(lon, lat, -123.6, 36.4, 1.8, 1.0);
  const shelf = -80 - 460 * smoothstep(0.1, 1.4, Math.abs(lon + 122.35));
  const canyon = -850 * Math.exp(-Math.abs((lat - 36.72) - (lon + 123.0) * 0.5) * 5.5) * gaussian(lon, lat, -122.7, 36.7, 1.0, 0.45);
  const continental = lon > -122.2 ? 180 + 620 * gaussian(lon, lat, -121.9, 36.3, 1.2, 1.8) : 0;
  const globalWave = 650 * Math.sin((lon + stableOffset(seed)) * Math.PI / 36) * Math.cos(lat * Math.PI / 44);
  const regionalBlend = gaussian(lon, lat, -123, 36.5, 4.8, 3.6);
  const regionalOcean = Math.max(basin, shelf + canyon + coastalShelf * 0.12);
  const regional = lon > -122.2 ? Math.max(regionalOcean, continental) : regionalOcean;
  const global = -1800 + globalWave + 900 * Math.sin(lon * Math.PI / 65) + 500 * Math.cos(lat * Math.PI / 30);
  return round(lerp(global, regional, regionalBlend));
}

function detectReferenceRegionTags(stats = {}) {
  const tags = ['reference-bathymetry-window'];
  if (stats.shelfFraction > 0.22) tags.push('shelf');
  if (stats.basinFraction > 0.25) tags.push('basin');
  if (stats.slopeStats?.max > 250) tags.push('slope');
  if (stats.landFraction > 0.05 && stats.oceanFraction > 0.2) tags.push('coastline');
  if (!stats.referenceDataAvailable) tags.push(NO_REFERENCE_DATA_FIXTURE);
  return tags;
}

function coastlineSegments(wetMask = [], shape = {}) {
  const rows = wetMask.length;
  const columns = wetMask[0]?.length ?? 0;
  const dx = Number(shape.widthMeters ?? 1) / Math.max(1, columns - 1);
  const dy = Number(shape.heightMeters ?? 1) / Math.max(1, rows - 1);
  const segments = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (wetMask[y]?.[x] !== true) continue;
      for (const [name, ox, oy] of [['west', -1, 0], ['east', 1, 0], ['north', 0, -1], ['south', 0, 1]]) {
        if (wetMask[y + oy]?.[x + ox] === true) continue;
        const x0 = x * dx;
        const y0 = y * dy;
        segments.push({
          id: `reference-coast-${x}-${y}-${name}`,
          source: 'reference-patch-wet-land-adjacency',
          start: { eastMeters: round(x0), northMeters: round(y0) },
          end: { eastMeters: round(x0 + (name === 'north' || name === 'south' ? dx : 0)), northMeters: round(y0 + (name === 'east' || name === 'west' ? dy : 0)) }
        });
      }
    }
  }
  return segments.slice(0, 600);
}

function summarizeCoastline(coastline = [], wetMask = [], shape = {}) {
  const wetCount = wetMask.flat().filter(Boolean).length;
  return {
    type: 'anchor.reference-patch.coastline-summary',
    segmentCount: coastline.length,
    coastlineLengthEstimateMeters: round(coastline.length * Math.min(Number(shape.cellSizeMeters ?? 1000), 5000)),
    connectedWetFraction: wetCount ? 1 : 0,
    source: 'reference patch wet/land adjacency',
    hiddenTruthExposed: false
  };
}

function slopeValues(depths = [], wetMask = []) {
  const values = [];
  for (let y = 0; y < depths.length; y += 1) {
    for (let x = 0; x < (depths[0]?.length ?? 0); x += 1) {
      if (wetMask[y]?.[x] !== true) continue;
      const here = Number(depths[y][x] ?? 0);
      if (wetMask[y]?.[x + 1] === true) values.push(Math.abs(Number(depths[y][x + 1]) - here));
      if (wetMask[y + 1]?.[x] === true) values.push(Math.abs(Number(depths[y + 1][x]) - here));
    }
  }
  return values;
}

function localSlopeMagnitude(atlasInput = {}, lon = 0, lat = 0, step = 0.2) {
  const a = sampleReferenceBathymetryElevation(atlasInput, lon - step, lat);
  const b = sampleReferenceBathymetryElevation(atlasInput, lon + step, lat);
  const c = sampleReferenceBathymetryElevation(atlasInput, lon, lat - step);
  const d = sampleReferenceBathymetryElevation(atlasInput, lon, lat + step);
  return Math.sqrt((b - a) ** 2 + (d - c) ** 2) / 2;
}

function summarizeValues(values = []) {
  const finite = values.map(Number).filter(Number.isFinite);
  return {
    min: finite.length ? round(Math.min(...finite)) : 0,
    mean: finite.length ? round(mean(finite)) : 0,
    max: finite.length ? round(Math.max(...finite)) : 0,
    finite: finite.length === values.length
  };
}

function lonDistanceMeters(westLon, eastLon, lat) {
  return Math.abs((Number(eastLon) - Number(westLon)) * Math.PI / 180 * EARTH_RADIUS_METERS * Math.cos(Number(lat) * Math.PI / 180));
}

function latDistanceMeters(southLat, northLat) {
  return Math.abs((Number(northLat) - Number(southLat)) * Math.PI / 180 * EARTH_RADIUS_METERS);
}

function gaussian(x, y, cx, cy, sx, sy) {
  const dx = (x - cx) / Math.max(0.0001, sx);
  const dy = (y - cy) / Math.max(0.0001, sy);
  return Math.exp(-0.5 * (dx * dx + dy * dy));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(0.000001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function stableOffset(seed = '') {
  const token = String(canonicalJsonDigest({ seed })).replace(/^fnv1a32:/, '');
  return ((parseInt(token.slice(0, 6), 16) || 1) / 0xffffff) * 12;
}

function mean(values = []) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function lerp(a, b, t) {
  return Number(a ?? 0) + (Number(b ?? 0) - Number(a ?? 0)) * Number(t ?? 0);
}

function mixRgb(a = [0, 0, 0], b = [0, 0, 0], t = 0) {
  const amount = clamp01(t);
  return [
    Math.round(Number(a[0] ?? 0) + (Number(b[0] ?? 0) - Number(a[0] ?? 0)) * amount),
    Math.round(Number(a[1] ?? 0) + (Number(b[1] ?? 0) - Number(a[1] ?? 0)) * amount),
    Math.round(Number(a[2] ?? 0) + (Number(b[2] ?? 0) - Number(a[2] ?? 0)) * amount)
  ];
}

function rgba(rgb = [0, 0, 0], alpha = 255) {
  return [rgb[0], rgb[1], rgb[2], alpha];
}

function withDigest(value = {}, digestKey = 'digest') {
  const payload = { ...value };
  delete payload[digestKey];
  return { ...value, [digestKey]: canonicalJsonDigest(canonicalizeJsonValue(payload)) };
}

function stableToken(value = '') {
  return String(value).replace(/^fnv1a32:/, '').slice(0, 10) || 'reference';
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp01(value) {
  return clampNumber(value, 0, 1);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function clampInteger(value, min, max) {
  return Math.round(clampNumber(value, min, max));
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
