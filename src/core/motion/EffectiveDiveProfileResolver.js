import { normalizeDiveProfile } from '../science/DiveProfileModel.js';
import {
  normalizeWaterColumnConfig,
  normalizeWaterColumnLayerId,
  normalizeWaterColumnProfileId,
  waterColumnLayerMetadata
} from '../science/WaterColumnSchema.js';
import { isLegacySurfaceOnlyMission } from '../science/WaterColumnMissionDefaults.js';

export const EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION = 'effective-dive-profile-resolver-dive-r1';
export const CANONICAL_MODERN_DIVE_PROFILE_ID = 'sawtoothProfile';

const SURFACE_ONLY = 'surfaceOnly';
const SOURCE_PRIORITY = Object.freeze([
  'segmentOverride',
  'agentPlanDefault',
  'agentDefault',
  'missionWaterColumnDefault',
  'modernGeneratedDefault',
  'legacySurfaceCompatibility'
]);

export function resolveEffectiveDiveProfile(options = {}) {
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig
    ?? options.mission?.waterColumnConfig
    ?? options.mission?.world?.waterColumnConfig
    ?? options.level?.world?.waterColumnConfig
    ?? { depthLayerIds: ['surface'], diveProfileId: SURFACE_ONLY });
  const routeWaypointCount = routeWaypointCountFrom(options);
  const executableSegmentCount = executableSegmentCountFrom(options, routeWaypointCount);
  const routeEmpty = routeWaypointCount === 0 || executableSegmentCount === 0;
  const modern = isModernWaterColumnMission(options, waterColumnConfig);
  const warnings = [];
  const candidates = profileCandidates(options, waterColumnConfig);

  if (routeEmpty) {
    const profile = normalizeDiveProfile(SURFACE_ONLY, waterColumnConfig);
    warnings.push('No executable surface route is present, so the glider remains surface-only.');
    return buildResult({
      profile,
      source: 'noExecutableRoute',
      targetDepthLayerId: 'surface',
      routeWaypointCount,
      executableSegmentCount,
      waterColumnConfig,
      modern,
      warnings,
      compatibilityFallback: !modern
    });
  }

  for (const candidate of candidates) {
    if (!candidate?.id) continue;
    const profileId = normalizeWaterColumnProfileId(candidate.id);
    if (profileId === SURFACE_ONLY && isStaleModernSurfaceDefault(candidate.source, options, waterColumnConfig, modern)) {
      warnings.push(`${candidate.source} surface-only default treated as stale modern water-column metadata.`);
      continue;
    }
    const profile = normalizeDiveProfile(profileId, waterColumnConfig);
    return buildResult({
      profile,
      source: candidate.source,
      targetDepthLayerId: resolveTargetDepthLayerId({ ...options, candidateSource: candidate.source }, waterColumnConfig, profile, modern),
      routeWaypointCount,
      executableSegmentCount,
      waterColumnConfig,
      modern,
      warnings,
      compatibilityFallback: candidate.source === 'legacySurfaceCompatibility'
    });
  }

  const fallbackProfileId = modern ? CANONICAL_MODERN_DIVE_PROFILE_ID : SURFACE_ONLY;
  const profile = normalizeDiveProfile(fallbackProfileId, waterColumnConfig);
  if (modern) warnings.push('Modern water-column mission had no explicit dive profile; applying standard sawtooth default.');
  return buildResult({
    profile,
    source: modern ? 'modernGeneratedDefault' : 'legacySurfaceCompatibility',
    targetDepthLayerId: resolveTargetDepthLayerId(options, waterColumnConfig, profile, modern),
    routeWaypointCount,
    executableSegmentCount,
    waterColumnConfig,
    modern,
    warnings,
    compatibilityFallback: !modern
  });
}

export function effectiveDiveProfileSummary(result = {}) {
  return {
    type: 'anchor.motion.effective-dive-profile-summary',
    version: EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION,
    profileId: result.profileId ?? result.profile?.id ?? null,
    source: result.source ?? null,
    inherited: result.inherited === true,
    routeEmpty: result.routeEmpty === true,
    modernWaterColumnMission: result.modernWaterColumnMission === true,
    compatibilityFallback: result.compatibilityFallback === true,
    targetDepthLayerId: result.targetDepthLayerId ?? null,
    requestedMaximumDepthMeters: result.requestedMaximumDepthMeters ?? null,
    achievableMaximumDepthMeters: result.achievableMaximumDepthMeters ?? null,
    terrainLimited: result.terrainLimited === true,
    routeWaypointCount: result.routeWaypointCount ?? null,
    executableSegmentCount: result.executableSegmentCount ?? null,
    warnings: [...(result.warnings ?? [])]
  };
}

