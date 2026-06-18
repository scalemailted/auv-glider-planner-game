import { normalizeHeadlessFieldId } from './HeadlessSchemaContract.js';

export const BROWSER_HEADLESS_SCHEMA_MAP_VERSION = 'browser-headless-schema-map-h0';

const BROWSER_HEADLESS_MAP = Object.freeze([
  entry('anchor.demo.sampling-process-field', 'anchor.headless.field-pack', 'partial', true, 'oracle', ['time/depth conventions are demo-local'], 'Add explicit field descriptor list and visibility policy.'),
  entry('anchor.demo.sample-roi-field', 'anchor.headless.field-pack', 'partial', false, 'oracle', ['legacy alias for sampling-process demo'], 'Keep legacy alias mapped but prefer sampling-process-field.'),
  entry('anchor.demo.flow-field', 'anchor.headless.field-pack', 'ready', true, 'forecastOnly', [], 'Expose F_u/F_v descriptors in H1 bundle export.'),
  entry('anchor.demo.coupled-field', 'anchor.headless.field-pack', 'partial', true, 'oracle', ['some coupled process layers are oracle-known'], 'Split process, future, flow, constraint, and objective layers into explicit files.'),
  entry('anchor.demo.coupled-fields', 'anchor.headless.field-pack', 'partial', true, 'oracle', ['some coupled process layers are oracle-known'], 'Split process, future, flow, constraint, and objective layers into explicit files.'),
  entry('anchor.demo.uncertainty-forecast', 'anchor.headless.belief-state', 'partial', true, 'beliefOnly', ['belief update provenance is demo-specific'], 'Normalize hidden truth, forecast, belief mean, uncertainty, and observations.'),
  entry('anchor.demo.sampling-priority', 'anchor.headless.priority-state', 'ready', true, 'publicScenario', [], 'Preserve A_global field descriptor and candidate samples.'),
  entry('anchor.demo.flow-coupled-sampling', 'anchor.headless.priority-state', 'ready', true, 'publicScenario', [], 'Preserve Q_glider, glider context, and candidate target diagnostics.'),

  entry('anchor.benchmark.mode-config', 'anchor.headless.benchmark-episode', 'partial', true, 'publicScenario', ['no step records'], 'Use as episode metadata in H1.'),
  entry('anchor.benchmark.episode-config', 'anchor.headless.benchmark-episode', 'partial', true, 'publicScenario', ['no observations/actions/rewards'], 'Convert into mission config plus episode config.'),
  entry('anchor.benchmark.run', 'anchor.headless.benchmark-episode', 'partial', false, 'publicScenario', ['internal run record wrapper differs from export type'], 'Normalize as episode diagnostics.'),
  entry('anchor.benchmark.run-record', 'anchor.headless.benchmark-episode', 'ready', true, 'publicScenario', [], 'Map run record to episode summary and score report.'),
  entry('anchor.benchmark.route-execution', 'anchor.headless.trajectory', 'ready', true, 'publicScenario', [], 'Map route geometry, actions, and observations into episode records.'),
  entry('anchor.benchmark.attempt-set', 'anchor.headless.benchmark-episode', 'ready', true, 'publicScenario', [], 'Map attempts as replay/comparison bundle records.'),
  entry('anchor.benchmark.comparison', 'anchor.headless.score-report', 'ready', true, 'publicScenario', [], 'Map comparison rankings into score report table.'),
  entry('anchor.benchmark.score-config', 'anchor.benchmark.score-config', 'ready', true, 'publicScenario', [], 'SCORE-R1 shadow benchmark score configuration; not official browser scoring.'),
  entry('anchor.benchmark.score-profile', 'anchor.benchmark.score-profile', 'ready', true, 'publicScenario', [], 'SCORE-R1 objective-aware score profile metadata.'),
  entry('anchor.benchmark.mission-outcome-metrics', 'anchor.benchmark.mission-outcome-metrics', 'ready', true, 'publicScenario', [], 'SCORE-R1 normalized metric record with missing-data provenance.'),
  entry('anchor.benchmark.mission-score', 'anchor.benchmark.mission-score', 'ready', true, 'publicScenario', [], 'SCORE-R1 shadow benchmark mission score; not leaderboard replacement.'),
  entry('anchor.benchmark.mission-outcome-report', 'anchor.benchmark.mission-outcome-report', 'ready', true, 'publicScenario', [], 'SCORE-R1 public-safe scorecard report.'),
  entry('anchor.benchmark.regret-report', 'anchor.benchmark.regret-report', 'ready', true, 'publicScenario', [], 'SCORE-R1 regret report using only compatible or explicitly labelled references.'),
  entry('anchor.benchmark.mission-feasibility-report', 'anchor.benchmark.mission-feasibility-report', 'ready', true, 'publicScenario', [], 'Map MOTION-R1 feasibility diagnostics into public headless/browser bundle summaries.'),
  entry('anchor.benchmark.feasibility-cost-graph', 'anchor.benchmark.feasibility-cost-graph', 'ready', true, 'publicScenario', [], 'SIM-R1 directed motion cost graph for benchmark inspection; not route planning or official scoring.'),
  entry('anchor.headless.motion-cost-matrix', 'anchor.headless.motion-cost-matrix', 'ready', true, 'publicScenario', [], 'SIM-R1 adjacency/cost matrix derived from motion cost graph artifacts.'),
  entry('anchor.benchmark.route-overlay', 'anchor.headless.replay', 'partial', false, 'browserOnly', ['visual overlay state is browser-oriented'], 'Keep route geometry portable, treat visual layer state as optional.'),
  entry('anchor.headless.replay-manifest', 'anchor.headless.replay-manifest', 'ready', true, 'publicScenario', [], 'REPLAY-R1 versioned replay manifest with mode, seed, timing, feature flags, and public boundary metadata.'),
  entry('anchor.headless.replay-events', 'anchor.headless.replay-events', 'ready', true, 'publicScenario', [], 'REPLAY-R1 canonical ordered event stream shared by headless and browser playback.'),
  entry('anchor.headless.replay-checkpoints', 'anchor.headless.replay-checkpoints', 'ready', true, 'publicScenario', [], 'REPLAY-R1 public replay checkpoints with stable public-state digests.'),
  entry('anchor.headless.replay-alignment-report', 'anchor.headless.replay-alignment-report', 'ready', true, 'publicScenario', [], 'REPLAY-R1 first-divergence replay verification report.'),
  entry('anchor.headless.replay-contract', 'anchor.headless.replay-contract', 'ready', true, 'publicScenario', [], 'REPLAY-R1 combined replay contract wrapper for browser/headless tooling.'),
  entry('anchor.benchmark.attempt-session', 'anchor.headless.benchmark-episode', 'ready', true, 'publicScenario', [], 'Map compact persisted attempts into bundle benchmark records.'),

  entry('anchor.benchmark.adaptive-manager-config', 'anchor.headless.benchmark-episode', 'partial', true, 'beliefOnly', ['manager config is objective policy metadata only'], 'Attach to episode diagnostics and mission objective policy.'),
  entry('anchor.benchmark.adaptive-manager-state', 'anchor.headless.benchmark-episode', 'partial', true, 'beliefOnly', ['state is not a full episode trace'], 'Map objective/evidence/diagnosis histories.'),
  entry('anchor.benchmark.adaptive-objective-transition', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'Map to objective transition timeline.'),
  entry('anchor.benchmark.adaptive-surfacing-event', 'anchor.headless.observations', 'ready', true, 'beliefOnly', [], 'Map as surfacing packet observation.'),
  entry('anchor.benchmark.adaptive-manager-preview', 'anchor.headless.benchmark-episode', 'partial', true, 'beliefOnly', ['preview fixture may not include executed route'], 'Use for notebook explanation, not scoring.'),
  entry('anchor.benchmark.adaptive-launch-config', 'anchor.headless.mission-config', 'partial', true, 'beliefOnly', ['browser setup payload contains UI routing fields'], 'Extract mission config and objective policy fields.'),
  entry('anchor.benchmark.adaptive-surfacing-decision', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'Map diagnosis and recommended objective.'),
  entry('anchor.benchmark.adaptive-next-leg-config', 'anchor.headless.mission-config', 'partial', true, 'beliefOnly', ['handoff does not contain a route'], 'Use as next-leg mission config seed.'),
  entry('anchor.benchmark.adaptive-episode-trace', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'Map legs and surfacing decisions into episode timeline.'),
  entry('anchor.benchmark.adaptive-episode-session', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'Map multi-leg session to headless episode/session descriptor.'),
  entry('anchor.benchmark.adaptive-objective-history', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'Map to objective timeline and diagnostics.'),
  entry('anchor.benchmark.adaptive-leg-record', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'Map each leg as episode segment.'),
  entry('anchor.benchmark.adaptive-session-summary', 'anchor.headless.score-report', 'ready', true, 'beliefOnly', [], 'Map summary to score/diagnostic report.'),
  entry('anchor.benchmark.adaptive-science-diagnosis-context', 'anchor.headless.science-diagnostics', 'ready', true, 'beliefOnly', [], 'P10 adaptive science context is public-safe mission-manager evidence metadata, not route planning.'),
  entry('anchor.benchmark.adaptive-science-diagnosis-handoff', 'anchor.headless.science-diagnostics', 'ready', true, 'beliefOnly', [], 'P10 next-leg handoff context carries diagnosis evidence but no waypoints.'),
  entry('anchor.benchmark.adaptive-mission-manager-rationale', 'anchor.headless.benchmark-episode', 'ready', true, 'beliefOnly', [], 'P10 rationale explains objective recommendations while route planning remains player/solver authority.'),

  entry('anchor.plan', 'anchor.headless.trajectory', 'partial', true, 'publicScenario', ['plan may omit observations/results'], 'Pair with result or route execution for complete episode records.'),
  entry('anchor.plan-segment', 'anchor.headless.trajectory', 'partial', false, 'publicScenario', ['segment is partial future route update'], 'Represent as action segment with anchor time.'),
  entry('anchor.surfaceObservation', 'anchor.headless.observations', 'ready', true, 'beliefOnly', [], 'Map as surfacing packet observation.'),
  entry('anchor.result', 'anchor.headless.replay', 'ready', true, 'publicScenario', [], 'Map frames, events, observations, actions, rewards, and scores.'),
  entry('anchor.solverPacket', 'anchor.headless.mission-config', 'ready', true, 'forecastOnly', [], 'Map visible planning packet to headless mission config.'),
  entry('anchor.solver-packet', 'anchor.headless.mission-config', 'ready', true, 'forecastOnly', [], 'Legacy alias for solver packet.'),
  entry('anchor.headless.solver-roundtrip-report', 'anchor.headless.solver-roundtrip-report', 'ready', true, 'publicScenario', [], 'H3.1 canonical solver-packet / submitted-plan / Node-headless report.'),
  entry('anchor.headless.roundtrip-report', 'anchor.headless.solver-roundtrip-report', 'ready', true, 'publicScenario', [], 'Legacy H3 roundtrip report alias accepted as canonical solver roundtrip report.'),
  entry('anchor.headless.solver-roundtrip-bundle', 'anchor.headless.solver-roundtrip-bundle', 'ready', true, 'publicScenario', [], 'H3.1 combined public bundle with embedded solver roundtrip report.'),
  entry('anchor.headless.science-diagnostics', 'anchor.headless.science-diagnostics', 'ready', true, 'publicScenario', [], 'P9 compact public-safe science diagnosis summary for browser and Colab inspection.'),
  entry('anchor.science.forecast-correction', 'anchor.headless.science-diagnostics', 'ready', true, 'publicScenario', [], 'P9 forecast-correction state embedded in science diagnostics.'),
  entry('anchor.science.hidden-event-hypothesis', 'anchor.headless.science-diagnostics', 'ready', true, 'publicScenario', [], 'P9 hidden-event hypothesis state embedded in science diagnostics.'),
  entry('anchor.science.discovery-update', 'anchor.headless.science-diagnostics', 'ready', true, 'publicScenario', [], 'P9 science discovery update embedded in science diagnostics.'),
  entry('anchor.science.discovery-state', 'anchor.headless.science-diagnostics', 'ready', true, 'publicScenario', [], 'P9 science discovery state embedded in science diagnostics.'),
  entry('anchor.browser.headless-roundtrip-summary', 'anchor.headless.solver-roundtrip-report', 'ready', true, 'publicScenario', [], 'Browser summary artifact for H3.1 roundtrip inspection.'),
  entry('anchor.challenge', 'anchor.headless.mission-config', 'partial', true, 'publicScenario', ['challenge includes browser replay/scoring metadata'], 'Extract world, gliders, visible fields, and rules.'),
  entry('anchor.oracleDataset', 'anchor.headless.bundle', 'partial', false, 'hiddenTruth', ['contains hidden truth and training labels'], 'Require explicit oracle/debug visibility in H1 bundle export.'),
  entry('anchor.flow-field', 'anchor.headless.field-pack', 'partial', false, 'forecastOnly', ['import format not demo export'], 'Convert frame currents into F_u/F_v descriptors.'),
  entry('plainWaypointList', 'anchor.headless.trajectory', 'partial', false, 'publicScenario', ['legacy import shape has no schema type'], 'Normalize through anchor.plan first.')
]);

