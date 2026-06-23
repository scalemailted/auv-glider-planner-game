import { createSeededRng, seededUnit } from '../random/SeededRng.js';
import { createCoastalOperationalBathymetry } from '../science/BathymetryFieldModel.js';
import { bathymetryArtifactAdapterSummary, createBathymetryArtifactFromField } from './BathymetryArtifactAdapter.js';
import { createSignedTerrainSurfaceFromBathymetry, sampleSignedTerrainSurfaceAtUv, signedTerrainSurfaceSummary } from '../science/SignedTerrainSurfaceModel.js';
import { createOperationalDomainSpec, operationalDomainDigest, operationalDomainSummary } from '../domain/OperationalDomainSpec.js';
import { missionResolutionProfileSummary, normalizeMissionResolutionProfile } from '../domain/MissionResolutionProfile.js';
import { gridCellToPhysicalPoint } from '../domain/OperationalDomainCoordinates.js';
import { createMissionScaleModel, estimateRouteScale } from '../domain/MissionScaleModel.js';

export const REGIONAL_MISSION_DEFAULTS_VERSION = 'regional-mission-defaults-world-r1';

export function createRegionalContinentalShelfScenario(options = {}) {
  const seed = String(options.seed ?? 'world-r1-regional-shelf');
  const domain = createOperationalDomainSpec(options.domain ?? {});
  const profile = normalizeMissionResolutionProfile(options.resolutionProfile ?? options.profile ?? 'regionalShelfFleet');
  const planning = profile.planningLattice;
  const terrainGrid = profile.terrainGrid;
  const scienceGrid = profile.scienceGrid;
  const currentGrid = profile.currentGrid;
  const bathymetry = createCoastalOperationalBathymetry({
    seed: `${seed}:bathymetry`,
    width: terrainGrid.columns,
    height: terrainGrid.rows,
    maxDepthMeters: domain.vertical.maxDepthMeters,
    minimumNavigableDepthMeters: 8
  });
  const signedTerrainSurface = createSignedTerrainSurfaceFromBathymetry(bathymetry, { minimumNavigableDepthMeters: 8 });
  const bathymetryArtifact = createBathymetryArtifactFromField(bathymetry, {
    id: `${seed}:bathymetry-artifact`,
    signedTerrainSurface,
    operationalDomain: domain,
    physicalExtentMeters: { east: domain.horizontal.widthMeters, north: domain.horizontal.heightMeters }
  });
  const bathymetryArtifactSummary = bathymetryArtifactAdapterSummary(bathymetryArtifact);
  bathymetry.operationalDomain = operationalDomainSummary(domain);
  bathymetry.resolutionRole = 'terrainGrid';
  bathymetry.signedTerrainSurfaceDigest = signedTerrainSurface.digest;
  const regionalScience = buildField(scienceGrid, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).navigable ? evaluateRegionalScienceValueAtUv(u, v, { seed }) : 0);
  const regionalUncertainty = buildField(scienceGrid, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).navigable ? evaluateRegionalUncertaintyAtUv(u, v, { seed }) : 0);
  const regionalCurrent = buildVectorField(currentGrid, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).navigable ? evaluateRegionalCurrentAtUv(u, v, { seed }) : { u: 0, v: 0, magnitude: 0 });
  const roi = buildField(planning, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).navigable ? evaluateRegionalScienceValueAtUv(u, v, { seed }) : 0);
  const terrain = buildField(planning, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).land ? 1 : 0, { integer: true });
  const hazards = buildField(planning, (u, v) => evaluateRegionalHazardAtUv(u, v, { seed, signedTerrainSurface }), { integer: false });
  const current = buildVectorField(planning, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).navigable ? evaluateRegionalCurrentAtUv(u, v, { seed }) : { u: 0, v: 0, magnitude: 0 });
  const durationHours = Math.max(1, Math.round(domain.time.durationSeconds / 3600));
  const dtHours = Math.max(1, Math.round(domain.time.dtSeconds / 3600) || 1);
  const level = {
    schemaVersion: '2.0',
    type: 'anchor.level',
    levelId: options.levelId ?? 'regional_shelf_synthetic_world_r1',
    challengeMode: 'perfectKnowledge',
    meta: {
      name: options.name ?? 'Synthetic Regional Shelf Training Mission',
      description: 'Synthetic regional shelf/basin teaching mission with decoupled physical domain and source-field resolutions.',
      generated: true,
      seed,
      generationVersion: REGIONAL_MISSION_DEFAULTS_VERSION,
      syntheticEducational: true,
      calibratedOceanForecast: false,
      operationalForecast: false,
      disclaimer: 'Synthetic educational operating area. Not real Gulf of Mexico bathymetry or forecast data.',
      terrainAuthorityMode: 'signedElevationV1',
      operationalDomainDigest: operationalDomainDigest(domain),
      terrainSourceDigest: signedTerrainSurface.digest,
      landWaterSourceDigest: signedTerrainSurface.digest,
      coastlineSourceDigest: signedTerrainSurface.digest,
      bottomBoundarySourceDigest: signedTerrainSurface.digest,
      bathymetryPackageVersion: bathymetryArtifact.bathymetryPackageVersion,
      bathymetryManifestDigest: bathymetryArtifact.manifestDigest,
      bathymetryArtifactDigest: bathymetryArtifact.artifactDigest
    },
    operationalDomain: domain,
    resolutionProfile: profile,
    terrainAuthority: signedTerrainSurfaceSummary(signedTerrainSurface),
    signedTerrainSurface,
    world: {
      grid: {
        width: planning.columns,
        height: planning.rows,
        cellSizeMeters: Math.round(domain.horizontal.widthMeters / planning.columns)
      },
      time: { dt: dtHours, duration: durationHours, planningWindow: Math.max(1, Math.round(durationHours / 6)), displayUnits: 'hours' },
      operationalDomain: domain,
      resolutionProfile: profile
    },
    bathymetry,
    bathymetryArtifact,
    bathymetryArtifactSummary,
    regionalFields: {
      type: 'anchor.world.regional-field-pack',
      version: REGIONAL_MISSION_DEFAULTS_VERSION,
      source: {
        seed,
        synthetic: true,
        calibratedOceanForecast: false,
        operationalForecast: false
      },
      grids: {
        terrainGrid,
        scienceGrid,
        currentGrid,
        planningLattice: planning
      },
      scienceValue: regionalScience,
      uncertainty: regionalUncertainty,
      currentVector: regionalCurrent,
      bathymetryDepthMeters: bathymetry.depthMeters,
      signedTerrainSurfaceDigest: signedTerrainSurface.digest,
      sourceDigests: {
        terrainSourceDigest: signedTerrainSurface.digest,
        landWaterSourceDigest: signedTerrainSurface.digest,
        coastlineSourceDigest: signedTerrainSurface.digest,
        bottomBoundarySourceDigest: signedTerrainSurface.digest,
        bathymetryArtifact: bathymetryArtifact.artifactDigest,
        bathymetryManifest: bathymetryArtifact.manifestDigest
      }
    },
    layers: {
      terrain,
      hazards,
      depth: buildField(planning, (u, v) => sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v).bottomDepthMeters, { integer: false }),
      truth: { frames: [{ t: 0, current, roi }] },
      forecast: { frames: [{ t: 0, current, roi: blurField(roi) }] },
      bases: [{ id: 'base_regional_alpha', x: 2, y: Math.floor(planning.rows * 0.5), radius: 1 }],
      priorityTargets: buildPriorityTargets(planning, seed),
      mobileHazards: []
    },
    zones: buildDeploymentZones(planning, signedTerrainSurface, seed)
  };
  return level;
}

