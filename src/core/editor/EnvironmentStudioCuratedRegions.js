export const ENVIRONMENT_STUDIO_CURATED_REGION_SELECTION_TYPE = 'anchor.environment-studio.curated-region-selection';
export const ENVIRONMENT_STUDIO_BATHYMETRY_MODE_SELECTION_TYPE = 'anchor.environment-studio.bathymetry-mode-selection';

export const ENVIRONMENT_STUDIO_CURATED_REGIONS = Object.freeze([
  {
    regionId: 'monterey_canyon',
    label: 'Monterey Canyon',
    shortLabel: 'Monterey',
    description: 'Reference pipeline proving ground with canyon, shelf break, and coastal-slope context.',
    bounds: {
      westLon: -123.0,
      eastLon: -121.5,
      southLat: 36.0,
      northLat: 37.2
    },
    defaultWindowKm: { widthKm: 160, heightKm: 130 },
    expectedContext: ['submarineCanyon', 'shelfBreak', 'coastalSlope'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'stagedMissionReadyIfAvailable',
    stagingRole: 'missionReadyCandidate',
    tags: ['reference', 'canyon', 'shelf-break', 'alpha'],
    boundsConfidence: 'existingPipeline',
    notes: 'Only mission-ready when the current app-hosted tile library exposes a matching staged tile set.'
  },
  {
    regionId: 'hawaii_island_slope',
    label: 'Hawaii / Island Slope',
    shortLabel: 'Hawaii',
    description: 'Island-slope and deep-basin seed window for future staged reference or enhanced synthetic missions.',
    bounds: {
      westLon: -157.0,
      eastLon: -154.5,
      southLat: 18.0,
      northLat: 20.5
    },
    defaultWindowKm: { widthKm: 250, heightKm: 250 },
    expectedContext: ['islandSlope', 'deepBasin', 'islandWake'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'patchRequest',
    tags: ['island-slope', 'deep-basin', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  },
  {
    regionId: 'puerto_rico_trench_shelf',
    label: 'Puerto Rico Trench / Island Shelf',
    shortLabel: 'Puerto Rico',
    description: 'Trench, island shelf, and deep-slope seed window for future staging.',
    bounds: {
      westLon: -68.5,
      eastLon: -64.5,
      southLat: 17.0,
      northLat: 20.5
    },
    defaultWindowKm: { widthKm: 420, heightKm: 380 },
    expectedContext: ['trench', 'islandShelf', 'deepSlope'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'patchRequest',
    tags: ['trench', 'island-shelf', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  },
  {
    regionId: 'florida_straits',
    label: 'Florida Straits',
    shortLabel: 'Florida Straits',
    description: 'Strait, shelf, and boundary-current context seed window.',
    bounds: {
      westLon: -83.5,
      eastLon: -78.5,
      southLat: 23.0,
      northLat: 26.5
    },
    defaultWindowKm: { widthKm: 520, heightKm: 390 },
    expectedContext: ['strait', 'shelf', 'boundaryCurrent'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'patchRequest',
    tags: ['strait', 'shelf', 'boundary-current', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  },
  {
    regionId: 'gulf_shelf_canyon_segment',
    label: 'Gulf Shelf / Canyon Segment',
    shortLabel: 'Gulf Shelf',
    description: 'Large Gulf shelf/canyon operational-area seed window, expected to need multi-tile staging.',
    bounds: {
      westLon: -91.5,
      eastLon: -86.5,
      southLat: 26.5,
      northLat: 30.5
    },
    defaultWindowKm: { widthKm: 520, heightKm: 450 },
    expectedContext: ['gulfShelf', 'shelfBreak', 'canyonSegment'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'multiTileRequest',
    tags: ['gulf-shelf', 'shelf-break', 'multi-tile', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  },
  {
    regionId: 'northeast_us_shelf_break',
    label: 'Northeast US Shelf Break',
    shortLabel: 'NE Shelf Break',
    description: 'Shelf-break, slope-sea, and front seed window for future staging.',
    bounds: {
      westLon: -73.5,
      eastLon: -68.5,
      southLat: 38.0,
      northLat: 41.5
    },
    defaultWindowKm: { widthKm: 430, heightKm: 390 },
    expectedContext: ['shelfBreak', 'slopeSea', 'front'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'patchRequest',
    tags: ['shelf-break', 'front', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  },
  {
    regionId: 'california_shelf_break',
    label: 'California Shelf Break',
    shortLabel: 'California Shelf',
    description: 'California shelf-break and upwelling-context seed window for future staging.',
    bounds: {
      westLon: -126.0,
      eastLon: -123.0,
      southLat: 32.5,
      northLat: 35.5
    },
    defaultWindowKm: { widthKm: 300, heightKm: 330 },
    expectedContext: ['shelfBreak', 'coastalSlope', 'upwelling'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'patchRequest',
    tags: ['shelf-break', 'upwelling', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  },
  {
    regionId: 'alaska_fjord_shelf',
    label: 'Alaska Fjord / Shelf Region',
    shortLabel: 'Alaska Fjord',
    description: 'Fjord, shelf, and steep-coast seed window for future staging.',
    bounds: {
      westLon: -151.0,
      eastLon: -146.0,
      southLat: 58.0,
      northLat: 61.5
    },
    defaultWindowKm: { widthKm: 450, heightKm: 390 },
    expectedContext: ['fjord', 'shelf', 'steepCoast'],
    bathymetryModeRecommendation: 'referenceEnhancedSynthetic',
    currentStatus: 'requestOnly',
    stagingRole: 'patchRequest',
    tags: ['fjord', 'shelf', 'request-only'],
    boundsConfidence: 'initialOwnerReviewRequired',
    notes: 'Seed bounds for UI/product testing, not a certified scientific region definition.'
  }
]);

export const ENVIRONMENT_STUDIO_CURATED_REGION_OPTIONS = Object.freeze([
  {
    regionId: 'none',
    label: 'None',
    shortLabel: 'None',
    description: 'No curated preset selected.',
    bounds: null,
    defaultWindowKm: null,
    expectedContext: [],
    bathymetryModeRecommendation: 'realReference',
    currentStatus: 'none',
    stagingRole: 'none',
    tags: [],
    boundsConfidence: 'notApplicable',
    notes: 'Leaves the current editable operational window unchanged.'
  },
  ...ENVIRONMENT_STUDIO_CURATED_REGIONS
]);

export const ENVIRONMENT_STUDIO_BATHYMETRY_MODES = Object.freeze([
  {
    id: 'realReference',
    label: 'Real Reference',
    claimBoundary: 'Reference-derived bathymetry.',
    missionAuthority: 'referenceRaster',
    implemented: true,
    currentStatus: 'implementedCurrentReferencePath',
    description: 'Uses staged public/reference bathymetry artifacts directly.'
  },
  {
    id: 'referenceEnhancedSynthetic',
    label: 'Reference-Enhanced Synthetic',
    claimBoundary: 'Synthetic benchmark bathymetry conditioned by public reference bathymetry.',
    missionAuthority: 'enhancedSyntheticRaster',
    implemented: false,
    currentStatus: 'plannedScaffold',
    description: 'Future default for mission-authoring: public/reference regional scaffold plus deterministic synthetic fine-scale mission detail.'
  },
  {
    id: 'fullySyntheticSandbox',
    label: 'Fully Synthetic Sandbox',
    claimBoundary: 'Fully synthetic benchmark environment.',
    missionAuthority: 'syntheticRaster',
    implemented: false,
    currentStatus: 'plannedSelectorRoute',
    description: 'Future selector route to synthetic-only bathymetry authoring; existing sandbox remains separate in this R0 scaffold.'
  }
]);

export function curatedRegionById(regionId = 'none') {
  const key = String(regionId ?? 'none');
  return ENVIRONMENT_STUDIO_CURATED_REGION_OPTIONS.find((entry) => entry.regionId === key)
    ?? ENVIRONMENT_STUDIO_CURATED_REGION_OPTIONS[0];
}

export function bathymetryModeById(modeId = 'realReference') {
  const key = String(modeId ?? 'realReference');
  return ENVIRONMENT_STUDIO_BATHYMETRY_MODES.find((entry) => entry.id === key)
    ?? ENVIRONMENT_STUDIO_BATHYMETRY_MODES[0];
}

export function normalizeEnvironmentStudioCuratedRegionSelection(input = {}) {
  const selectedRegionId = input?.selectedRegionId ?? input?.regionId ?? null;
  const region = selectedRegionId ? curatedRegionById(selectedRegionId) : null;
  const hasRegion = Boolean(region && region.regionId !== 'none');
  return {
    type: ENVIRONMENT_STUDIO_CURATED_REGION_SELECTION_TYPE,
    selectedRegionId: hasRegion ? region.regionId : null,
    selectedRegionLabel: hasRegion ? region.label : null,
    selectedRegionSource: String(input?.selectedRegionSource ?? (hasRegion ? 'curatedRegion' : 'custom')),
    boundsApplied: Boolean(input?.boundsApplied ?? false),
    atlasViewportFocused: Boolean(input?.atlasViewportFocused ?? false),
    currentStatus: String(input?.currentStatus ?? region?.currentStatus ?? 'none'),
    stagingRole: String(input?.stagingRole ?? region?.stagingRole ?? 'none'),
    bathymetryModeRecommendation: String(input?.bathymetryModeRecommendation ?? region?.bathymetryModeRecommendation ?? 'realReference'),
    boundsConfidence: String(input?.boundsConfidence ?? region?.boundsConfidence ?? 'notApplicable'),
    expectedContext: Array.isArray(input?.expectedContext)
      ? input.expectedContext.map(String)
      : (region?.expectedContext ?? []).map(String),
    tags: Array.isArray(input?.tags) ? input.tags.map(String) : (region?.tags ?? []).map(String),
    notes: String(input?.notes ?? region?.notes ?? ''),
    bounds: hasRegion ? cloneBounds(input?.bounds ?? region.bounds) : null
  };
}

export function normalizeEnvironmentStudioBathymetryMode(input = {}) {
  const selectedMode = input?.selectedMode ?? input?.modeId ?? input?.id ?? input ?? 'realReference';
  const mode = bathymetryModeById(selectedMode);
  return {
    type: ENVIRONMENT_STUDIO_BATHYMETRY_MODE_SELECTION_TYPE,
    selectedMode: mode.id,
    label: mode.label,
    modeImplemented: mode.implemented === true,
    currentStatus: mode.currentStatus,
    claimBoundary: mode.claimBoundary,
    missionAuthority: mode.missionAuthority,
    description: mode.description
  };
}

export function curatedRegionBoundsCenter(bounds = {}) {
  return {
    lon: (Number(bounds.westLon) + Number(bounds.eastLon)) / 2,
    lat: (Number(bounds.southLat) + Number(bounds.northLat)) / 2
  };
}

function cloneBounds(bounds = null) {
  if (!bounds) return null;
  return {
    westLon: Number(bounds.westLon),
    eastLon: Number(bounds.eastLon),
    southLat: Number(bounds.southLat),
    northLat: Number(bounds.northLat)
  };
}
