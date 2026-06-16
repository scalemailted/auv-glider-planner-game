import fs from 'node:fs';
import path from 'node:path';

import { createHeadlessBundleManifest as createH0HeadlessBundleManifest } from '../HeadlessBundleManifest.js';

const VISIBLE_FIELD_IDS = Object.freeze(['E_forecast', 'mu_belief', 'U_uncertainty', 'P_unknown', 'A_global', 'F_u', 'F_v', 'hazard', 'constraintMask', 'staleness', 'boundaryStrength']);
const HIDDEN_FIELD_IDS = Object.freeze(['T_hiddenTruth']);

export function createHeadlessBundleManifest(episode, options = {}) {
  const includeHidden = options.includeHiddenTruth !== false;
  const combinedJson = options.combinedJson === true;
  const files = [
    fileEntry('manifest.json', 'manifest', 'anchor.headless.manifest', 'publicScenario', 'Bundle manifest.'),
    fileEntry('mission_config.json', 'missionConfig', 'anchor.headless.mission-config', 'publicScenario', 'Mission config used by the Node headless runtime.'),
    fileEntry('visible_fields.json', 'visibleFields', 'anchor.headless.field-pack', 'publicScenario', 'Forecast, belief, uncertainty, priority, flow, hazard, mask, and staleness fields.'),
    fileEntry('observations.json', 'observations', 'anchor.headless.observations', 'publicScenario', 'Noisy observations sampled along the provided waypoint route.'),
    fileEntry('observations.csv', 'observations', 'anchor.headless.observations', 'publicScenario', 'CSV observation table.'),
    fileEntry('glider_tracks.json', 'gliderTracks', 'anchor.headless.trajectory', 'publicScenario', 'Waypoint execution track points.'),
    fileEntry('glider_tracks.csv', 'gliderTracks', 'anchor.headless.trajectory', 'publicScenario', 'CSV glider track table.'),
    fileEntry('score_report.json', 'scoreReport', 'anchor.headless.score-report', 'publicScenario', 'Educational Node headless score report.'),
    fileEntry('replay.json', 'replay', 'anchor.headless.replay', 'publicScenario', 'Lightweight replay path and observation references.'),
    fileEntry('episode.json', 'benchmarkRecords', 'anchor.headless.benchmark-episode', 'publicScenario', 'Complete H1 headless episode artifact.')
  ];
  if (includeHidden) {
    files.splice(3, 0, fileEntry('hidden_fields.json', 'hiddenFields', 'anchor.headless.field-pack', 'hiddenTruth', 'Hidden truth and oracle-only fields for instructor/debug use.'));
  }
  if (combinedJson) {
    files.push(fileEntry('bundle.json', 'combinedBundle', 'anchor.headless.bundle', 'publicScenario', 'Single-file H2 browser import bundle.'));
  }

  const jsonFiles = ['mission_config.json', 'score_report.json', 'replay.json', 'episode.json'];
  if (combinedJson) jsonFiles.push('bundle.json');

  return createH0HeadlessBundleManifest({
    createdAt: options.createdAt,
    bundleType: 'oceanbox-js-h1-headless-runtime',
    runtimeTarget: 'nodeHeadless',
    scenarioId: episode?.missionConfig?.scenarioId ?? episode?.fieldPackBefore?.scenario ?? null,
    missionId: episode?.missionConfig?.missionId ?? null,
    episodeId: episode?.episodeId ?? null,
    seed: episode?.seed ?? null,
    visibilityTier: includeHidden ? 'debugAll' : 'publicScenario',
    files,
    arrays: [
      { path: 'visible_fields.json', fieldIds: VISIBLE_FIELD_IDS.slice(), shape: episode?.fieldPackBefore?.grid?.shape ?? null },
      ...(includeHidden ? [{ path: 'hidden_fields.json', fieldIds: HIDDEN_FIELD_IDS.slice(), visibilityTier: 'hiddenTruth' }] : [])
    ],
    tables: [
      { path: 'observations.csv', rowCount: episode?.observations?.length ?? 0 },
      { path: 'glider_tracks.csv', rowCount: episode?.tracks?.length ?? 0 }
    ],
    json: jsonFiles,
    notes: [
      'Node headless runtime over portable ANCHOR core logic. Browser ANCHOR remains the official visual referee and scoring UI.',
      includeHidden ? 'Hidden truth export enabled for debug/instructor workflows.' : 'Hidden truth export disabled; hidden_fields.json omitted.',
      combinedJson ? 'bundle.json is a convenience single-file import for the H2 browser bundle viewer.' : 'Multi-file bundle export; pass combinedJson to also emit bundle.json.',
      'H1/H2 do not implement Python OceanBox, a new planner, MARL/RL, or calibrated ocean forecasting.'
    ]
  });
}