export function validateEffectiveDiveProfileResult(result = {}) {
  const errors = [];
  if (!result.profileId && !result.profile?.id) errors.push('Effective dive profile requires a profileId.');
  if (!SOURCE_PRIORITY.includes(result.source) && result.source !== 'noExecutableRoute') errors.push(`Unsupported effective dive profile source: ${result.source}.`);
  if (!result.targetDepthLayerId) errors.push('Effective dive profile requires a targetDepthLayerId.');
  if (result.routeEmpty === true && result.profileId !== SURFACE_ONLY) errors.push('Empty routes must resolve to surfaceOnly.');
  if (result.usesFull3DPlanning === true) errors.push('Effective dive profile resolver must not enable arbitrary XYZ planning.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : (result.warnings?.length ? 'WARN' : 'PASS'), errors, warnings: result.warnings ?? [], summary: effectiveDiveProfileSummary(result) };
}

function profileCandidates(options, waterColumnConfig) {
  const waypoint = options.targetWaypoint ?? options.waypoint ?? options.segment?.targetWaypoint ?? options.target ?? null;
  const route = options.route ?? null;
  const agentPlan = options.agentPlan ?? route?.agentPlan ?? null;
  const agent = options.agent ?? options.glider ?? null;
  const mission = options.mission ?? null;
  return [
    { source: 'segmentOverride', id: waypoint?.diveProfileId ?? waypoint?.profileId ?? options.segment?.flightProfile?.profileId ?? options.segment?.flightProfile?.diveProfileId ?? options.segment?.flightProfileId ?? options.segment?.diveProfileId ?? route?.selectedDiveProfileId ?? options.diveProfileIdOverride },
    { source: 'agentPlanDefault', id: agentPlan?.diveProfileId ?? route?.diveProfileId ?? options.plan?.diveProfileId },
    { source: 'agentDefault', id: agent?.diveProfileId ?? agent?.defaultDiveProfileId ?? agent?.waterColumn?.defaultDiveProfileId },
    { source: 'missionWaterColumnDefault', id: mission?.rules?.waterColumn?.defaultDiveProfileId ?? mission?.waterColumnConfig?.defaultDiveProfileId ?? mission?.world?.waterColumnConfig?.defaultDiveProfileId ?? options.level?.world?.waterColumnConfig?.defaultDiveProfileId ?? waterColumnConfig.defaultDiveProfileId ?? waterColumnConfig.diveProfileId },
    { source: 'modernGeneratedDefault', id: CANONICAL_MODERN_DIVE_PROFILE_ID },
    { source: 'legacySurfaceCompatibility', id: SURFACE_ONLY }
  ];
}

function resolveTargetDepthLayerId(options, config, profile, modern) {
  const waypoint = options.targetWaypoint ?? options.waypoint ?? options.segment?.targetWaypoint ?? options.target ?? null;
  const route = options.route ?? null;
  const agentPlan = options.agentPlan ?? null;
  const agent = options.agent ?? null;
  const mission = options.mission ?? null;
  const explicit = waypoint?.targetDepthLayerId
    ?? waypoint?.depthLayerId
    ?? waypoint?.depthLayer
    ?? route?.targetDepthLayerId
    ?? options.segment?.flightProfile?.targetDepthLayerId
    ?? options.segment?.targetDepthLayerId
    ?? agentPlan?.targetDepthLayerId
    ?? agentPlan?.depthLayerId
    ?? agent?.targetDepthLayerId;
  if (explicit) return normalizeWaterColumnLayerId(explicit, config.depthLayerIds[0] ?? 'surface');

  const missionDefault = mission?.rules?.waterColumn?.defaultTargetDepthLayerId
    ?? mission?.waterColumnConfig?.defaultTargetDepthLayerId
    ?? mission?.world?.waterColumnConfig?.defaultTargetDepthLayerId
    ?? options.level?.world?.waterColumnConfig?.defaultTargetDepthLayerId
    ?? config.defaultTargetDepthLayerId;
  const normalizedMissionDefault = normalizeWaterColumnLayerId(missionDefault, null);
  if (normalizedMissionDefault && !(modern && normalizedMissionDefault === 'surface' && profile.id !== SURFACE_ONLY)) return normalizedMissionDefault;

  if (profile.id === SURFACE_ONLY) return 'surface';
  const deepestProfileLayer = [...(profile.sequence ?? [])].reverse().find((id) => id && id !== 'surface');
  if (deepestProfileLayer) return normalizeWaterColumnLayerId(deepestProfileLayer, config.depthLayerIds[0] ?? 'surface');
  if (config.depthLayerIds.includes('thermocline')) return 'thermocline';
  return config.depthLayerIds.find((id) => id !== 'surface') ?? config.depthLayerIds[0] ?? 'surface';
}

function buildResult({ profile, source, targetDepthLayerId, routeWaypointCount, executableSegmentCount, waterColumnConfig, modern, warnings = [], compatibilityFallback = false }) {
  const requestedMaximumDepthMeters = requestedDepthMeters(profile, targetDepthLayerId);
  return {
    type: 'anchor.motion.effective-dive-profile',
    version: EFFECTIVE_DIVE_PROFILE_RESOLVER_VERSION,
    profile,
    profileId: profile.id,
    label: profile.label,
    source,
    inherited: source !== 'segmentOverride',
    sourcePriority: SOURCE_PRIORITY.slice(),
    targetDepthLayerId,
    requestedMaximumDepthMeters,
    achievableMaximumDepthMeters: requestedMaximumDepthMeters,
    terrainLimited: false,
    routeWaypointCount,
    executableSegmentCount,
    routeEmpty: routeWaypointCount === 0 || executableSegmentCount === 0,
    modernWaterColumnMission: modern,
    compatibilityFallback,
    explicitSurfaceOnly: profile.id === SURFACE_ONLY && source !== 'legacySurfaceCompatibility',
    usesFull3DPlanning: false,
    usesNewPlanner: false,
    syntheticTeachingModel: true,
    operationallyCalibrated: false,
    warnings,
    digest: `${profile.id}:${source}:${targetDepthLayerId}:${routeWaypointCount ?? 'n'}:${executableSegmentCount ?? 'n'}`
  };
}

function isModernWaterColumnMission(options, config) {
  const raw = options.waterColumnConfig ?? options.mission?.waterColumnConfig ?? options.mission?.world?.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? config;
  if (isLegacySurfaceOnlyMission(raw)) return false;
  if ((config.depthLayerIds ?? []).filter((id) => id !== 'surface').length > 0) return true;
  return raw?.source === 'generatedModernMission'
    || raw?.generatedModernMission === true
    || raw?.compatibility?.modernMissionExpectedVolumetric === true
    || options.mission?.meta?.waterColumnConfigSource === 'generatedModernMission'
    || options.level?.meta?.waterColumnConfigSource === 'generatedModernMission';
}

function isStaleModernSurfaceDefault(source, options, config, modern) {
  if (!modern) return false;
  if (source === 'segmentOverride' || source === 'agentPlanDefault') return false;
  const raw = options.waterColumnConfig ?? options.mission?.waterColumnConfig ?? options.mission?.world?.waterColumnConfig ?? options.level?.world?.waterColumnConfig ?? config;
  return raw?.source === 'generatedModernMission'
    || raw?.generatedModernMission === true
    || raw?.compatibility?.modernMissionExpectedVolumetric === true
    || options.mission?.meta?.waterColumnConfigSource === 'generatedModernMission'
    || options.level?.meta?.waterColumnConfigSource === 'generatedModernMission';
}

function routeWaypointCountFrom(options) {
  if (Number.isFinite(Number(options.routeWaypointCount))) return Math.max(0, Math.round(Number(options.routeWaypointCount)));
  if (Array.isArray(options.route?.points)) return options.route.points.length;
  if (Array.isArray(options.agentPlan?.waypoints)) return options.agentPlan.waypoints.length + 1;
  if (Array.isArray(options.plan?.waypoints)) return options.plan.waypoints.length + 1;
  if (Array.isArray(options.waypoints)) return options.waypoints.length;
  return null;
}

function executableSegmentCountFrom(options, routeWaypointCount) {
  if (Number.isFinite(Number(options.executableSegmentCount))) return Math.max(0, Math.round(Number(options.executableSegmentCount)));
  if (Array.isArray(options.route?.points)) return Math.max(0, options.route.points.length - 1);
  if (Array.isArray(options.agentPlan?.waypoints)) return Math.max(0, options.agentPlan.waypoints.length);
  if (Array.isArray(options.plan?.waypoints)) return Math.max(0, options.plan.waypoints.length);
  if (Number.isFinite(Number(routeWaypointCount))) return Math.max(0, Number(routeWaypointCount) - 1);
  return null;
}

function requestedDepthMeters(profile, targetDepthLayerId) {
  if (profile.id === SURFACE_ONLY) return 0;
  const sequenceDepth = Math.max(0, ...(profile.sequence ?? []).map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0)).filter(Number.isFinite));
  const targetDepth = Number(waterColumnLayerMetadata(targetDepthLayerId).nominalDepthMeters ?? 0);
  return round(Math.max(sequenceDepth, Number.isFinite(targetDepth) ? targetDepth : 0));
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
