import { canonicalJsonDigest, canonicalizeJsonValue } from '../../../packages/codecs/src/index.js';
import { buildDefaultMissionForLevel } from '../editor/LevelEditOperations.js';
import { buildDefaultWaterColumnMissionConfig } from '../science/WaterColumnMissionDefaults.js';
import { validateReferenceEnvironmentLaunch } from './ReferenceEnvironmentLaunchValidator.js';

export const REFERENCE_ENVIRONMENT_PLANNING_LAUNCH_ADAPTER_VERSION = 'reference-environment-planning-launch-adapter-env-compose-r1-1';

export function buildReferenceEnvironmentPlanningLaunch(input = {}) {
  const result = input.referenceEnvironmentResult ?? input;
  const launchValidation = input.launchValidation ?? validateReferenceEnvironmentLaunch(result);
  if (launchValidation.planningLaunchReady !== true) {
    const error = new Error(`Reference environment is not Planning-launch ready: ${launchValidation.errors?.[0] ?? 'unknown validation failure'}`);
    error.validation = launchValidation;
    throw error;
  }

  const currentArtifact = result.currentArtifact ?? result.currentResult?.currentArtifact;
  const scalarArtifact = result.scalarArtifact ?? result.scalarResult?.scalarArtifact;
  if (!currentArtifact || !scalarArtifact) throw new Error('Planning launch requires CurrentField4D and ScalarField4D artifacts.');

  const width = currentArtifact.eastAxisMeters?.length ?? scalarArtifact.xAxis?.length ?? 0;
  const height = currentArtifact.northAxisMeters?.length ?? scalarArtifact.yAxis?.length ?? 0;
  if (!width || !height) throw new Error('Planning launch requires non-empty current/scalar horizontal axes.');

  const eastAxisMeters = currentArtifact.eastAxisMeters ?? scalarArtifact.xAxis ?? axis(width);
  const northAxisMeters = currentArtifact.northAxisMeters ?? scalarArtifact.yAxis ?? axis(height);
  const depthAxisMeters = currentArtifact.depthAxisMeters ?? scalarArtifact.depthAxisMeters ?? [0, 10, 35, 75, 150];
  const timeAxisSeconds = currentArtifact.timeAxisSeconds ?? scalarArtifact.timeAxisSeconds ?? [0, 900, 1800, 2700, 3600, 5400, 7200];
  const frameDtSeconds = estimateDtSeconds(timeAxisSeconds);
  const sourceDurationSeconds = Number(timeAxisSeconds.at(-1) ?? 0);
  const durationSeconds = estimateLaunchDurationSeconds(sourceDurationSeconds);
  const bottomDepthMeters = normalizeGrid(currentArtifact.bottomDepthMeters, width, height, Math.max(...depthAxisMeters, 150));
  const wetMask = normalizeBooleanGrid(currentArtifact.wetMask, width, height, bottomDepthMeters);
  const terrain = wetMask.map((row) => row.map((wet) => wet ? 0 : 1));
  const hazards = hazardGrid(result.hazardCandidates, eastAxisMeters, northAxisMeters, width, height);
  const starts = launchStartCandidates(result.startDropZoneCandidates, eastAxisMeters, northAxisMeters, wetMask);
  const baseCell = starts[0]?.cell ?? firstWetCell(wetMask) ?? { x: 0, y: 0 };
  const zones = starts.map((start, index) => deploymentZone(start, index, width, height, wetMask));
  const targets = scienceTargets(result.hotspotArtifact, eastAxisMeters, northAxisMeters, width, height);
  const truthFrames = buildFrames({ currentArtifact, scalarArtifact, timeAxisSeconds, width, height, source: 'truth' });
  const forecastFrames = buildFrames({ currentArtifact, scalarArtifact, timeAxisSeconds, width, height, source: 'forecast' });
  const cellSizeMeters = estimateCellSizeMeters(eastAxisMeters, northAxisMeters);
  const waterColumnLayerIds = layerIdsForDepthAxis(depthAxisMeters);
  const waterColumnConfig = buildDefaultWaterColumnMissionConfig({
    source: 'referenceEnvironmentStudioLaunch',
    layerIds: waterColumnLayerIds,
    depthLayerIds: waterColumnLayerIds
  });
  const seed = String(input.seed ?? result.provenance?.deterministicSeed ?? result.provenance?.seed ?? 'reference-environment-launch');
  const label = input.label ?? `Reference-derived Monterey Canyon (${result.referenceFixtureId ?? 'reference fixture'})`;
  const levelBase = {
    schemaVersion: '2.0',
    type: 'anchor.level',
    levelId: input.levelId ?? 'reference_environment_monterey_canyon',
    instanceId: `reference-environment-${shortToken(result.environmentArtifactDigest ?? result.digest ?? seed)}`,
    challengeMode: 'forecast',
    meta: {
      name: label,
      description: 'Reference bathymetry patch with deterministic synthetic bathymetry-conditioned currents, science scalar fields, hazards, and launch metadata.',
      seed,
      source: 'referenceEnvironmentStudioLaunch',
      experienceMode: 'simulationLab',
      environmentArtifactDigest: result.environmentArtifactDigest ?? result.environmentArtifact?.artifactDigest ?? null,
      currentArtifactDigest: result.currentArtifactDigest ?? currentArtifact.digest ?? null,
      scalarArtifactDigest: result.scalarArtifactDigest ?? scalarArtifact.digest ?? null,
      referenceFixtureId: result.referenceFixtureId ?? null,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    },
    world: {
      grid: {
        width,
        height,
        cellSizeMeters,
        coordinateFrame: 'localLevelGridMeters',
        eastAxisMeters,
        northAxisMeters
      },
      time: {
        dt: estimateSimulationDtSeconds(frameDtSeconds),
        duration: durationSeconds,
        planningWindow: Math.max(frameDtSeconds, estimateSimulationDtSeconds(frameDtSeconds)),
        sourceFrameDtSeconds: frameDtSeconds,
        sourceDurationSeconds,
        browserLaunchWindowSeconds: durationSeconds,
        displayUnits: 'seconds'
      },
      waterColumnConfig
    },
    layers: {
      truth: { frames: truthFrames },
      forecast: { frames: forecastFrames },
      forecasts: [{ id: 'reference-public-synthetic-forecast', label: 'Public deterministic synthetic forecast', frames: forecastFrames }],
      terrain,
      hazards,
      bases: [{ id: 'base_reference_01', label: 'Validated Reference Start', x: baseCell.x, y: baseCell.y }],
      depthMeters: bottomDepthMeters,
      zones,
      waterColumn: {
        depthCoordinates: depthAxisMeters.slice(),
        timeCoordinates: timeAxisSeconds.slice(),
        sampleValue: scalarArtifact.scalarValue?.[0] ?? [],
        scienceValue: scalarArtifact.scalarValue?.[0] ?? [],
        forecastValue: scalarArtifact.forecastValue?.[0] ?? scalarArtifact.scalarValue?.[0] ?? [],
        uncertainty: scalarArtifact.uncertainty?.[0] ?? null,
        current: {
          u: currentArtifact.uEastMetersPerSecond?.[0] ?? [],
          v: currentArtifact.vNorthMetersPerSecond?.[0] ?? [],
          w: currentArtifact.wDownMetersPerSecond?.[0] ?? []
        },
        currentField4D: cloneJson(currentArtifact),
        scalarField4D: cloneJson(scalarArtifact),
        source: 'package-backed-reference-environment',
        environmentArtifactDigest: result.environmentArtifactDigest ?? result.environmentArtifact?.artifactDigest ?? null,
        currentArtifactDigest: result.currentArtifactDigest ?? currentArtifact.digest ?? null,
        scalarArtifactDigest: result.scalarArtifactDigest ?? scalarArtifact.digest ?? null
      },
      priorityTargets: targets
    },
    zones,
    targets,
    bathymetry: {
      depthMeters: bottomDepthMeters,
      wetMask,
      landMask: wetMask.map((row) => row.map((wet) => !wet)),
      source: 'reference-environment-current-field-bottom-depth'
    },
    currentField4D: cloneJson(currentArtifact),
    scalarField4D: cloneJson(scalarArtifact),
    environmentArtifactSummary: result.environmentArtifactSummary ?? null,
    environmentArtifactDigest: result.environmentArtifactDigest ?? result.environmentArtifact?.artifactDigest ?? null,
    claimBoundary: {
      referenceBathymetryPatch: true,
      deterministicSyntheticBenchmarkFields: true,
      calibratedOceanProduct: false,
      operationalForecast: false,
      certifiedForNavigation: false,
      hiddenTruthExposed: false
    }
  };

  const mission = buildDefaultMissionForLevel(cloneJson(levelBase), {
    missionId: 'reference_environment_monterey_canyon_mission',
    name: 'Reference Environment Planning Mission',
    agentCount: 1,
    deploymentMode: zones.length ? 'chooseFromZones' : 'fixedStart',
    deploymentZoneIds: zones.map((zone) => zone.id),
    battery: 140,
    maxSpeed: 1.2,
    seed
  });
  mission.meta = {
    ...(mission.meta ?? {}),
    name: 'Reference Environment Planning Mission',
    source: 'referenceEnvironmentStudioLaunch',
    experienceMode: 'simulationLab',
    environmentArtifactDigest: levelBase.environmentArtifactDigest,
    referenceFixtureId: result.referenceFixtureId ?? null,
    hiddenTruthExposed: false
  };
  if (mission.agents?.[0]) {
    mission.agents[0].start = { x: baseCell.x, y: baseCell.y };
    mission.agents[0].deployment = {
      ...(mission.agents[0].deployment ?? {}),
      mode: zones.length ? 'chooseFromZones' : 'fixedStart',
      zoneIds: zones.map((zone) => zone.id),
      zoneId: zones[0]?.id ?? null,
      selectedZoneId: zones[0]?.id ?? null,
      selectedStart: { x: baseCell.x, y: baseCell.y }
    };
  }
  mission.waterColumnConfig = cloneJson(waterColumnConfig);
  mission.world ??= {};
  mission.world.waterColumnConfig = cloneJson(waterColumnConfig);
  const launchLevel = cloneJson(levelBase);
  const launchMission = cloneJson(mission);

  const launchMetadata = {
    type: 'anchor.reference-environment.planning-launch',
    version: REFERENCE_ENVIRONMENT_PLANNING_LAUNCH_ADAPTER_VERSION,
    label,
    referenceFixtureId: result.referenceFixtureId ?? null,
    environmentArtifactDigest: levelBase.environmentArtifactDigest,
    currentArtifactDigest: result.currentArtifactDigest ?? currentArtifact.digest ?? null,
    scalarArtifactDigest: result.scalarArtifactDigest ?? scalarArtifact.digest ?? null,
    launchValidationStatus: launchValidation.status,
    launchValidationDigest: launchValidation.launchValidationDigest ?? launchValidation.validationDigest ?? null,
    planningLaunchReady: launchValidation.planningLaunchReady === true,
    warningSummary: launchValidation.warningSummary ?? null,
    warningCount: launchValidation.warningSummary?.totalWarningCount ?? launchValidation.warnings?.length ?? 0,
    blockingWarningCount: launchValidation.warningSummary?.blockingWarningCount ?? 0,
    failureCount: launchValidation.warningSummary?.failureCount ?? launchValidation.failures?.length ?? 0,
    levelDigest: canonicalJsonDigest(canonicalizeJsonValue(launchLevel)),
    missionDigest: canonicalJsonDigest(canonicalizeJsonValue(launchMission)),
    hiddenTruthExposed: false,
    simulationChanged: false,
    scoringChanged: false
  };

  return {
    type: 'anchor.reference-environment.planning-launch-result',
    version: REFERENCE_ENVIRONMENT_PLANNING_LAUNCH_ADAPTER_VERSION,
    level: launchLevel,
    mission: launchMission,
    challengeMode: 'forecast',
    experienceMode: 'simulationLab',
    source: 'referenceEnvironmentStudioLaunch',
    launchMetadata,
    launchValidation,
    warnings: launchValidation.warnings ?? [],
    warningSummary: launchValidation.warningSummary ?? null
  };
}

