import { parseSimpleCsv, normalizeObservationCsvRows, normalizeTrackCsvRows } from './HeadlessCsv.js';
import { HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE, isHeadlessRoundtripReportType } from './HeadlessRoundtripTypes.js';

export const HEADLESS_BUNDLE_LOADER_VERSION = 'headless-bundle-loader-h2';
export const HEADLESS_BUNDLE_REQUIRED_FILES = Object.freeze(['manifest.json', 'mission_config.json', 'visible_fields.json', 'score_report.json']);
export const HEADLESS_BUNDLE_OPTIONAL_FILES = Object.freeze(['hidden_fields.json', 'observations.json', 'observations.csv', 'glider_tracks.json', 'glider_tracks.csv', 'replay.json', 'episode.json', 'bundle.json', 'roundtrip_report.json', 'science_diagnostics.json', 'water_column_summary.json', 'depth_layer_priority.json']);

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
  'episode.json': 'episode',
  'bundle.json': 'combinedBundle',
  'roundtrip_report.json': 'roundtripReport',
  'science_diagnostics.json': 'scienceDiagnostics',
  'water_column_summary.json': 'waterColumnSummary',
  'depth_layer_priority.json': 'depthLayerPriority'
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
    normalized.manifest ??= combined.manifest;
    normalized.missionConfig ??= combined.missionConfig;
    normalized.visibleFields ??= combined.visibleFields;
    normalized.hiddenFields ??= combined.hiddenFields;
    normalized.observations ??= combined.observations;
    normalized.gliderTracks ??= combined.gliderTracks;
    normalized.scoreReport ??= combined.scoreReport;
    normalized.replay ??= combined.replay;
    normalized.episode ??= combined.episode;
    normalized.roundtripReport ??= combined.roundtripReport;
    normalized.scienceDiagnostics ??= combined.scienceDiagnostics ?? combined.episode?.scienceDiagnostics;
    normalized.waterColumnSummary ??= combined.waterColumnSummary ?? combined.episode?.waterColumnSummary;
    normalized.depthLayerPriority ??= combined.depthLayerPriority ?? combined.episode?.depthLayerPriority;
    normalized.depthLayerPrioritySummary ??= combined.depthLayerPrioritySummary ?? combined.episode?.depthLayerPrioritySummary;
  }
  if (normalized.observationsCsv?.rows?.length) normalized.observations ??= { type: 'anchor.headless.observations', observations: normalized.observationsCsv.rows, source: 'csv' };
  if (normalized.gliderTracksCsv?.rows?.length) normalized.gliderTracks ??= { type: 'anchor.headless.trajectory', tracks: normalized.gliderTracksCsv.rows, source: 'csv' };
  return { ...normalized, fileMap, warnings };
}

export function validateHeadlessBundleFiles(bundleFiles) {
  const normalized = bundleFiles?.fileMap ? bundleFiles : normalizeHeadlessBundleFiles(bundleFiles);
  const warnings = [...(normalized.warnings ?? [])];
  const failures = [];
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
    roundtripReport: normalized.roundtripReport ?? null,
    scienceDiagnostics: normalized.scienceDiagnostics ?? normalized.episode?.scienceDiagnostics ?? null,
    waterColumnSummary: normalized.waterColumnSummary ?? normalized.episode?.waterColumnSummary ?? null,
    depthLayerPriority: normalized.depthLayerPriority ?? normalized.episode?.depthLayerPriority ?? null,
    depthLayerPrioritySummary: normalized.depthLayerPrioritySummary ?? normalized.depthLayerPriority?.summary ?? normalized.episode?.depthLayerPrioritySummary ?? null,
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
    hasScienceDiagnostics: Boolean(bundle?.scienceDiagnostics),
    hasWaterColumnSummary: Boolean(bundle?.waterColumnSummary),
    hasDepthLayerPriority: Boolean(bundle?.depthLayerPriority ?? bundle?.depthLayerPrioritySummary),
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
  if (type === 'anchor.headless.manifest') return 'manifest';
  if (type === 'anchor.headless.mission-config') return 'missionConfig';
  if (type === 'anchor.headless.score-report') return 'scoreReport';
  if (/manifest/i.test(fileName)) return 'manifest';
  return null;
}

function basename(fileName) {
  return String(fileName ?? '').split(/[\\/]/).pop();
}

