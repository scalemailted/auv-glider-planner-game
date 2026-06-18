import { parseSimpleCsv, normalizeObservationCsvRows, normalizeTrackCsvRows } from './HeadlessCsv.js';
import { HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE, isHeadlessRoundtripReportType } from './HeadlessRoundtripTypes.js';

export const HEADLESS_BUNDLE_LOADER_VERSION = 'headless-bundle-loader-h2';
export const HEADLESS_BUNDLE_REQUIRED_FILES = Object.freeze(['manifest.json', 'mission_config.json', 'visible_fields.json', 'score_report.json']);
export const HEADLESS_BUNDLE_OPTIONAL_FILES = Object.freeze(['hidden_fields.json', 'observations.json', 'observations.csv', 'glider_tracks.json', 'glider_tracks.csv', 'replay.json', 'replay_manifest.json', 'replay_events.json', 'replay_checkpoints.json', 'replay_alignment_report.json', 'episode.json', 'bundle.json', 'roundtrip_report.json', 'science_diagnostics.json', 'water_column_summary.json', 'depth_layer_priority.json', 'motion_trajectory.json', 'control_trace.json', 'motion_diagnostics.json', 'mission_feasibility_report.json', 'motion_cost_graph.json', 'motion_cost_matrix.json', 'score_profile.json', 'mission_outcome_metrics.json', 'mission_score.json', 'mission_outcome_report.json', 'regret_report.json', 'bathymetry_summary.json', 'mission_geometry_summary.json']);

const LOGICAL_FILE_ALIASES = Object.freeze({
  'manifest.json': 'manifest',
  'mission_config.json': 'missionConfig',
  'visible_fields.json': 'visibleFields',
  'hidden_fields.json': 'hiddenFields',
  'observations.json': 'observations',
  'observations.csv': 'observationsCsv',
  'glider_tracks.json': 'gliderTracks',
  'glider_tracks.csv': 'gliderTracksCsv',
  'score_report.json': 'scoreReport',
  'replay.json': 'replay',
  'replay_manifest.json': 'replayManifest',
  'replay_events.json': 'replayEvents',
  'replay_checkpoints.json': 'replayCheckpoints',
  'replay_alignment_report.json': 'replayAlignmentReport',
  'episode.json': 'episode',
  'bundle.json': 'combinedBundle',
  'roundtrip_report.json': 'roundtripReport',
  'science_diagnostics.json': 'scienceDiagnostics',
  'water_column_summary.json': 'waterColumnSummary',
  'depth_layer_priority.json': 'depthLayerPriority',
  'motion_trajectory.json': 'motionTrajectory',
  'control_trace.json': 'controlTrace',
  'motion_diagnostics.json': 'motionDiagnostics',
  'mission_feasibility_report.json': 'missionFeasibilityReport',
  'motion_cost_graph.json': 'motionCostGraph',
  'motion_cost_matrix.json': 'motionCostMatrix',
  'score_profile.json': 'scoreProfileSummary',
  'mission_outcome_metrics.json': 'missionOutcomeMetrics',
  'mission_score.json': 'missionScore',
  'mission_outcome_report.json': 'missionOutcomeReport',
  'regret_report.json': 'regretReport',
  'bathymetry_summary.json': 'bathymetrySummary',
  'mission_geometry_summary.json': 'missionGeometrySummary'
});

export function classifyHeadlessBundleFile(fileName, payload = null) {
  const base = basename(fileName);
  const logicalType = LOGICAL_FILE_ALIASES[base] ?? inferLogicalType(base, payload);
  return {
    fileName: base,
    logicalType,
    known: Boolean(logicalType),
    mediaType: base.endsWith('.csv') ? 'text/csv' : base.endsWith('.json') ? 'application/json' : 'application/octet-stream'
  };
}