function buildFrames({ currentArtifact, scalarArtifact, timeAxisSeconds, width, height, source }) {
  return timeAxisSeconds.map((time, index) => {
    const currentIndex = Math.min(index, (currentArtifact.uEastMetersPerSecond?.length ?? 1) - 1);
    const scalarIndex = Math.min(index, (scalarArtifact.scalarValue?.length ?? 1) - 1);
    return {
      t: Number(time),
      source,
      current: Array.from({ length: height }, (_row, y) => (
        Array.from({ length: width }, (_cell, x) => [
          round(currentArtifact.uEastMetersPerSecond?.[currentIndex]?.[0]?.[y]?.[x] ?? 0),
          round(currentArtifact.vNorthMetersPerSecond?.[currentIndex]?.[0]?.[y]?.[x] ?? 0)
        ])
      )),
      roi: Array.from({ length: height }, (_row, y) => (
        Array.from({ length: width }, (_cell, x) => round(scalarArtifact.forecastValue?.[scalarIndex]?.[0]?.[y]?.[x] ?? scalarArtifact.scalarValue?.[scalarIndex]?.[0]?.[y]?.[x] ?? 0))
      ))
    };
  });
}

function hazardGrid(hazardCandidates, eastAxisMeters, northAxisMeters, width, height) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  for (const hazard of hazardCandidates?.candidates ?? []) {
    const point = nearestAxisPoint(eastAxisMeters, northAxisMeters, hazard.eastMeters, hazard.northMeters);
    if (!point) continue;
    grid[point.y][point.x] = Math.max(grid[point.y][point.x], round(hazard.severity ?? 1));
  }
  return grid;
}

