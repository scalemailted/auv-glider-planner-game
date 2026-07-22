 const MISSION_RESOLUTION_PROFILE_VERSION = 'mission-resolution-profile-world-r1';

 const MISSION_RESOLUTION_PROFILES = Object.freeze({
  tutorialCompact: Object.freeze({
    profileId: 'tutorialCompact',
    label: 'Tutorial Compact Lattice',
    planningLattice: { columns: 12, rows: 8, role: 'route planning and inspection' },
    terrainGrid: { columns: 25, rows: 17, role: 'bathymetry/land-sea mask source' },
    scienceGrid: { columns: 24, rows: 16, role: 'sample value and priority source' },
    currentGrid: { columns: 18, rows: 12, role: 'current vector source' },
    renderLod: { terrainMaxVertices: 2500, scalarTextureMaxPixels: 4096, currentVectorMaxGlyphs: 240, inspectionGlyphMaxCount: 120 },
    simulationTime: { dtSeconds: 300, maxSteps: 576 }
  }),
  coastalStandard: Object.freeze({
    profileId: 'coastalStandard',
    label: 'Coastal Mission Area',
    planningLattice: { columns: 32, rows: 20, role: 'route planning and inspection lattice' },
    terrainGrid: { columns: 129, rows: 81, role: 'bathymetry/land-sea source grid' },
    scienceGrid: { columns: 64, rows: 40, role: 'sampling value and uncertainty fields' },
    currentGrid: { columns: 48, rows: 30, role: 'flow vector fields' },
    renderLod: { terrainMaxVertices: 14000, scalarTextureMaxPixels: 6144, currentVectorMaxGlyphs: 560, inspectionGlyphMaxCount: 220 },
    simulationTime: { dtSeconds: 300, maxSteps: 432 }
  }),
  regionalFleet: Object.freeze({
    profileId: 'regionalFleet',
    label: 'Regional Fleet Area',
    planningLattice: { columns: 12, rows: 12, role: 'route planning and classroom inspection lattice' },
    terrainGrid: { columns: 193, rows: 121, role: 'bathymetry/land-sea source grid' },
    scienceGrid: { columns: 96, rows: 60, role: 'sampling value, belief, uncertainty, and priority fields' },
    currentGrid: { columns: 64, rows: 40, role: 'flow vector fields' },
    renderLod: { terrainMaxVertices: 24000, scalarTextureMaxPixels: 8192, currentVectorMaxGlyphs: 900, inspectionGlyphMaxCount: 300 },
    simulationTime: { dtSeconds: 300, maxSteps: 576 }
  }),
  regionalShelfFleet: Object.freeze({
    profileId: 'regionalShelfFleet',
    label: 'Regional Shelf Fleet Training Profile',
    planningLattice: { columns: 48, rows: 30, role: 'route planning and classroom inspection lattice' },
    terrainGrid: { columns: 193, rows: 121, role: 'bathymetry/land-sea source grid' },
    scienceGrid: { columns: 96, rows: 60, role: 'sampling value, belief, uncertainty, and priority fields' },
    currentGrid: { columns: 64, rows: 40, role: 'flow vector fields' },
    renderLod: { terrainMaxVertices: 24000, scalarTextureMaxPixels: 8192, currentVectorMaxGlyphs: 900, inspectionGlyphMaxCount: 300 },
    simulationTime: { dtSeconds: 300, maxSteps: 576 }
  }),
  browserPerformance: Object.freeze({
    profileId: 'browserPerformance',
    label: 'Browser Performance Regional Profile',
    planningLattice: { columns: 36, rows: 24, role: 'route planning and inspection lattice' },
    terrainGrid: { columns: 145, rows: 97, role: 'bathymetry/land-sea source grid' },
    scienceGrid: { columns: 72, rows: 48, role: 'sampling value and uncertainty fields' },
    currentGrid: { columns: 48, rows: 32, role: 'flow vector fields' },
    renderLod: { terrainMaxVertices: 15000, scalarTextureMaxPixels: 6144, currentVectorMaxGlyphs: 640, inspectionGlyphMaxCount: 240 },
    simulationTime: { dtSeconds: 300, maxSteps: 432 }
  })
});

 function createMissionResolutionProfile(options = {}) {
  return normalizeMissionResolutionProfile(options);
}

 function normalizeMissionResolutionProfile(input = {}) {
  const source = typeof input === 'string'
    ? MISSION_RESOLUTION_PROFILES[resolutionProfileAlias(input)] ?? MISSION_RESOLUTION_PROFILES.regionalShelfFleet
    : (MISSION_RESOLUTION_PROFILES[resolutionProfileAlias(input.profileId)] ? { ...MISSION_RESOLUTION_PROFILES[resolutionProfileAlias(input.profileId)], ...input, profileId: input.profileId ?? MISSION_RESOLUTION_PROFILES[resolutionProfileAlias(input.profileId)].profileId } : input);
  const base = source && Object.keys(source).length ? source : MISSION_RESOLUTION_PROFILES.regionalShelfFleet;
  const planningLattice = normalizeGridSpec(base.planningLattice ?? base.planningGrid ?? base.grid, MISSION_RESOLUTION_PROFILES.regionalShelfFleet.planningLattice);
  const terrainGrid = normalizeGridSpec(base.terrainGrid, MISSION_RESOLUTION_PROFILES.regionalShelfFleet.terrainGrid);
  const scienceGrid = normalizeGridSpec(base.scienceGrid ?? base.scalarGrid, MISSION_RESOLUTION_PROFILES.regionalShelfFleet.scienceGrid);
  const currentGrid = normalizeGridSpec(base.currentGrid ?? base.vectorGrid, MISSION_RESOLUTION_PROFILES.regionalShelfFleet.currentGrid);
  return {
    type: 'anchor.world.mission-resolution-profile',
    schemaVersion: '1.0',
    version: base.version ?? MISSION_RESOLUTION_PROFILE_VERSION,
    profileId: base.profileId ?? 'customResolutionProfile',
    label: base.label ?? 'Custom Mission Resolution Profile',
    planningLattice,
    terrainGrid,
    scienceGrid,
    currentGrid,
    renderLod: {
      terrainMaxVertices: positiveInt(base.renderLod?.terrainMaxVertices, 24000),
      scalarTextureMaxPixels: positiveInt(base.renderLod?.scalarTextureMaxPixels, 8192),
      currentVectorMaxGlyphs: positiveInt(base.renderLod?.currentVectorMaxGlyphs, 900),
      inspectionGlyphMaxCount: positiveInt(base.renderLod?.inspectionGlyphMaxCount, 300),
      usesSourceGridAsObjectGrid: false
    },
    simulationTime: {
      dtSeconds: Math.max(0.001, finite(base.simulationTime?.dtSeconds, 300)),
      maxSteps: positiveInt(base.simulationTime?.maxSteps, 576)
    },
    boundaryFlags: {
      planningResolutionEqualsPhysicalDomain: false,
      rendererMayDownsample: true,
      fieldSamplersUsePhysicalCoordinates: true,
      sourceArraysDrivePerCellRenderObjects: false,
      ownsPlanning: false,
      ownsSimulation: false,
      ownsScoring: false
    }
  };
}

 function createLegacyResolutionProfileFromGrid(grid = {}, options = {}) {
  const columns = positiveInt(grid.width ?? options.width, 1);
  const rows = positiveInt(grid.height ?? options.height, 1);
  return normalizeMissionResolutionProfile({
    profileId: options.profileId ?? `legacyGrid${columns}x${rows}`,
    label: options.label ?? 'Legacy Grid-Compatible Resolution Profile',
    planningLattice: { columns, rows, role: 'legacy route planning grid' },
    terrainGrid: { columns, rows, role: 'legacy terrain grid' },
    scienceGrid: { columns, rows, role: 'legacy scalar grid' },
    currentGrid: { columns, rows, role: 'legacy vector grid' },
    renderLod: {
      terrainMaxVertices: columns * rows,
      scalarTextureMaxPixels: columns * rows,
      currentVectorMaxGlyphs: Math.min(columns * rows, 900),
      inspectionGlyphMaxCount: Math.min(columns * rows, 300)
    },
    simulationTime: { dtSeconds: finite(options.dtSeconds, 1), maxSteps: positiveInt(options.maxSteps, 200) }
  });
}

 function validateMissionResolutionProfile(profile = {}) {
  const normalized = normalizeMissionResolutionProfile(profile);
  const errors = [];
  const warnings = [];
  for (const key of ['planningLattice', 'terrainGrid', 'scienceGrid', 'currentGrid']) {
    if (normalized[key].columns <= 0 || normalized[key].rows <= 0) errors.push(`${key} dimensions must be positive.`);
  }
  if (normalized.renderLod.usesSourceGridAsObjectGrid) errors.push('Regional render LOD must not use source grids as per-cell object grids.');
  if (normalized.terrainGrid.columns * normalized.terrainGrid.rows > normalized.renderLod.terrainMaxVertices && normalized.renderLod.terrainMaxVertices < 1000) {
    warnings.push('Terrain source grid exceeds declared terrainMaxVertices by a large margin.');
  }
  if (normalized.planningLattice.columns === normalized.terrainGrid.columns && normalized.planningLattice.rows === normalized.terrainGrid.rows) {
    warnings.push('Planning and terrain grids are equal; this is legacy-compatible but not a decoupled regional profile.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, profile: normalized };
}

 function missionResolutionProfileSummary(profile = {}) {
  const normalized = normalizeMissionResolutionProfile(profile);
  return {
    type: 'anchor.world.mission-resolution-profile-summary',
    version: MISSION_RESOLUTION_PROFILE_VERSION,
    profileId: normalized.profileId,
    label: normalized.label,
    planningCells: cellCount(normalized.planningLattice),
    terrainSamples: cellCount(normalized.terrainGrid),
    scienceSamples: cellCount(normalized.scienceGrid),
    currentSamples: cellCount(normalized.currentGrid),
    terrainToPlanningRatio: round(cellCount(normalized.terrainGrid) / Math.max(1, cellCount(normalized.planningLattice)), 3),
    scienceToPlanningRatio: round(cellCount(normalized.scienceGrid) / Math.max(1, cellCount(normalized.planningLattice)), 3),
    renderLod: { ...normalized.renderLod },
    decoupled: !sameGrid(normalized.planningLattice, normalized.terrainGrid) || !sameGrid(normalized.planningLattice, normalized.scienceGrid) || !sameGrid(normalized.planningLattice, normalized.currentGrid),
    browserFriendly: cellCount(normalized.terrainGrid) <= normalized.renderLod.terrainMaxVertices * 1.5 && normalized.renderLod.currentVectorMaxGlyphs <= 1200
  };
}

 function resolutionGridForRole(profile = {}, role = 'planning') {
  const normalized = normalizeMissionResolutionProfile(profile);
  if (role === 'terrain' || role === 'bathymetry' || role === 'mask') return normalized.terrainGrid;
  if (role === 'science' || role === 'scalar' || role === 'roi' || role === 'priority') return normalized.scienceGrid;
  if (role === 'current' || role === 'vector' || role === 'flow') return normalized.currentGrid;
  return normalized.planningLattice;
}

function resolutionProfileAlias(value) {
  if (value === 'compactTrainingArea') return 'tutorialCompact';
  if (value === 'coastalMissionArea') return 'coastalStandard';
  if (value === 'regionalFleetArea') return 'regionalFleet';
  return value;
}
function normalizeGridSpec(input = {}, fallback = {}) {
  return {
    columns: positiveInt(input.columns ?? input.width, fallback.columns ?? fallback.width ?? 1),
    rows: positiveInt(input.rows ?? input.height, fallback.rows ?? fallback.height ?? 1),
    role: input.role ?? fallback.role ?? 'field grid'
  };
}

function sameGrid(a, b) {
  return a.columns === b.columns && a.rows === b.rows;
}

function cellCount(grid = {}) {
  return Math.max(0, Number(grid.columns ?? 0) * Number(grid.rows ?? 0));
}

function positiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}


module.exports = {MISSION_RESOLUTION_PROFILE_VERSION, MISSION_RESOLUTION_PROFILES, createMissionResolutionProfile, normalizeMissionResolutionProfile, createLegacyResolutionProfileFromGrid, validateMissionResolutionProfile, missionResolutionProfileSummary, resolutionGridForRole}