export function headlessBundleFiles(episode, options = {}) {
  const includeHidden = options.includeHiddenTruth !== false;
  const combinedJson = options.combinedJson === true;
  const manifest = createHeadlessBundleManifest(episode, { includeHiddenTruth: includeHidden, combinedJson, createdAt: options.createdAt });
  const files = {
    'manifest.json': stableJson(manifest),
    'mission_config.json': stableJson(episode.missionConfig),
    'visible_fields.json': stableJson(buildFieldPackFile(episode.fieldPackAfter ?? episode.fieldPackBefore, VISIBLE_FIELD_IDS, 'publicScenario')),
    'observations.json': stableJson({ type: 'anchor.headless.observations', version: 'headless-runtime-observations-h1', observations: episode.observations ?? [] }),
    'observations.csv': observationsCsv(episode.observations ?? []),
    'glider_tracks.json': stableJson({ type: 'anchor.headless.trajectory', version: 'headless-runtime-tracks-h1', tracks: episode.tracks ?? [] }),
    'glider_tracks.csv': tracksCsv(episode.tracks ?? []),
    'score_report.json': stableJson(episode.scoreReport),
    'replay.json': stableJson(episode.replay),
    'episode.json': stableJson(stripBundleEpisode(episode, includeHidden))
  };
  if (includeHidden) {
    files['hidden_fields.json'] = stableJson(buildFieldPackFile(episode.fieldPackBefore, HIDDEN_FIELD_IDS, 'hiddenTruth'));
  }
  if (combinedJson) {
    files['bundle.json'] = stableJson(createHeadlessCombinedBundle(episode, { includeHiddenTruth: includeHidden, createdAt: options.createdAt }));
  }
  return files;
}

export function createHeadlessCombinedBundle(episode, options = {}) {
  const includeHidden = options.includeHiddenTruth !== false;
  const manifest = createHeadlessBundleManifest(episode, { includeHiddenTruth: includeHidden, combinedJson: true, createdAt: options.createdAt });
  const bundle = {
    type: 'anchor.headless.bundle',
    version: 'headless-combined-bundle-h2',
    manifest,
    missionConfig: episode.missionConfig,
    visibleFields: buildFieldPackFile(episode.fieldPackAfter ?? episode.fieldPackBefore, VISIBLE_FIELD_IDS, 'publicScenario'),
    observations: episode.observations ?? [],
    gliderTracks: episode.tracks ?? [],
    scoreReport: episode.scoreReport,
    replay: episode.replay,
    episode: stripBundleEpisode(episode, includeHidden),
    notes: [
      'Combined bundle for browser import. Browser ANCHOR remains the official visual referee and browser scoring UI.',
      includeHidden ? 'Hidden fields are included for oracle/debug workflows.' : 'Hidden fields omitted because hidden export is disabled.'
    ]
  };
  if (includeHidden) {
    bundle.hiddenFields = buildFieldPackFile(episode.fieldPackBefore, HIDDEN_FIELD_IDS, 'hiddenTruth');
  } else {
    bundle.hiddenFields = null;
  }
  return bundle;
}

export function writeHeadlessBundle(episode, outputDir, options = {}) {
  if (!outputDir) throw new Error('outputDir is required.');
  fs.mkdirSync(outputDir, { recursive: true });
  const files = headlessBundleFiles(episode, options);
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outputDir, fileName), content, 'utf8');
  }
  return headlessBundleSummary(outputDir);
}

export function headlessBundleSummary(outputDir) {
  const files = fs.existsSync(outputDir) ? fs.readdirSync(outputDir).sort() : [];
  const manifestPath = path.join(outputDir, 'manifest.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  return {
    type: 'anchor.headless.bundle-summary',
    outputDir,
    fileCount: files.length,
    files,
    hasManifest: Boolean(manifest),
    hiddenTruthExported: files.includes('hidden_fields.json'),
    combinedBundle: files.includes('bundle.json'),
    finalScoreFile: files.includes('score_report.json'),
    observationCsv: files.includes('observations.csv'),
    trackCsv: files.includes('glider_tracks.csv'),
    manifestNotes: manifest?.notes ?? []
  };
}

function buildFieldPackFile(fieldPack, fieldIds, visibilityTier) {
  const fields = {};
  const visibility = {};
  for (const id of fieldIds) {
    if (fieldPack?.fields?.[id] === undefined) continue;
    fields[id] = fieldPack.fields[id];
    visibility[id] = fieldPack.fieldVisibility?.[id] ?? visibilityTier;
  }
  return {
    type: 'anchor.headless.field-pack',
    version: fieldPack?.version ?? 'headless-runtime-fields-h1',
    scenario: fieldPack?.scenario ?? null,
    seed: fieldPack?.seed ?? null,
    visibilityTier,
    grid: fieldPack?.grid ?? null,
    fieldIds: Object.keys(fields),
    fields,
    fieldVisibility: visibility,
    boundary: fieldPack?.boundary ?? null,
    notes: fieldPack?.notes ?? []
  };
}

function stripBundleEpisode(episode, includeHidden) {
  const copy = JSON.parse(JSON.stringify(episode));
  if (!includeHidden) {
    delete copy.fieldPackBefore?.fields?.T_hiddenTruth;
    delete copy.fieldPackAfter?.fields?.T_hiddenTruth;
  }
  return copy;
}

function fileEntry(pathValue, role, schemaType, visibilityTier, description) {
  return { path: pathValue, role, schemaType, visibilityTier, description };
}

function observationsCsv(observations) {
  const columns = ['observationId', 'timeSeconds', 'gliderId', 'x', 'y', 'zIndex', 'depthLayer', 'truthValue', 'forecastValue', 'beliefValue', 'observedValue', 'sensorNoise', 'innovation', 'surprise'];
  return toCsv(columns, observations);
}

function tracksCsv(tracks) {
  const columns = ['timeSeconds', 'gliderId', 'x', 'y', 'zIndex', 'depthLayer', 'flowU', 'flowV', 'currentAssist', 'crossCurrent', 'energyUsedIncrement', 'hazard', 'constraintMask'];
  return toCsv(columns, tracks);
}

function toCsv(columns, rows) {
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvValue(row[column])).join(','));
  return `${lines.join('\n')}\n`;
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

