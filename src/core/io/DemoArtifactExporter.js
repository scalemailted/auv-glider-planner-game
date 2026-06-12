export const DEMO_ARTIFACT_SCHEMA_VERSION = '1.1';
export const DEMO_ARTIFACT_EXPORT_VERSION = 'demo-export-v1';
export const DEMO_ARTIFACT_MAX_FRAMES = 240;

export function buildDemoArtifactEnvelope({
  type,
  legacyType = null,
  demo,
  demoName = null,
  legacyDemoName = null,
  grid,
  time,
  config = {},
  patternMode = null,
  processMode = null,
  statusLabel = null,
  validationStatus = null,
  processRuleCatalogVersion = null,
  canonicalRuleIds = null,
  ruleAliases = null,
  paintStartMode = null,
  paintSettings = null,
  groupDefinitions = null,
  ruleAllocation = null,
  fields = {},
  likelihoodField = null,
  graphField = null,
  clusters = null,
  viewFilters = null,
  frames = null,
  timeSampling = null,
  selectedCell = null,
  metadata = {},
  behaviorPreset = null,
  patternSource = null,
  referenceSignature = null,
  referenceSignatureId = null,
  referenceSignatureLabel = null,
  referenceSignatureAliases = null,
  referenceSignatureCategory = null,
  referenceSignatureModified = null,
  referenceSignatureMetadata = null,
  referenceModels = null,
  referenceCoverageTags = null,
  referenceCatalogVersion = null,
  caTaxonomy = null,
  expectedObservableSignature = null,
  qaExpectations = null,
  phenotypeMetrics = null,
  genotypeNotes = null,
  taxonomyJustification = null,
  componentRecipe = null,
  legacyPresetId = null,
  legacyPresetMappedReferenceSignature = null,
  fairness = null,
  coupling = null
} = {}) {
  return sanitizeJson({
    schemaVersion: DEMO_ARTIFACT_SCHEMA_VERSION,
    type,
    legacyType,
    demoName: demoName ?? demo,
    legacyDemoName,
    generatedAt: new Date().toISOString(),
    source: {
      app: 'ANCHOR',
      demo,
      version: DEMO_ARTIFACT_EXPORT_VERSION
    },
    grid: {
      width: Number(grid?.width ?? 0),
      height: Number(grid?.height ?? 0),
      coordinateConvention: 'cell-center',
      origin: 'top-left',
      rowMajor: true,
      xAxis: 'columns',
      yAxis: 'rows',
      cellIndexing: {
        row: 'y',
        col: 'x'
      },
      timeUnits: 'seconds'
    },
    time: {
      demoTimeSeconds: roundNumber(time?.demoTimeSeconds ?? 0),
      fieldTimeSeconds: time?.fieldTimeSeconds == null ? null : roundNumber(time.fieldTimeSeconds),
      playbackDirection: time?.playbackDirection === -1 || time?.playbackDirection === 'reverse' ? 'reverse' : 'forward',
      playbackSpeed: roundNumber(time?.playbackSpeed ?? 1)
    },
    timeSampling: timeSampling ?? {
      kind: 'singleFrame',
      timeSeconds: roundNumber(time?.fieldTimeSeconds ?? time?.demoTimeSeconds ?? 0)
    },
    config,
    patternMode,
    processMode,
    statusLabel,
    validationStatus,
    processRuleCatalogVersion,
    canonicalRuleIds,
    ruleAliases,
    paintStartMode,
    paintSettings,
    groupDefinitions,
    ruleAllocation,
    fields,
    likelihoodField,
    graphField,
    clusters,
    viewFilters,
    frames,
    selectedCell,
    behaviorPreset,
    patternSource,
    referenceSignature,
    referenceSignatureId,
    referenceSignatureLabel,
    referenceSignatureAliases,
    referenceSignatureCategory,
    referenceSignatureModified,
    referenceSignatureMetadata,
    referenceModels,
    referenceCoverageTags,
    referenceCatalogVersion,
    caTaxonomy,
    expectedObservableSignature,
    qaExpectations,
    phenotypeMetrics,
    genotypeNotes,
    taxonomyJustification,
    componentRecipe,
    legacyPresetId,
    legacyPresetMappedReferenceSignature,
    metadata,
    fairness,
    coupling
  });
}

