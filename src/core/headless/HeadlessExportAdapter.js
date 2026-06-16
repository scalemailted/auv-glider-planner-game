import { createHeadlessBundleFileEntry, createHeadlessBundleManifest } from './HeadlessBundleManifest.js';
import { createHeadlessEpisode, createHeadlessActionRecord, createHeadlessObservationRecord, createHeadlessRewardRecord } from './HeadlessEpisodeSchema.js';
import { createHeadlessFieldDescriptor } from './HeadlessFieldSchema.js';
import { createHeadlessMissionConfig } from './HeadlessMissionSchema.js';
import { browserFieldsToHeadlessFields, headlessArtifactForBrowserType } from './BrowserHeadlessSchemaMap.js';

export const HEADLESS_EXPORT_ADAPTER_VERSION = 'headless-export-adapter-h0';

export function buildHeadlessMissionConfigFromBrowserArtifact(artifact = {}, options = {}) {
  const level = artifact.level ?? artifact.challenge ?? artifact;
  const mission = artifact.mission ?? artifact;
  const grid = level.world?.grid ?? artifact.grid ?? {};
  const time = level.world?.time ?? artifact.time ?? {};
  const fields = browserFieldsToHeadlessFields(artifact.fields ?? artifact.layers ?? artifact.planningData?.visibleFields ?? {});
  return createHeadlessMissionConfig({
    missionId: options.missionId ?? artifact.missionId ?? mission.missionId,
    scenarioId: options.scenarioId ?? artifact.scenarioId ?? artifact.levelId ?? artifact.instanceId,
    seed: options.seed ?? artifact.seed ?? artifact.meta?.seed,
    benchmarkMode: options.benchmarkMode ?? artifact.benchmarkMode ?? artifact.benchmarkMetadata?.benchmarkMode,
    informationAccessTier: options.informationAccessTier ?? artifact.informationAccessTier ?? artifact.visibilityTier ?? artifact.visibility?.tier,
    fairnessLabel: options.fairnessLabel ?? artifact.fairnessLabel ?? artifact.benchmarkMetadata?.fairnessLabel,
    world: {
      width: grid.width ?? artifact.width,
      height: grid.height ?? artifact.height,
      timeStepSeconds: time.dt,
      durationSeconds: time.duration,
      masks: { terrain: summarizeMaybeArray(level.layers?.terrain ?? artifact.terrain), hazards: summarizeMaybeArray(level.layers?.hazards ?? artifact.hazards) },
      fieldDescriptors: fields.map((id) => createHeadlessFieldDescriptor({ id, source: artifact.type ?? 'browser-artifact' }))
    },
    gliders: artifact.agents ?? mission.agents ?? artifact.gliders ?? [],
    objectives: mission.objectives ?? artifact.objectives ?? [],
    allowedFields: fields,
    visibleFields: fields.filter((id) => !['T_hiddenTruth', 'trueRoi', 'eventIntensity'].includes(id)),
    hiddenFields: fields.filter((id) => ['T_hiddenTruth', 'trueRoi', 'eventIntensity'].includes(id)),
    planningRules: mission.rules ?? artifact.rules,
    scoringRules: mission.scoring ?? artifact.scoring,
    notes: ['Created by H0 adapter skeleton. It does not simulate or write files.', ...(options.notes ?? [])]
  });
}