export function createRegionalFleetMission(options = {}) {
  const seed = String(options.seed ?? 'world-r1-regional-shelf');
  const profile = normalizeMissionResolutionProfile(options.resolutionProfile ?? options.profile ?? 'regionalShelfFleet');
  const planning = profile.planningLattice;
  const agentCount = Math.max(1, Math.min(6, Math.round(Number(options.agentCount ?? 3))));
  const starts = regionalDeploymentStartCells(planning);
  return {
    schemaVersion: '2.0',
    type: 'anchor.mission',
    missionId: options.missionId ?? 'regional_fleet_synthetic_world_r1',
    meta: {
      name: options.name ?? 'Regional Shelf Fleet Sampling',
      description: 'Synthetic educational fleet mission. Physical domain and field resolutions are decoupled from the planning lattice.',
      seed,
      syntheticEducational: true,
      calibratedOceanForecast: false,
      disclaimer: 'Synthetic educational operating area. Not real Gulf of Mexico bathymetry or forecast data.',
      terrainAuthorityMode: 'signedElevationV1',
      generationVersion: REGIONAL_MISSION_DEFAULTS_VERSION
    },
    resolutionProfile: profile,
    agents: Array.from({ length: agentCount }, (_value, index) => ({
      id: `glider_${index + 1}`,
      label: `Glider ${index + 1}`,
      start: starts[index],
      deployment: { mode: 'chooseFromZone', selectedStart: starts[index], zoneId: 'regional_drop_alpha', zoneIds: ['regional_drop_alpha'] },
      battery: 190,
      maxBattery: 190,
      maxSpeed: 1.1,
      nominalSpeedMetersPerSecond: 0.35,
      colorKey: `agent-${index + 1}`
    })),
    rules: {
      surfaceInterval: 8,
      sampling: { footprintRadiusMeters: 350, duplicateRadiusMeters: 500 },
      stochasticSeed: `${seed}:mission`,
      rngSeed: `${seed}:mission`
    },
    scoring: {
      missionMode: 'regionalSyntheticSampling',
      weights: { roi: 1, energy: -0.04, hazard: -35, duplicateSample: -8 }
    },
    physics: {
      gliderModel: 'educationalKinematicGlider',
      calibratedVehicleController: false,
      usesFull3DPlanning: false
    }
  };
}