export function parseHeadlessBundleFile(fileName, textOrJson) {
  const classification = classifyHeadlessBundleFile(fileName, textOrJson);
  const warnings = [];
  const failures = [];
  let payload = textOrJson;
  if (classification.mediaType === 'application/json' && typeof textOrJson === 'string') {
    try { payload = JSON.parse(textOrJson); } catch (error) { throw new Error(`${classification.fileName} is not valid JSON: ${error.message}`); }
  }
  if (classification.fileName === 'observations.csv') {
    const parsed = parseSimpleCsv(String(textOrJson ?? ''));
    warnings.push(...parsed.warnings.map((warning) => `observations.csv: ${warning}`));
    payload = { type: 'anchor.headless.observations', rows: normalizeObservationCsvRows(parsed.rows), columns: parsed.columns, source: 'csv' };
  }
  if (classification.fileName === 'glider_tracks.csv') {
    const parsed = parseSimpleCsv(String(textOrJson ?? ''));
    warnings.push(...parsed.warnings.map((warning) => `glider_tracks.csv: ${warning}`));
    payload = { type: 'anchor.headless.trajectory', rows: normalizeTrackCsvRows(parsed.rows), columns: parsed.columns, source: 'csv' };
  }
  return { ...classification, payload, warnings };
}

export function normalizeHeadlessBundleFiles(files = []) {
  const entries = Array.isArray(files) ? files : Object.entries(files).map(([fileName, payload]) => ({ fileName, payload }));
  const normalized = {};
  const fileMap = {};
  const warnings = [];
  const failures = [];
  for (const entry of entries) {
    const fileName = entry.fileName ?? entry.name ?? entry.path;
    const source = entry.text ?? entry.payload ?? entry.json ?? entry.content;
    if (!fileName) {
      warnings.push('A selected bundle file did not include a file name.');
      continue;
    }
    const parsed = parseHeadlessBundleFile(fileName, source);
    warnings.push(...parsed.warnings);
    fileMap[parsed.fileName] = parsed;
    if (parsed.logicalType) normalized[parsed.logicalType] = parsed.payload;
    else warnings.push(`Unknown file ${parsed.fileName} was kept as an extra file.`);
  }
  if (isHeadlessCombinedBundlePayload(normalized.combinedBundle)) {
    const combined = normalized.combinedBundle;
    const replayPairs = [
      ['replayManifest', combined.replayManifest ?? combined.replayContract?.manifest ?? combined.replay?.manifest],
      ['replayEvents', combined.replayEvents ?? combined.replayContract?.events ?? combined.replay?.events],
      ['replayCheckpoints', combined.replayCheckpoints ?? combined.replayContract?.checkpoints ?? combined.replay?.checkpoints],
      ['replayAlignmentReport', combined.replayAlignmentReport ?? combined.replayContract?.alignmentReport ?? combined.replay?.alignmentReport]
    ];
    for (const [logicalType, combinedValue] of replayPairs) {
      if (normalized[logicalType] && combinedValue && stableStringify(normalized[logicalType]) !== stableStringify(combinedValue)) {
        failures.push(`REPLAY_COMBINED_SEPARATE_MISMATCH: ${logicalType} differs between bundle.json and separately loaded replay file.`);
      }
    }
    normalized.manifest ??= combined.manifest;
    normalized.missionConfig ??= combined.missionConfig;
    normalized.visibleFields ??= combined.visibleFields;
    normalized.hiddenFields ??= combined.hiddenFields;
    normalized.observations ??= combined.observations;
    normalized.gliderTracks ??= combined.gliderTracks;
    normalized.scoreReport ??= combined.scoreReport;
    normalized.replay ??= combined.replay;
    normalized.replayManifest ??= combined.replayManifest ?? combined.replayContract?.manifest ?? combined.replay?.manifest;
    normalized.replayEvents ??= combined.replayEvents ?? combined.replayContract?.events ?? combined.replay?.events;
    normalized.replayCheckpoints ??= combined.replayCheckpoints ?? combined.replayContract?.checkpoints ?? combined.replay?.checkpoints;
    normalized.replayAlignmentReport ??= combined.replayAlignmentReport ?? combined.replayContract?.alignmentReport ?? combined.replay?.alignmentReport;
    normalized.episode ??= combined.episode;
    normalized.roundtripReport ??= combined.roundtripReport;
    normalized.scienceDiagnostics ??= combined.scienceDiagnostics ?? combined.episode?.scienceDiagnostics;
    normalized.waterColumnSummary ??= combined.waterColumnSummary ?? combined.episode?.waterColumnSummary;
    normalized.depthLayerPriority ??= combined.depthLayerPriority ?? combined.episode?.depthLayerPriority;
    normalized.depthLayerPrioritySummary ??= combined.depthLayerPrioritySummary ?? combined.episode?.depthLayerPrioritySummary;
    normalized.motionTrajectory ??= combined.motionTrajectory ?? combined.episode?.motionTrajectory;
    normalized.controlTrace ??= combined.controlTrace ?? combined.episode?.controlTrace ?? combined.episode?.motionTrajectory?.controlCommands;
    normalized.motionDiagnostics ??= combined.motionDiagnostics ?? combined.episode?.motionDiagnostics ?? combined.episode?.motionTrajectory?.motionDiagnostics;
    normalized.missionFeasibilityReport ??= combined.missionFeasibilityReport ?? combined.episode?.missionFeasibilityReport;
    normalized.missionFeasibilitySummary ??= combined.missionFeasibilitySummary ?? combined.episode?.missionFeasibilitySummary ?? combined.episode?.diagnostics?.missionFeasibilitySummary;
    normalized.motionCostGraph ??= combined.motionCostGraph ?? combined.episode?.motionCostGraph;
    normalized.motionCostMatrix ??= combined.motionCostMatrix ?? combined.episode?.motionCostMatrix;
    normalized.motionCostGraphSummary ??= combined.motionCostGraphSummary ?? combined.episode?.motionCostGraphSummary ?? combined.episode?.diagnostics?.motionCostGraphSummary;
    normalized.motionCostMatrixSummary ??= combined.motionCostMatrixSummary ?? combined.episode?.motionCostMatrixSummary ?? combined.episode?.diagnostics?.motionCostMatrixSummary;
    normalized.scoreProfileSummary ??= combined.scoreProfileSummary ?? combined.scoreProfile ?? combined.episode?.scoreProfileSummary;
    normalized.missionOutcomeMetrics ??= combined.missionOutcomeMetrics ?? combined.episode?.missionOutcomeMetrics;
    normalized.missionScore ??= combined.missionScore ?? combined.episode?.missionScore;
    normalized.missionOutcomeReport ??= combined.missionOutcomeReport ?? combined.episode?.missionOutcomeReport ?? combined.roundtripReport?.missionOutcomeReport;
    normalized.regretReport ??= combined.regretReport ?? combined.episode?.regretReport ?? combined.roundtripReport?.regretReport;
    normalized.bathymetrySummary ??= combined.bathymetrySummary ?? combined.episode?.bathymetrySummary ?? combined.visibleFields?.bathymetrySummary;
    normalized.missionGeometrySummary ??= combined.missionGeometrySummary ?? combined.episode?.missionGeometrySummary;
  }
  if (normalized.observationsCsv?.rows?.length) normalized.observations ??= { type: 'anchor.headless.observations', observations: normalized.observationsCsv.rows, source: 'csv' };
  if (normalized.gliderTracksCsv?.rows?.length) normalized.gliderTracks ??= { type: 'anchor.headless.trajectory', tracks: normalized.gliderTracksCsv.rows, source: 'csv' };
  return { ...normalized, fileMap, warnings, failures };
}