export function demoArtifactFilename(prefix, optionsOrDate = {}) {
  const date = optionsOrDate instanceof Date ? optionsOrDate : optionsOrDate.date ?? new Date();
  const kind = optionsOrDate instanceof Date ? null : optionsOrDate.kind;
  const suffix = kind === 'timeSeries' ? 'timeseries' : 'frame';
  const stamp = date.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-');
  return `anchor-${prefix}-demo-${suffix}-${stamp}.json`;
}

export function buildGridFields(width, height, sampler) {
  const fields = {};
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const sample = sampler(col, row) ?? {};
      for (const [key, value] of Object.entries(sample)) {
        if (!fields[key]) fields[key] = Array.from({ length: height }, () => Array.from({ length: width }, () => null));
        fields[key][row][col] = normalizeValue(value);
      }
    }
  }
  return fields;
}

export function normalizeDemoExportSettings(settings = {}, currentTime = 0) {
  const mode = normalizeDemoExportMode(settings.exportMode ?? settings.mode);
  if (mode === 'currentFrame') {
    const time = Math.max(0, finiteNumber(settings.timeSeconds ?? currentTime, currentTime));
    return {
      kind: 'singleFrame',
      mode,
      startSeconds: roundNumber(time),
      endSeconds: roundNumber(time),
      startTimeSeconds: roundNumber(time),
      endTimeSeconds: roundNumber(time),
      frameCount: 1,
      timesSeconds: [roundNumber(time)],
      timeSeconds: roundNumber(time)
    };
  }
  const start = Math.max(0, finiteNumber(settings.startTimeSeconds ?? settings.start ?? 0, 0));
  const end = Math.max(0, finiteNumber(settings.endTimeSeconds ?? settings.end ?? currentTime, currentTime));
  const frameCount = Math.max(1, Math.min(DEMO_ARTIFACT_MAX_FRAMES, Math.round(finiteNumber(settings.frameCount ?? settings.frames ?? 25, 25))));
  const times = frameCount <= 1
    ? [start]
    : Array.from({ length: frameCount }, (_entry, index) => {
      const t = start + (end - start) * index / Math.max(1, frameCount - 1);
      return roundNumber(t);
    });
  return {
    kind: 'timeSeries',
    mode,
    startSeconds: roundNumber(start),
    endSeconds: roundNumber(end),
    startTimeSeconds: roundNumber(start),
    endTimeSeconds: roundNumber(end),
    frameCount,
    timesSeconds: times,
    timeSeconds: times[0] ?? roundNumber(start)
  };
}

export function validateDemoExportSettings(settings = {}, currentTime = 0) {
  const mode = normalizeDemoExportMode(settings.exportMode ?? settings.mode);
  if (mode === 'currentFrame') return [];
  const start = finiteNumber(settings.startTimeSeconds ?? settings.start ?? 0, NaN);
  const end = finiteNumber(settings.endTimeSeconds ?? settings.end ?? currentTime, NaN);
  const frameCount = Math.round(finiteNumber(settings.frameCount ?? settings.frames ?? 25, NaN));
  const errors = [];
  if (!Number.isFinite(start) || start < 0) errors.push('Start time must be 0 seconds or greater.');
  if (!Number.isFinite(end) || end <= start) errors.push('End time must be greater than start time.');
  if (!Number.isFinite(frameCount) || frameCount < 1 || frameCount > DEMO_ARTIFACT_MAX_FRAMES) {
    errors.push(`Frame count must be between 1 and ${DEMO_ARTIFACT_MAX_FRAMES}.`);
  }
  return errors;
}

export function cloneField(field) {
  if (!Array.isArray(field)) return null;
  return field.map((row) => Array.isArray(row) ? row.map(normalizeValue) : []);
}

export function sanitizeJson(value) {
  if (value === undefined || typeof value === 'function') return null;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? roundNumber(value) : null;
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([_key, entry]) => entry !== undefined && typeof entry !== 'function')
        .map(([key, entry]) => [key, sanitizeJson(entry)])
    );
  }
  return null;
}

function normalizeValue(value) {
  if (value === undefined || typeof value === 'function') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? roundNumber(value) : null;
  if (typeof value === 'boolean' || value === null || typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === 'object') return sanitizeJson(value);
  return null;
}

function roundNumber(value) {
  return Number((Number(value) || 0).toFixed(6));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeDemoExportMode(mode) {
  return mode === 'timeWindow' || mode === 'timeSeries' ? 'timeWindow' : 'currentFrame';
}