const FIELD_MAP = Object.freeze({
  truth: 'T_hiddenTruth',
  hiddenTruth: 'T_hiddenTruth',
  trueRoi: 'trueRoi',
  roi: 'trueRoi',
  beliefRoi: 'beliefRoi',
  forecast: 'E_forecast',
  expected: 'E_forecast',
  belief: 'mu_belief',
  beliefMean: 'mu_belief',
  uncertainty: 'U_uncertainty',
  hiddenEventProbability: 'hiddenEventProbability',
  pUnknown: 'P_unknown',
  P_unknown: 'P_unknown',
  samplingPriority: 'A_global',
  priority: 'A_global',
  actionValue: 'Q_glider',
  gliderActionValue: 'Q_glider',
  current: ['F_u', 'F_v'],
  vector: ['F_u', 'F_v'],
  u: 'F_u',
  v: 'F_v',
  w: 'F_w',
  terrain: 'constraintMask',
  mask: 'constraintMask',
  constraints: 'constraintMask',
  hazards: 'hazard',
  hazard: 'hazard',
  staleness: 'staleness',
  sampleValue: 'sampleValue',
  eventIntensity: 'eventIntensity',
  boundaryStrength: 'boundaryStrength',
  forecastValidation: 'forecastValidation'
});

export function browserArtifactToHeadlessMap() {
  return BROWSER_HEADLESS_MAP.map((item) => ({ ...item, missingFields: [...item.missingFields], notes: [...item.notes] }));
}

