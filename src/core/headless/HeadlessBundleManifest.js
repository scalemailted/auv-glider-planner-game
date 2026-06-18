import { normalizeHeadlessArtifactType, normalizeHeadlessVisibilityTier } from './HeadlessSchemaContract.js';

export const HEADLESS_BUNDLE_MANIFEST_VERSION = 'headless-bundle-manifest-h0';

export const HEADLESS_BUNDLE_FILE_ROLES = Object.freeze([
  'manifest',
  'missionConfig',
  'fieldPack',
  'visibleFields',
  'hiddenFields',
  'forecastFields',
  'beliefFields',
  'priorityFields',
  'gliderTracks',
  'observations',
  'actions',
  'rewards',
  'surfacingReports',
  'benchmarkRecords',
  'scoreReport',
  'scoreConfig',
  'scoreProfile',
  'missionOutcomeMetrics',
  'missionScore',
  'missionOutcomeReport',
  'regretReport',
  'scienceDiagnostics',
  'adaptiveScienceDiagnosisContext',
  'adaptiveMissionManagerRationale',
  'replay',
  'replayManifest',
  'replayEvents',
  'replayCheckpoints',
  'replayAlignmentReport',
  'notebookConfig'
]);

export function createHeadlessBundleManifest(options = {}) {
  const files = normalizeArray(options.files).map(createHeadlessBundleFileEntry);
  return compactObject({
    type: 'anchor.headless.manifest',
    version: HEADLESS_BUNDLE_MANIFEST_VERSION,
    bundleType: options.bundleType ?? 'colab-schema-preview',
    createdAt: options.createdAt ?? new Date().toISOString(),
    scenarioId: options.scenarioId ?? null,
    missionId: options.missionId ?? null,
    episodeId: options.episodeId ?? null,
    seed: options.seed ?? null,
    runtimeTarget: options.runtimeTarget ?? 'colabNotebook',
    visibilityTier: normalizeHeadlessVisibilityTier(options.visibilityTier ?? 'publicScenario'),
    files,
    arrays: cloneJson(options.arrays ?? []),
    tables: cloneJson(options.tables ?? []),
    json: cloneJson(options.json ?? []),
    schemas: cloneJson(options.schemas ?? []),
    checksums: cloneJson(options.checksums ?? {}),
    notes: normalizeStringList(options.notes)
  });
}

export function createHeadlessBundleFileEntry(options = {}) {
  return compactObject({
    path: options.path ?? 'manifest.json',
    role: normalizeFileRole(options.role ?? 'manifest'),
    mediaType: options.mediaType ?? inferMediaType(options.path),
    schemaType: normalizeHeadlessArtifactType(options.schemaType ?? 'anchor.headless.manifest'),
    visibilityTier: normalizeHeadlessVisibilityTier(options.visibilityTier ?? 'publicScenario'),
    shape: options.shape ?? null,
    dtype: options.dtype ?? null,
    description: options.description ?? null
  });
}

export function validateHeadlessBundleManifest(manifest = {}) {
  const errors = [];
  const warnings = [];
  if (!manifest || typeof manifest !== 'object') errors.push('Headless bundle manifest must be an object.');
  if (manifest?.type !== 'anchor.headless.manifest') errors.push(`Expected type anchor.headless.manifest, got ${manifest?.type ?? 'missing'}.`);
  if (!Array.isArray(manifest?.files)) errors.push('files must be an array.');
  const roles = new Set((manifest?.files ?? []).map((entry) => entry.role));
  if (!roles.has('manifest')) warnings.push('Manifest file role is not listed.');
  for (const role of ['missionConfig', 'visibleFields', 'observations', 'benchmarkRecords']) {
    if (!roles.has(role)) warnings.push(`Recommended Colab role missing: ${role}.`);
  }
  for (const entry of manifest?.files ?? []) {
    if (entry.role === 'hiddenFields' && !['hiddenTruth', 'oracle', 'debugAll'].includes(entry.visibilityTier)) errors.push('hiddenFields entries must use hiddenTruth, oracle, or debugAll visibility.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function headlessBundleManifestSummary(manifestInput = {}) {
  const manifest = createHeadlessBundleManifest(manifestInput);
  const validation = validateHeadlessBundleManifest(manifest);
  const roles = [...new Set(manifest.files.map((entry) => entry.role))];
  return {
    bundleType: manifest.bundleType,
    runtimeTarget: manifest.runtimeTarget,
    visibilityTier: manifest.visibilityTier,
    fileCount: manifest.files.length,
    roles,
    hiddenFileCount: manifest.files.filter((entry) => entry.visibilityTier === 'hiddenTruth' || entry.role === 'hiddenFields').length,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function normalizeFileRole(role) { return HEADLESS_BUNDLE_FILE_ROLES.includes(role) ? role : 'fieldPack'; }
function inferMediaType(path = '') { return String(path).endsWith('.csv') ? 'text/csv' : String(path).endsWith('.json') ? 'application/json' : 'application/octet-stream'; }
function normalizeArray(values = []) { return Array.isArray(values) ? values : values ? [values] : []; }
function normalizeStringList(values = []) { return normalizeArray(values).map((value) => String(value)).filter(Boolean); }
function cloneJson(value) { if (value === undefined || value === null) return value ?? null; try { return JSON.parse(JSON.stringify(value)); } catch { return value; } }
function compactObject(value = {}) { return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined)); }