export function buildHeadlessEpisodeFromBenchmarkRecords(records = {}, options = {}) {
  const list = Array.isArray(records) ? records : Object.values(records).filter(Boolean);
  const first = list[0] ?? records;
  const episodeId = options.episodeId ?? first?.episodeId ?? first?.runRecord?.episodeId ?? first?.session?.episodeId ?? 'headless-episode';
  const observations = [];
  const actions = [];
  const rewards = [];
  const surfacingEvents = [];
  const objectives = [];
  for (const record of list) {
    const payload = record?.runRecord ?? record;
    for (const event of record?.events ?? payload?.events ?? []) {
      observations.push(createHeadlessObservationRecord({ ...event, type: event.type ?? 'event', gliderId: event.agentId }));
    }
    for (const segment of record?.segments ?? payload?.segments ?? record?.routeExecutionRecord?.segments ?? []) {
      actions.push(createHeadlessActionRecord({ type: 'routeSegment', gliderId: segment.agentId, target: segment.end ?? segment.to, payload: summarizeObject(segment) }));
    }
    if (record?.summary ?? payload?.summary ?? record?.metrics) {
      rewards.push(createHeadlessRewardRecord({ value: payload?.summary?.finalScore ?? record?.summary?.finalScore ?? record?.metrics?.finalScore ?? record?.metrics?.score, components: record?.summary ?? payload?.summary ?? record?.metrics }));
    }
    if (record?.surfacingEvent) surfacingEvents.push(record.surfacingEvent);
    if (record?.objectiveTransition) objectives.push(record.objectiveTransition);
  }
  return createHeadlessEpisode({
    episodeId,
    benchmarkMode: options.benchmarkMode ?? first?.benchmarkMode ?? first?.runRecord?.benchmarkMode ?? first?.session?.benchmarkMode,
    runtimeTarget: options.runtimeTarget ?? 'browser',
    informationAccessTier: options.informationAccessTier ?? first?.informationAccessTier,
    fairnessLabel: options.fairnessLabel ?? first?.fairnessLabel,
    seed: options.seed ?? first?.seed,
    steps: list.map((record, index) => ({ t: index, timeSeconds: record?.time ?? index, info: { benchmarkMode: record?.benchmarkMode } })),
    observations,
    actions,
    rewards,
    surfacingEvents,
    objectives,
    diagnostics: { sourceRecordCount: list.length, adapterVersion: HEADLESS_EXPORT_ADAPTER_VERSION },
    exports: list.map((record) => ({ type: record?.type ?? record?.runRecord?.type ?? 'unknown', compatibility: headlessArtifactForBrowserType(record?.type ?? record?.runRecord?.type).compatibility })),
    notes: ['H0 episode adapter aligns browser records with headless episode vocabulary. It does not rerun simulations.']
  });
}

export function buildHeadlessFieldPackDescriptorFromDemoArtifact(artifact = {}, options = {}) {
  const fieldIds = browserFieldsToHeadlessFields(artifact.fields ?? artifact.layers ?? options.fields ?? {});
  const descriptors = fieldIds.map((id) => createHeadlessFieldDescriptor({ id, source: artifact.type ?? 'demo', shape: inferGridShape(artifact), visibilityTier: visibilityForField(id) }));
  const compatibility = headlessArtifactForBrowserType(artifact.type);
  return {
    type: 'anchor.headless.field-pack',
    version: HEADLESS_EXPORT_ADAPTER_VERSION,
    sourceType: artifact.type ?? null,
    sourceDemoName: artifact.demoName ?? artifact.demo ?? null,
    compatibility: compatibility.compatibility,
    visibilityRisk: compatibility.visibilityRisk,
    grid: cloneJson(artifact.grid ?? null),
    time: cloneJson(artifact.time ?? artifact.timeSampling ?? null),
    fieldDescriptors: descriptors,
    fieldIds,
    includesRawFields: Boolean(options.includeRawFields && isSmallFieldPayload(artifact.fields)),
    fields: options.includeRawFields && isSmallFieldPayload(artifact.fields) ? cloneJson(artifact.fields) : undefined,
    notes: ['H0 field-pack descriptor summarizes browser demo fields for future Colab bundles.']
  };
}