export function headlessArtifactForBrowserType(type) {
  return browserArtifactToHeadlessMap().find((entry) => entry.browserType === type)
    ?? entry(type ?? 'unknown', 'anchor.headless.bundle', 'unknown', false, 'debugAll', ['browser type is not mapped'], 'Add explicit BrowserHeadlessSchemaMap entry in H1/H0 follow-up.');
}

export function browserFieldsToHeadlessFields(fields = {}) {
  const names = Array.isArray(fields) ? fields : Object.keys(fields ?? {});
  return [...new Set(names.flatMap((name) => {
    const mapped = FIELD_MAP[name] ?? normalizeHeadlessFieldId(name);
    return Array.isArray(mapped) ? mapped : [mapped];
  }))];
}

export function benchmarkModeToHeadlessEpisodeMode(mode) {
  if (mode === 'plannerBenchmark') return 'fixedObjectiveRouteBenchmark';
  if (mode === 'adaptiveBenchmark') return 'adaptiveObjectiveRouteBenchmark';
  if (mode === 'fullAutonomyBenchmark') return 'futureFullAutonomyContract';
  return mode ?? 'unknownBenchmarkMode';
}

export function exportTypeHeadlessCompatibility(type) {
  const match = headlessArtifactForBrowserType(type);
  return {
    browserType: match.browserType,
    headlessType: match.headlessType,
    compatibility: match.compatibility,
    requiredForColab: match.requiredForColab,
    visibilityRisk: match.visibilityRisk,
    missingFields: [...match.missingFields],
    recommendedH1Action: match.recommendedH1Action
  };
}