export function createRegionalMissionBundle(options = {}) {
  const level = createRegionalContinentalShelfScenario(options);
  const mission = createRegionalFleetMission({ ...options, resolutionProfile: level.resolutionProfile });
  return {
    type: 'anchor.world.regional-mission-bundle',
    version: REGIONAL_MISSION_DEFAULTS_VERSION,
    level,
    mission,
    compactExport: createRegionalMissionCompactExport({ level, mission })
  };
}

export function createRegionalMissionCompactExport({ level = null, mission = null, seed = null } = {}) {
  const sourceLevel = level ?? createRegionalContinentalShelfScenario({ seed });
  const sourceMission = mission ?? createRegionalFleetMission({ seed, resolutionProfile: sourceLevel.resolutionProfile });
  const scaleModel = createMissionScaleModel({
    domain: sourceLevel.operationalDomain,
    profile: sourceLevel.resolutionProfile,
    glider: { nominalSpeedMetersPerSecond: sourceMission.agents?.[0]?.nominalSpeedMetersPerSecond ?? 0.35 }
  });
  const nominalRoutes = sourceMission.agents.map((agent, index) => {
    const start = agent.start ?? { x: 0, y: 0 };
    const end = { x: Math.max(0, sourceLevel.world.grid.width - 4 - index * 3), y: Math.max(1, Math.round(sourceLevel.world.grid.height * (0.28 + index * 0.18))) };
    return { agentId: agent.id, routeScale: estimateRouteScale([start, end], scaleModel) };
  });
  return {
    type: 'anchor.world.regional-compact-export',
    version: REGIONAL_MISSION_DEFAULTS_VERSION,
    schemaVersion: '1.0',
    meta: {
      name: sourceLevel.meta.name,
      seed: sourceLevel.meta.seed,
      syntheticEducational: true,
      calibratedOceanForecast: false,
      operationalForecast: false
    },
    levelId: sourceLevel.levelId,
    missionId: sourceMission.missionId,
    operationalDomain: operationalDomainSummary(sourceLevel.operationalDomain),
    resolutionProfile: missionResolutionProfileSummary(sourceLevel.resolutionProfile),
    fieldDigests: {
      operationalDomain: operationalDomainDigest(sourceLevel.operationalDomain),
      scienceValue: fieldDigest(sourceLevel.regionalFields.scienceValue),
      uncertainty: fieldDigest(sourceLevel.regionalFields.uncertainty),
      currentVector: fieldDigest(sourceLevel.regionalFields.currentVector),
      bathymetry: fieldDigest(sourceLevel.regionalFields.bathymetryDepthMeters)
    },
    counts: {
      planningCells: sourceLevel.world.grid.width * sourceLevel.world.grid.height,
      terrainSamples: sourceLevel.regionalFields.grids.terrainGrid.columns * sourceLevel.regionalFields.grids.terrainGrid.rows,
      scienceSamples: sourceLevel.regionalFields.grids.scienceGrid.columns * sourceLevel.regionalFields.grids.scienceGrid.rows,
      currentSamples: sourceLevel.regionalFields.grids.currentGrid.columns * sourceLevel.regionalFields.grids.currentGrid.rows,
      agentCount: sourceMission.agents.length
    },
    nominalRoutes,
    compact: true,
    containsFullFieldArrays: false,
    containsHiddenTruth: false,
    notes: 'Use this compact export for roundtrip metadata checks; full level/regionalFields remain available in createRegionalMissionBundle().'
  };
}

