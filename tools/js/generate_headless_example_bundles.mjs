import fs from 'node:fs';
import path from 'node:path';

import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const OUTPUT_DIR = path.join('docs', 'examples');
const DEBUG_BUNDLE_PATH = path.join(OUTPUT_DIR, 'headless_oceanbox_js_bundle.example.json');
const PUBLIC_BUNDLE_PATH = path.join(OUTPUT_DIR, 'headless_oceanbox_js_public_bundle.example.json');
const CREATED_AT = '2026-06-16T00:00:00.000Z';
const CONFIG = Object.freeze({
  scenario: 'coastalBloomFront',
  seed: 'h2-example-001',
  width: 12,
  height: 8
});

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig(CONFIG));
const debugBundle = createHeadlessCombinedBundle(episode, { includeHiddenTruth: true, createdAt: CREATED_AT });
const publicBundle = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false, createdAt: CREATED_AT });

verifyDebugBundle(debugBundle);
verifyPublicBundle(publicBundle);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
writeStableJson(DEBUG_BUNDLE_PATH, debugBundle);
writeStableJson(PUBLIC_BUNDLE_PATH, publicBundle);

const outputs = [DEBUG_BUNDLE_PATH, PUBLIC_BUNDLE_PATH].map((filePath) => ({
  path: filePath,
  bytes: fs.statSync(filePath).size
}));

console.log(JSON.stringify({
  ok: true,
  generator: 'generate_headless_example_bundles-h2.1',
  config: CONFIG,
  createdAt: CREATED_AT,
  episodeId: episode.episodeId,
  outputs,
  summary: {
    debugHiddenFields: Object.keys(debugBundle.hiddenFields?.fields ?? {}),
    publicHiddenFields: publicBundle.hiddenFields ? Object.keys(publicBundle.hiddenFields.fields ?? {}) : [],
    visibleFields: Object.keys(publicBundle.visibleFields?.fields ?? {}),
    observations: publicBundle.observations?.length ?? 0,
    gliderTracks: publicBundle.gliderTracks?.length ?? 0,
    finalScore: publicBundle.scoreReport?.finalScore ?? null
  }
}, null, 2));

function verifyPublicBundle(bundle) {
  assertBundleBase(bundle, 'public');
  const visibleIds = visibleFieldIds(bundle);
  if (visibleIds.includes('T_hiddenTruth')) throw new Error('Public fixture visibleFields includes T_hiddenTruth.');
  if (bundle.visibleFields?.fields?.T_hiddenTruth !== undefined) throw new Error('Public fixture visible field payload leaks T_hiddenTruth.');
  if (bundle.hiddenFields !== null && bundle.hiddenFields !== undefined) throw new Error('Public fixture must omit hiddenFields payload.');
  const manifestRequiresHidden = (bundle.manifest?.files ?? []).some((entry) => entry?.path === 'hidden_fields.json' || entry?.role === 'hiddenFields');
  if (manifestRequiresHidden) throw new Error('Public fixture manifest requires hidden_fields.json.');
  if (!/hidden.*disabled|hidden_fields\.json omitted/i.test((bundle.manifest?.notes ?? []).join(' '))) {
    throw new Error('Public fixture manifest must state hidden export is disabled/omitted.');
  }
}

function verifyDebugBundle(bundle) {
  assertBundleBase(bundle, 'debug');
  if (!bundle.hiddenFields?.fields?.T_hiddenTruth) throw new Error('Debug fixture must include T_hiddenTruth in hiddenFields.');
  const manifestHidden = (bundle.manifest?.files ?? []).find((entry) => entry?.path === 'hidden_fields.json' || entry?.role === 'hiddenFields');
  const tier = manifestHidden?.visibilityTier ?? bundle.hiddenFields?.visibilityTier ?? bundle.hiddenFields?.fieldVisibility?.T_hiddenTruth;
  if (!['hiddenTruth', 'oracle', 'debugAll'].includes(tier)) throw new Error(`Debug fixture hidden fields must be hiddenTruth/oracle/debugAll, got ${tier ?? 'missing'}.`);
  if (bundle.visibleFields?.fields?.T_hiddenTruth !== undefined) throw new Error('Debug fixture visibleFields must not include T_hiddenTruth payload.');
}

function assertBundleBase(bundle, label) {
  if (bundle?.type !== 'anchor.headless.bundle') throw new Error(`${label} fixture must be anchor.headless.bundle.`);
  if (bundle?.manifest?.scenarioId !== CONFIG.scenario) throw new Error(`${label} fixture scenario mismatch.`);
  if (bundle?.manifest?.seed !== CONFIG.seed) throw new Error(`${label} fixture seed mismatch.`);
  if (!Array.isArray(bundle?.observations) || bundle.observations.length === 0) throw new Error(`${label} fixture must include observations array.`);
  if (!Array.isArray(bundle?.gliderTracks) || bundle.gliderTracks.length === 0) throw new Error(`${label} fixture must include gliderTracks array.`);
  if (!bundle?.scoreReport) throw new Error(`${label} fixture must include scoreReport.`);
  if (!bundle?.replay) throw new Error(`${label} fixture must include replay.`);
}

function visibleFieldIds(bundle) {
  return [...new Set([...(bundle.visibleFields?.fieldIds ?? []), ...Object.keys(bundle.visibleFields?.fields ?? {})])];
}

function writeStableJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