export function browserHeadlessMappingSummary() {
  const entries = browserArtifactToHeadlessMap();
  const byCompatibility = countBy(entries, 'compatibility');
  const requiredForColab = entries.filter((entry) => entry.requiredForColab).length;
  const hiddenRiskTypes = entries.filter((entry) => ['hiddenTruth', 'oracle', 'debugAll'].includes(entry.visibilityRisk)).map((entry) => entry.browserType);
  return {
    version: BROWSER_HEADLESS_SCHEMA_MAP_VERSION,
    entryCount: entries.length,
    requiredForColab,
    byCompatibility,
    hiddenRiskTypes,
    unmappedRequiredP8Types: requiredP8Types().filter((type) => headlessArtifactForBrowserType(type).compatibility === 'unknown'),
    unmappedRequiredBenchmarkTypes: requiredBenchmarkTypes().filter((type) => headlessArtifactForBrowserType(type).compatibility === 'unknown'),
    unmappedRequiredDemoTypes: requiredDemoTypes().filter((type) => headlessArtifactForBrowserType(type).compatibility === 'unknown')
  };
}

export function requiredP8Types() {
  return [
    'anchor.benchmark.adaptive-episode-session',
    'anchor.benchmark.adaptive-objective-history',
    'anchor.benchmark.adaptive-leg-record',
    'anchor.benchmark.adaptive-session-summary',
    'anchor.benchmark.adaptive-science-diagnosis-context',
    'anchor.benchmark.adaptive-science-diagnosis-handoff',
    'anchor.benchmark.adaptive-mission-manager-rationale'
  ];
}