export function evaluateRegionalScienceValueAtUv(u, v, options = {}) {
  const seed = String(options.seed ?? 'world-r1-regional-shelf');
  const shelfFront = Math.exp(-((u - (0.38 + 0.05 * Math.sin(v * Math.PI * 2))) ** 2) / 0.012);
  const plume = Math.exp(-(((u - 0.18) ** 2) / 0.02 + ((v - 0.62) ** 2) / 0.035));
  const eddyRetained = Math.exp(-(((u - 0.72) ** 2) / 0.03 + ((v - 0.36) ** 2) / 0.04));
  const texture = (seededUnit(`${seed}:science:${Math.round(u * 100)}:${Math.round(v * 100)}`) - 0.5) * 0.07;
  return round(clamp01(0.12 + 0.45 * shelfFront + 0.28 * plume + 0.2 * eddyRetained + texture));
}

export function evaluateRegionalUncertaintyAtUv(u, v, options = {}) {
  const seed = String(options.seed ?? 'world-r1-regional-shelf');
  const offshore = clamp01(u);
  const sparse = 0.22 + 0.38 * offshore;
  const front = 0.28 * Math.exp(-((u - 0.46) ** 2) / 0.018);
  const texture = (seededUnit(`${seed}:uncertainty:${Math.round(u * 80)}:${Math.round(v * 80)}`) - 0.5) * 0.05;
  return round(clamp01(sparse + front + texture));
}

export function evaluateRegionalCurrentAtUv(u, v, options = {}) {
  const seed = String(options.seed ?? 'world-r1-regional-shelf');
  const alongShelf = 0.38 + 0.16 * Math.sin(v * Math.PI * 2.2);
  const shelfJet = Math.exp(-((u - 0.48) ** 2) / 0.02);
  const eddyDx = u - 0.72;
  const eddyDy = v - 0.34;
  const eddy = Math.exp(-(eddyDx * eddyDx + eddyDy * eddyDy) / 0.035);
  const jitter = (seededUnit(`${seed}:current:${Math.round(u * 64)}:${Math.round(v * 64)}`) - 0.5) * 0.035;
  const vector = {
    u: 0.08 + 0.16 * shelfJet - 0.18 * eddyDy * eddy + jitter,
    v: alongShelf * 0.24 * shelfJet + 0.18 * eddyDx * eddy - jitter * 0.5
  };
  return { u: round(vector.u), v: round(vector.v), magnitude: round(Math.hypot(vector.u, vector.v)) };
}

export function evaluateRegionalLandMaskAtUv(u, v) {
  const coastline = 0.08 + 0.035 * Math.sin(v * Math.PI * 3.2) + 0.045 * Math.exp(-((v - 0.62) ** 2) / 0.04);
  return u < coastline ? 1 : 0;
}

export function evaluateRegionalHazardAtUv(u, v, options = {}) {
  const terrainSample = options.signedTerrainSurface ? sampleSignedTerrainSurfaceAtUv(options.signedTerrainSurface, u, v) : null;
  if (terrainSample?.land || (!terrainSample && evaluateRegionalLandMaskAtUv(u, v) > 0)) return 1;
  const shallowBank = Math.exp(-(((u - 0.27) ** 2) / 0.012 + ((v - 0.22) ** 2) / 0.025));
  const steepCanyon = Math.exp(-(((u - 0.56 - 0.09 * v) ** 2) / 0.004 + ((v - 0.58) ** 2) / 0.25));
  return round(clamp01(0.08 * shallowBank + 0.18 * steepCanyon + (seededUnit(`${options.seed ?? 'world-r1'}:hazard:${Math.round(u * 48)}:${Math.round(v * 30)}`) > 0.985 ? 0.55 : 0)));
}

export function evaluateRegionalBathymetryDepthAtUv(u, v, domain = null) {
  if (evaluateRegionalLandMaskAtUv(u, v) > 0) return 0;
  const maxDepth = Number(domain?.vertical?.maxDepthMeters ?? 1000);
  const shelf = 20 + 140 * smoothstep(0.08, 0.46, u);
  const basin = maxDepth * 0.75 * smoothstep(0.42, 0.98, u);
  const canyon = 130 * Math.exp(-(((u - 0.56 - 0.08 * v) ** 2) / 0.006 + ((v - 0.58) ** 2) / 0.24));
  const seamount = 160 * Math.exp(-(((u - 0.76) ** 2) / 0.018 + ((v - 0.34) ** 2) / 0.028));
  return round(Math.max(0, Math.min(maxDepth, shelf + basin + canyon - seamount)));
}