export function buildHeadlessBundleManifestFromArtifacts(artifacts = [], options = {}) {
  const items = Array.isArray(artifacts) ? artifacts : [artifacts];
  const files = [createHeadlessBundleFileEntry({ path: 'manifest.json', role: 'manifest', schemaType: 'anchor.headless.manifest' })];
  for (const [index, artifact] of items.entries()) {
    const compatibility = headlessArtifactForBrowserType(artifact?.type);
    files.push(createHeadlessBundleFileEntry({
      path: `artifacts/artifact-${index + 1}.json`,
      role: roleForHeadlessType(compatibility.headlessType),
      schemaType: compatibility.headlessType,
      visibilityTier: compatibility.visibilityRisk === 'oracle' ? 'oracle' : compatibility.visibilityRisk === 'hiddenTruth' ? 'hiddenTruth' : 'publicScenario',
      description: `${artifact?.type ?? 'unknown'} -> ${compatibility.headlessType}`
    }));
  }
  return createHeadlessBundleManifest({
    ...options,
    files,
    notes: ['H0 manifest is a contract preview only. It does not write binary arrays.']
  });
}

export function normalizeBrowserArtifactForHeadless(artifact = {}, options = {}) {
  const cloned = cloneJson(artifact);
  const compatibility = headlessArtifactForBrowserType(cloned?.type);
  if (compatibility.headlessType === 'anchor.headless.mission-config') return buildHeadlessMissionConfigFromBrowserArtifact(cloned, options);
  if (compatibility.headlessType === 'anchor.headless.field-pack' || compatibility.headlessType === 'anchor.headless.priority-state' || compatibility.headlessType === 'anchor.headless.belief-state') return buildHeadlessFieldPackDescriptorFromDemoArtifact(cloned, options);
  if (compatibility.headlessType === 'anchor.headless.benchmark-episode' || compatibility.headlessType === 'anchor.headless.trajectory' || compatibility.headlessType === 'anchor.headless.replay' || compatibility.headlessType === 'anchor.headless.score-report') return buildHeadlessEpisodeFromBenchmarkRecords([cloned], options);
  return {
    type: compatibility.headlessType,
    version: HEADLESS_EXPORT_ADAPTER_VERSION,
    sourceType: cloned?.type ?? null,
    compatibility: compatibility.compatibility,
    notes: ['H0 fallback descriptor; H1 should add a richer adapter.']
  };
}

export function validateHeadlessAdapterOutput(output = {}) {
  const errors = [];
  const warnings = [];
  if (!output || typeof output !== 'object') errors.push('Adapter output must be an object.');
  if (!output?.type || !String(output.type).startsWith('anchor.headless.')) errors.push('Adapter output type must start with anchor.headless.');
  if (output?.notes?.some?.((note) => /implements\s+(python|new simulator|new planner|marl|rl)/i.test(note))) warnings.push('H0 adapter output should not claim implementation of Python package, simulator, planner, or learning.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

function roleForHeadlessType(type) {
  if (type === 'anchor.headless.mission-config') return 'missionConfig';
  if (type === 'anchor.headless.field-pack') return 'fieldPack';
  if (type === 'anchor.headless.observations') return 'observations';
  if (type === 'anchor.headless.score-report') return 'scoreReport';
  if (type === 'anchor.headless.replay') return 'replay';
  if (type === 'anchor.headless.benchmark-episode') return 'benchmarkRecords';
  return 'fieldPack';
}

function visibilityForField(id) { return ['T_hiddenTruth', 'trueRoi', 'eventIntensity'].includes(id) ? 'hiddenTruth' : id === 'E_forecast' || id === 'F_u' || id === 'F_v' || id === 'F_w' ? 'forecastOnly' : id === 'mu_belief' || id === 'U_uncertainty' || id === 'P_unknown' || id === 'hiddenEventProbability' ? 'beliefOnly' : 'publicScenario'; }
function inferGridShape(artifact = {}) { return artifact.grid?.width && artifact.grid?.height ? [artifact.grid.height, artifact.grid.width] : null; }
function summarizeMaybeArray(value) { return Array.isArray(value) ? { present: true, rows: value.length, cols: value[0]?.length ?? 0 } : value ?? null; }
function summarizeObject(value) { return value && typeof value === 'object' ? cloneJson(value) : value; }
function isSmallFieldPayload(fields = {}) { const text = JSON.stringify(fields ?? {}); return text.length < 20000; }
function cloneJson(value) { if (value === undefined || value === null) return value ?? null; try { return JSON.parse(JSON.stringify(value)); } catch { return value; } }