export function requiredBenchmarkTypes() {
  return [
    'anchor.benchmark.mode-config',
    'anchor.benchmark.episode-config',
    'anchor.benchmark.run-record',
    'anchor.benchmark.route-execution',
    'anchor.benchmark.attempt-set',
    'anchor.benchmark.comparison',
    'anchor.benchmark.route-overlay',
    'anchor.benchmark.attempt-session',
    'anchor.benchmark.mission-feasibility-report',
    'anchor.benchmark.feasibility-cost-graph',
    'anchor.headless.motion-cost-matrix'
  ];
}

export function requiredDemoTypes() {
  return [
    'anchor.demo.sampling-process-field',
    'anchor.demo.flow-field',
    'anchor.demo.coupled-fields',
    'anchor.demo.uncertainty-forecast',
    'anchor.demo.sampling-priority',
    'anchor.demo.flow-coupled-sampling'
  ];
}

function entry(browserType, headlessType, compatibility, requiredForColab, visibilityRisk, missingFields = [], recommendedH1Action = '') {
  return Object.freeze({
    browserType,
    headlessType,
    compatibility,
    requiredForColab: Boolean(requiredForColab),
    visibilityRisk,
    notes: notesForCompatibility(compatibility, visibilityRisk),
    missingFields,
    recommendedH1Action
  });
}

function notesForCompatibility(compatibility, visibilityRisk) {
  const notes = [`Compatibility: ${compatibility}.`];
  if (['hiddenTruth', 'oracle', 'debugAll'].includes(visibilityRisk)) notes.push('Visibility-sensitive: protect hidden truth/oracle fields in public Colab bundles.');
  return notes;
}

function countBy(entries, key) {
  return entries.reduce((acc, entry) => ({ ...acc, [entry[key]]: (acc[entry[key]] ?? 0) + 1 }), {});
}