function launchStartCandidates(candidates, eastAxisMeters, northAxisMeters, wetMask) {
  return (candidates?.candidates ?? []).map((candidate) => {
    const point = nearestAxisPoint(eastAxisMeters, northAxisMeters, candidate.eastMeters, candidate.northMeters);
    const fallback = firstWetCell(wetMask);
    const cell = point && wetMask[point.y]?.[point.x] ? point : fallback;
    return cell ? { candidate, cell } : null;
  }).filter(Boolean);
}

function deploymentZone(start, index, width, height, wetMask) {
  const cells = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = start.cell.x + dx;
      const y = start.cell.y + dy;
      if (x >= 0 && y >= 0 && x < width && y < height && wetMask[y]?.[x]) cells.push({ x, y });
    }
  }
  return {
    id: `reference_drop_zone_${index + 1}`,
    label: `Reference Drop Zone ${index + 1}`,
    type: 'deployment',
    cells: cells.length ? cells : [start.cell],
    sourceCandidateId: start.candidate.candidateId ?? null,
    validationStatus: 'CURRENT'
  };
}

function scienceTargets(hotspotArtifact, eastAxisMeters, northAxisMeters, width, height) {
  return (hotspotArtifact?.hotspots ?? []).slice(0, 12).map((hotspot, index) => {
    const point = Number.isFinite(Number(hotspot.eastMeters)) && Number.isFinite(Number(hotspot.northMeters))
      ? nearestAxisPoint(eastAxisMeters, northAxisMeters, hotspot.eastMeters, hotspot.northMeters)
      : {
          x: Math.max(0, Math.min(width - 1, Math.round(Number(hotspot.xIndex ?? 0)))),
          y: Math.max(0, Math.min(height - 1, Math.round(Number(hotspot.yIndex ?? 0))))
        };
    return {
      id: hotspot.hotspotId ?? `reference_science_target_${index + 1}`,
      label: hotspot.label ?? `Reference Science Target ${index + 1}`,
      x: point.x,
      y: point.y,
      value: round(hotspot.value ?? hotspot.score ?? hotspot.peakValue ?? 1),
      depthLayerId: hotspot.depthLayerId ?? 'thermocline',
      active: true,
      source: 'reference-environment-hotspot'
    };
  });
}