function buildField(grid = {}, evaluator, options = {}) {
  const rows = Math.max(1, Math.round(Number(grid.rows ?? grid.height ?? 1)));
  const columns = Math.max(1, Math.round(Number(grid.columns ?? grid.width ?? 1)));
  return Array.from({ length: rows }, (_row, y) => {
    const v = rows <= 1 ? 0 : y / (rows - 1);
    return Array.from({ length: columns }, (_cell, x) => {
      const u = columns <= 1 ? 0 : x / (columns - 1);
      const value = evaluator(u, v, x, y);
      return options.integer ? Math.round(Number(value) || 0) : round(value);
    });
  });
}

function buildVectorField(grid = {}, evaluator) {
  const rows = Math.max(1, Math.round(Number(grid.rows ?? grid.height ?? 1)));
  const columns = Math.max(1, Math.round(Number(grid.columns ?? grid.width ?? 1)));
  return Array.from({ length: rows }, (_row, y) => {
    const v = rows <= 1 ? 0 : y / (rows - 1);
    return Array.from({ length: columns }, (_cell, x) => {
      const u = columns <= 1 ? 0 : x / (columns - 1);
      const vector = evaluator(u, v, x, y);
      return [round(vector.u), round(vector.v)];
    });
  });
}

function blurField(field = []) {
  return field.map((row, y) => row.map((_value, x) => {
    let sum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const value = Number(field[y + dy]?.[x + dx]);
        if (Number.isFinite(value)) {
          sum += value;
          count += 1;
        }
      }
    }
    return round(count ? sum / count : 0);
  }));
}

function buildDeploymentZones(planning, signedTerrainSurface, seed) {
  const starts = regionalDeploymentStartCells(planning);
  const zoneCells = (centerY) => {
    const cells = [];
    for (let y = Math.max(1, centerY - 2); y <= Math.min(planning.rows - 2, centerY + 2); y += 1) {
      for (let x = 6; x <= Math.min(planning.columns - 2, 11); x += 1) {
        const u = planning.columns <= 1 ? 0 : x / (planning.columns - 1);
        const v = planning.rows <= 1 ? 0 : y / (planning.rows - 1);
        if (x === 8 && y === 8) continue;
        const sample = sampleSignedTerrainSurfaceAtUv(signedTerrainSurface, u, v);
        if (sample.navigable && sample.bottomDepthMeters >= 12) cells.push({ x, y });
      }
    }
    return cells;
  };
  const alpha = zoneCells(starts[0].y);
  const beta = zoneCells(starts[1]?.y ?? Math.floor(planning.rows * 0.64));
  return [
    { id: 'regional_drop_alpha', type: 'deployment', label: 'Regional Drop Zone Alpha', cells: alpha.length ? alpha : starts.slice(0, 3), terrainSourceDigest: signedTerrainSurface.digest, seed },
    { id: 'regional_drop_beta', type: 'deployment', label: 'Regional Drop Zone Beta', cells: beta.length ? beta : starts.slice(3, 6), terrainSourceDigest: signedTerrainSurface.digest, seed }
  ];
}

function regionalDeploymentStartCells(planning) {
  const x0 = Math.min(Math.max(6, Math.round(planning.columns * 0.17)), planning.columns - 3);
  return [
    { x: x0, y: Math.floor(planning.rows * 0.30) },
    { x: x0 + 1, y: Math.floor(planning.rows * 0.62) },
    { x: x0 + 2, y: Math.floor(planning.rows * 0.46) },
    { x: x0, y: Math.floor(planning.rows * 0.74) },
    { x: x0 + 2, y: Math.floor(planning.rows * 0.18) },
    { x: x0 + 3, y: Math.floor(planning.rows * 0.84) }
  ].map((cell) => ({ x: Math.max(1, Math.min(planning.columns - 2, cell.x)), y: Math.max(1, Math.min(planning.rows - 2, cell.y)) }));
}

function buildPriorityTargets(planning, seed) {
  const rng = createSeededRng(`${seed}:priority`);
  return Array.from({ length: 4 }, (_value, index) => {
    const x = Math.round(planning.columns * (0.42 + rng() * 0.46));
    const y = Math.round(planning.rows * (0.18 + rng() * 0.64));
    return {
      id: `regional_star_${index + 1}`,
      label: 'Regional Priority Sample',
      value: 220 + index * 35,
      radius: 0.9,
      frames: [
        { t: index * 8, x, y, active: true },
        { t: index * 8 + 12, x: Math.min(planning.columns - 2, x + 2), y: Math.max(1, y - 1), active: true },
        { t: index * 8 + 16, active: false }
      ]
    };
  });
}

function fieldDigest(value) {
  return `fnv1a-${fnv1aHex(JSON.stringify(value))}`;
}

function fnv1aHex(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