export function validateHeadlessBundleFiles(bundleFiles) {
  const normalized = bundleFiles?.fileMap ? bundleFiles : normalizeHeadlessBundleFiles(bundleFiles);
  const warnings = [...(normalized.warnings ?? [])];
  const failures = [...(normalized.failures ?? [])];
  for (const file of HEADLESS_BUNDLE_REQUIRED_FILES) {
    const logical = LOGICAL_FILE_ALIASES[file];
    if (!normalized[logical]) failures.push(`Missing required bundle file ${file}.`);
  }
  if (!normalized.observations && !normalized.observationsCsv) failures.push('Missing required bundle data observations.json or observations.csv.');
  if (!normalized.gliderTracks && !normalized.gliderTracksCsv) failures.push('Missing required bundle data glider_tracks.json or glider_tracks.csv.');
  if (!normalized.hiddenFields && manifestRequiresHiddenFields(normalized.manifest)) failures.push('Manifest lists hidden_fields.json but hidden fields are missing.');
  if (!normalized.hiddenFields && !manifestDisablesHiddenExport(normalized.manifest)) warnings.push('hidden_fields.json missing without an explicit hidden-export-disabled note.');
  for (const [fileName, parsed] of Object.entries(normalized.fileMap ?? {})) {
    if (!parsed.known && !HEADLESS_BUNDLE_OPTIONAL_FILES.includes(fileName)) warnings.push(`Unknown extra bundle file: ${fileName}.`);
  }
  return { status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', warnings, failures };
}

export function buildHeadlessBundleFromFiles(bundleFiles) {
  const normalized = bundleFiles?.fileMap ? bundleFiles : normalizeHeadlessBundleFiles(bundleFiles);
  const fileValidation = validateHeadlessBundleFiles(normalized);
  return {
    type: isHeadlessCombinedBundlePayload(normalized.combinedBundle) ? normalized.combinedBundle.type : 'anchor.headless.bundle',
    version: HEADLESS_BUNDLE_LOADER_VERSION,
    manifest: normalized.manifest ?? null,
    missionConfig: normalized.missionConfig ?? null,
    visibleFields: normalized.visibleFields ?? null,
    hiddenFields: normalized.hiddenFields ?? null,
    observations: normalizeObservationsPayload(normalized.observations),
    gliderTracks: normalizeTracksPayload(normalized.gliderTracks),
    scoreReport: normalized.scoreReport ?? null,
    replay: normalized.replay ?? null,
    replayManifest: normalized.replayManifest ?? null,
    replayEvents: normalized.replayEvents ?? null,
    replayCheckpoints: normalized.replayCheckpoints ?? null,
    replayAlignmentReport: normalized.replayAlignmentReport ?? null,
    roundtripReport: normalized.roundtripReport ?? null,
    scienceDiagnostics: normalized.scienceDiagnostics ?? normalized.episode?.scienceDiagnostics ?? null,
    waterColumnSummary: normalized.waterColumnSummary ?? normalized.episode?.waterColumnSummary ?? null,
    depthLayerPriority: normalized.depthLayerPriority ?? normalized.episode?.depthLayerPriority ?? null,
    depthLayerPrioritySummary: normalized.depthLayerPrioritySummary ?? normalized.depthLayerPriority?.summary ?? normalized.episode?.depthLayerPrioritySummary ?? null,
    motionTrajectory: normalized.motionTrajectory ?? normalized.episode?.motionTrajectory ?? null,
    controlTrace: normalizeControlTracePayload(normalized.controlTrace ?? normalized.episode?.controlTrace ?? normalized.episode?.motionTrajectory?.controlCommands),
    motionDiagnostics: normalized.motionDiagnostics ?? normalized.episode?.motionDiagnostics ?? normalized.episode?.motionTrajectory?.motionDiagnostics ?? null,
    missionFeasibilityReport: normalized.missionFeasibilityReport ?? normalized.episode?.missionFeasibilityReport ?? null,
    missionFeasibilitySummary: normalized.missionFeasibilitySummary ?? normalized.episode?.missionFeasibilitySummary ?? normalized.episode?.diagnostics?.missionFeasibilitySummary ?? null,
    motionCostGraph: normalized.motionCostGraph ?? normalized.episode?.motionCostGraph ?? null,
    motionCostMatrix: normalized.motionCostMatrix ?? normalized.episode?.motionCostMatrix ?? null,
    motionCostGraphSummary: normalized.motionCostGraphSummary ?? normalized.motionCostGraph?.summary ?? normalized.episode?.motionCostGraphSummary ?? normalized.episode?.diagnostics?.motionCostGraphSummary ?? null,
    motionCostMatrixSummary: normalized.motionCostMatrixSummary ?? normalized.motionCostMatrix?.summary ?? normalized.episode?.motionCostMatrixSummary ?? normalized.episode?.diagnostics?.motionCostMatrixSummary ?? null,
    scoreProfileSummary: normalized.scoreProfileSummary ?? normalized.episode?.scoreProfileSummary ?? null,
    missionOutcomeMetrics: normalized.missionOutcomeMetrics ?? normalized.episode?.missionOutcomeMetrics ?? null,
    missionScore: normalized.missionScore ?? normalized.episode?.missionScore ?? null,
    missionOutcomeReport: normalized.missionOutcomeReport ?? normalized.episode?.missionOutcomeReport ?? normalized.roundtripReport?.missionOutcomeReport ?? null,
    regretReport: normalized.regretReport ?? normalized.episode?.regretReport ?? normalized.roundtripReport?.regretReport ?? null,
    bathymetrySummary: normalized.bathymetrySummary ?? normalized.episode?.bathymetrySummary ?? normalized.visibleFields?.bathymetrySummary ?? null,
    missionGeometrySummary: normalized.missionGeometrySummary ?? normalized.episode?.missionGeometrySummary ?? null,
    episode: normalized.episode ?? null,
    files: Object.keys(normalized.fileMap ?? {}).sort(),
    warnings: [...(normalized.warnings ?? []), ...fileValidation.warnings],
    failures: fileValidation.failures,
    source: 'browser-headless-bundle-loader'
  };
}

export function headlessBundleLoadSummary(bundle) {
  return {
    type: bundle?.type ?? null,
    version: bundle?.version ?? null,
    scenarioId: bundle?.manifest?.scenarioId ?? bundle?.missionConfig?.scenarioId ?? bundle?.visibleFields?.scenario ?? null,
    missionId: bundle?.manifest?.missionId ?? bundle?.missionConfig?.missionId ?? null,
    episodeId: bundle?.manifest?.episodeId ?? bundle?.episode?.episodeId ?? null,
    seed: bundle?.manifest?.seed ?? bundle?.missionConfig?.seed ?? bundle?.episode?.seed ?? null,
    fileCount: bundle?.files?.length ?? 0,
    hasHiddenFields: Boolean(bundle?.hiddenFields),
    observationCount: bundle?.observations?.length ?? 0,
    trackPointCount: bundle?.gliderTracks?.length ?? 0,
    finalScore: bundle?.scoreReport?.finalScore ?? bundle?.scoreReport?.final_score ?? null,
    hasRoundtripReport: Boolean(bundle?.roundtripReport),
    hasReplayManifest: Boolean(bundle?.replayManifest),
    hasReplayEvents: Boolean(bundle?.replayEvents),
    hasReplayCheckpoints: Boolean(bundle?.replayCheckpoints),
    hasReplayAlignmentReport: Boolean(bundle?.replayAlignmentReport),
    hasScienceDiagnostics: Boolean(bundle?.scienceDiagnostics),
    hasWaterColumnSummary: Boolean(bundle?.waterColumnSummary),
    hasDepthLayerPriority: Boolean(bundle?.depthLayerPriority ?? bundle?.depthLayerPrioritySummary),
    hasBathymetrySummary: Boolean(bundle?.bathymetrySummary),
    hasMissionGeometrySummary: Boolean(bundle?.missionGeometrySummary),
    hasMotionTrajectory: Boolean(bundle?.motionTrajectory),
    hasMissionFeasibilityReport: Boolean(bundle?.missionFeasibilityReport),
    hasMotionCostGraph: Boolean(bundle?.motionCostGraph ?? bundle?.motionCostGraphSummary),
    hasMotionCostMatrix: Boolean(bundle?.motionCostMatrix ?? bundle?.motionCostMatrixSummary),
    hasMissionOutcomeReport: Boolean(bundle?.missionOutcomeReport),
    hasMissionScore: Boolean(bundle?.missionScore),
    hasRegretReport: Boolean(bundle?.regretReport),
    roundtripStatus: bundle?.roundtripReport?.summary?.status ?? null,
    warnings: bundle?.warnings ?? [],
    failures: bundle?.failures ?? []
  };
}

export function manifestDisablesHiddenExport(manifest = {}) {
  const notes = (manifest?.notes ?? []).join(' ');
  return /hidden truth export disabled|hidden export disabled|hidden_fields\.json omitted/i.test(notes);
}

export function manifestRequiresHiddenFields(manifest = {}) {
  return (manifest?.files ?? []).some((entry) => entry?.path === 'hidden_fields.json' || entry?.role === 'hiddenFields');
}

function normalizeObservationsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.observations)) return payload.observations;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function normalizeControlTracePayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.controls)) return payload.controls;
  if (Array.isArray(payload?.controlCommands)) return payload.controlCommands;
  return [];
}

function normalizeTracksPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tracks)) return payload.tracks;
  if (Array.isArray(payload?.gliderTracks)) return payload.gliderTracks;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function isHeadlessCombinedBundlePayload(payload) {
  return payload?.type === 'anchor.headless.bundle' || payload?.type === HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE;
}

function inferLogicalType(fileName, payload) {
  const type = typeof payload === 'object' ? payload?.type : null;
  if (type === 'anchor.headless.bundle' || type === HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE) return 'combinedBundle';
  if (isHeadlessRoundtripReportType(type)) return 'roundtripReport';
  if (type === 'anchor.headless.science-diagnostics') return 'scienceDiagnostics';
  if (type === 'anchor.headless.water-column-summary') return 'waterColumnSummary';
  if (type === 'anchor.headless.depth-layer-priority') return 'depthLayerPriority';
  if (type === 'anchor.motion.trajectory') return 'motionTrajectory';
  if (type === 'anchor.motion.control-trace') return 'controlTrace';
  if (type === 'anchor.motion.diagnostics') return 'motionDiagnostics';
  if (type === 'anchor.benchmark.mission-feasibility-report') return 'missionFeasibilityReport';
  if (type === 'anchor.benchmark.feasibility-cost-graph') return 'motionCostGraph';
  if (type === 'anchor.headless.motion-cost-matrix') return 'motionCostMatrix';
  if (type === 'anchor.benchmark.score-profile') return 'scoreProfileSummary';
  if (type === 'anchor.benchmark.mission-outcome-metrics') return 'missionOutcomeMetrics';
  if (type === 'anchor.benchmark.mission-score') return 'missionScore';
  if (type === 'anchor.benchmark.mission-outcome-report') return 'missionOutcomeReport';
  if (type === 'anchor.benchmark.regret-report') return 'regretReport';
  if (type === 'anchor.headless.bathymetry-summary') return 'bathymetrySummary';
  if (type === 'anchor.headless.mission-geometry-summary' || type === 'anchor.science.ocean-world-geometry-summary') return 'missionGeometrySummary';
  if (type === 'anchor.headless.manifest') return 'manifest';
  if (type === 'anchor.headless.mission-config') return 'missionConfig';
  if (type === 'anchor.headless.score-report') return 'scoreReport';
  if (type === 'anchor.headless.replay-manifest') return 'replayManifest';
  if (type === 'anchor.headless.replay-events') return 'replayEvents';
  if (type === 'anchor.headless.replay-checkpoints') return 'replayCheckpoints';
  if (type === 'anchor.headless.replay-alignment-report') return 'replayAlignmentReport';
  if (/replay.*manifest/i.test(fileName)) return 'replayManifest';
  if (/replay.*events/i.test(fileName)) return 'replayEvents';
  if (/replay.*checkpoints/i.test(fileName)) return 'replayCheckpoints';
  if (/replay.*alignment/i.test(fileName)) return 'replayAlignmentReport';
  if (/manifest/i.test(fileName)) return 'manifest';
  return null;
}

function stableStringify(value) {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function basename(fileName) {
  return String(fileName ?? '').split(/[\\/]/).pop();
}