function nearestAxisPoint(eastAxisMeters, northAxisMeters, eastMeters, northMeters) {
  const x = nearestIndex(eastAxisMeters, Number(eastMeters));
  const y = nearestIndex(northAxisMeters, Number(northMeters));
  if (x < 0 || y < 0) return null;
  return { x, y };
}

function nearestIndex(axisValues, value) {
  if (!Array.isArray(axisValues) || !axisValues.length || !Number.isFinite(value)) return -1;
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < axisValues.length; index += 1) {
    const distance = Math.abs(Number(axisValues[index]) - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

function firstWetCell(wetMask) {
  for (let y = 0; y < wetMask.length; y += 1) {
    for (let x = 0; x < (wetMask[y]?.length ?? 0); x += 1) {
      if (wetMask[y][x]) return { x, y };
    }
  }
  return null;
}

function normalizeGrid(grid, width, height, fallback) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => {
      const value = Number(grid?.[y]?.[x]);
      return Number.isFinite(value) ? value : fallback;
    })
  ));
}

function normalizeBooleanGrid(grid, width, height, bottomDepthMeters) {
  return Array.from({ length: height }, (_row, y) => (
    Array.from({ length: width }, (_cell, x) => Boolean(grid?.[y]?.[x] ?? Number(bottomDepthMeters?.[y]?.[x] ?? 0) > 0))
  ));
}

function estimateCellSizeMeters(eastAxisMeters, northAxisMeters) {
  const dx = axisStep(eastAxisMeters);
  const dy = axisStep(northAxisMeters);
  return round((dx + dy) / 2 || 1);
}

function axisStep(values) {
  if (!Array.isArray(values) || values.length < 2) return 1;
  const steps = [];
  for (let index = 1; index < values.length; index += 1) {
    const step = Math.abs(Number(values[index]) - Number(values[index - 1]));
    if (Number.isFinite(step) && step > 0) steps.push(step);
  }
  return steps.length ? steps.reduce((sum, value) => sum + value, 0) / steps.length : 1;
}

function estimateDtSeconds(timeAxisSeconds) {
  return Math.max(1, Math.round(axisStep(timeAxisSeconds)));
}

function estimateSimulationDtSeconds(frameDtSeconds) {
  const frameDt = Number(frameDtSeconds);
  return Number.isFinite(frameDt) && frameDt > 0 ? Math.min(5, frameDt) : 5;
}

function estimateLaunchDurationSeconds(sourceDurationSeconds) {
  const duration = Number(sourceDurationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) return 300;
  return Math.max(60, Math.min(duration, 300));
}

function layerIdsForDepthAxis(depthAxisMeters) {
  const names = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
  return depthAxisMeters.map((_depth, index) => names[Math.min(index, names.length - 1)]).filter((id, index, all) => all.indexOf(id) === index);
}

function axis(count) {
  return Array.from({ length: count }, (_value, index) => index);
}

function shortToken(value) {
  return String(value ?? 'unknown').replace(/[^a-z0-9]+/gi, '-').slice(-10) || 'unknown';
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function round(value, digits = 6) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;
}
