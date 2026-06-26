import { canonicalJsonDigest } from '../../../packages/codecs/src/index.js';

export const ALPHA_RELEASE_MODULE_VERSION = 'alpha-r1-release-workflows';
export const ALPHA_RELEASE_ID = 'alpha-r1-external-research-education-preview';
export const ALPHA_RELEASE_VERSION = '0.1.0-alpha.1';
export const ALPHA_POSITIONING = 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.';
export const ALPHA_TAGLINE = 'Plan. Simulate. Compare. Learn.';

export const ALPHA_STATUS = Object.freeze({
  localPythonExecution: 'VERIFIED',
  authoritativeAnchorFinalization: 'VERIFIED',
  googleColabHostingSmoke: 'PENDING',
  validationBaselineId: 'sci-valid-r2a-pre-alpha-baseline',
  validationBaselineDigest: 'fnv1a32:dd016175',
  localAcceptanceDigest: 'fnv1a32:9a73d341',
  checkedInAstarOfficialScore: 23.593559,
  conclusion: 'GO_FOR_ALPHA_R1_WITH_COLAB_HOSTING_SMOKE_PENDING'
});

export const ALPHA_LIMITATIONS = Object.freeze([
  limitation('synthetic-environments', 'Synthetic benchmark environments', 'SUPPORTED_WITH_QUALIFIER', 'Alpha missions are deterministic synthetic benchmarks for education and reproducible comparison, not calibrated named-region forecasts.', 'docs/scientific_validation_and_methods.md'),
  limitation('not-operational-forecast', 'Not an operational forecast', 'UNSUPPORTED_FOR_OPERATIONAL_USE', 'The current models are scientifically constrained and verified for software behavior, but they are not operational ocean forecasts.', 'docs/scientific_validation_and_methods.md'),
  limitation('not-certified-navigation', 'Not certified navigation', 'UNSUPPORTED_FOR_OPERATIONAL_USE', 'ANCHOR does not command vehicles and is not certified for navigation or safety-critical operations.', 'docs/game_design_scientific_auv_planning.md'),
  limitation('evidence-gaps', 'External comparison and operational validation gaps', 'NOT_EVALUATED', 'The validation baseline records software, numerical, and plausibility evidence while leaving stronger external comparison and operational validation explicit.', 'validation/manifest.json'),
  limitation('notebook-oracle-limits', 'Notebook exact-oracle limits', 'SUPPORTED_WITH_QUALIFIER', 'Exact claims are bounded to declared graph, objective, candidate set, and discretization scope.', 'docs/classical_planner_benchmark_notebook.md'),
  limitation('colab-hosting-pending', 'Google Colab hosting smoke pending', 'PENDING', 'Local Python execution and ANCHOR finalization are verified. A real hosted Google Colab Run all remains pending.', 'tests/fixtures/colab_benchmark/colab_bench_r1_1_local_acceptance.json'),
  limitation('browser-device-limits', 'Browser and device limitations', 'SUPPORTED_WITH_LIMITATIONS', 'Alpha depends on WebGL, current browser engines, viewport size, and available GPU/CPU resources.', 'docs/testing.md'),
  limitation('privacy-feedback', 'Feedback is manual and private by default', 'SUPPORTED', 'Feedback and diagnostics are exported locally; ANCHOR Alpha does not transmit telemetry, cookies, or user identity.', 'docs/alpha_release.md')
]);

export const ALPHA_ONBOARDING_OPTIONS = Object.freeze([
  {
    id: 'guided',
    label: 'Play a Guided Mission',
    description: 'Learn how to deploy a glider, place surface waypoints, configure incoming dive profiles, inspect currents and depth layers, execute, sample, surface, and replan.'
  },
  {
    id: 'benchmark',
    label: 'Benchmark a Planner',
    description: 'Export a public solver packet or benchmark bundle, download the classical planner notebook, import a candidate plan, and evaluate it with the authoritative ANCHOR referee.'
  },
  {
    id: 'methods',
    label: 'Inspect Methods and Evidence',
    description: 'Review model assumptions, numerical verification, physical-plausibility evidence, provenance, and known limitations.'
  },
  {
    id: 'free',
    label: 'Explore Freely',
    description: 'Continue to the normal Product Hub.'
  }
]);

export const ALPHA_SCENARIO_CATALOG = Object.freeze([
  catalogEntry('alpha-guided-mission', 'Alpha Guided Mission', ['Player / Student'], 12, 'introductory', false, true, false, false, 'tutorial_01_first_deployment', 'derived-at-runtime-from-tutorial-level'),
  catalogEntry('alpha-depth-sampling-mission', 'Alpha Depth Sampling Mission', ['Player / Student', 'Researcher / Instructor'], 15, 'intermediate', false, true, false, false, 'generated-depth-aware-simulation-lab', 'generated-by-packages/environment'),
  catalogEntry('alpha-dynamic-current-mission', 'Alpha Dynamic Current Mission', ['Player / Student', 'Researcher / Instructor'], 18, 'intermediate', false, true, true, false, 'generated-flow-runtime-simulation-lab', 'generated-by-packages/environment'),
  catalogEntry('alpha-multi-glider-mission', 'Alpha Multi-Glider Mission', ['Player / Student'], 20, 'intermediate', true, true, false, false, 'generated-regional-fleet-challenge', 'generated-by-packages/environment'),
  catalogEntry('alpha-forecast-replanning-mission', 'Alpha Forecast and Replanning Mission', ['Player / Student', 'Researcher / Instructor'], 20, 'advanced', true, true, true, false, 'generated-forecast-challenge', 'generated-by-packages/environment'),
  catalogEntry('alpha-research-benchmark', 'Alpha Research Benchmark', ['Researcher / Instructor'], 25, 'research', false, false, false, true, 'static_additive_routing', 'fnv1a32:220ad0dc')
]);

export function alphaReleaseSummary(manifest = null) {
  return {
    releaseId: manifest?.releaseId ?? ALPHA_RELEASE_ID,
    releaseVersion: manifest?.releaseVersion ?? ALPHA_RELEASE_VERSION,
    releaseChannel: manifest?.releaseChannel ?? 'alpha',
    tagline: manifest?.tagline ?? ALPHA_TAGLINE,
    claimBoundary: manifest?.claimBoundary ?? ALPHA_POSITIONING,
    validationBaselineDigest: manifest?.validationBaseline?.digest ?? ALPHA_STATUS.validationBaselineDigest,
    localAcceptanceDigest: manifest?.classicalPlannerNotebook?.localAcceptanceDigest ?? ALPHA_STATUS.localAcceptanceDigest,
    googleColabHostingSmoke: manifest?.classicalPlannerNotebook?.googleColabHostingSmoke ?? ALPHA_STATUS.googleColabHostingSmoke
  };
}

export async function loadAlphaReleaseManifest(options = {}) {
  const path = options.path ?? 'alpha/release-manifest.json';
  const response = await (options.fetch ?? globalThis.fetch)(path, { cache: 'no-store' });
  if (!response?.ok) throw new Error(`Failed to load Alpha release manifest: ${response?.status ?? 'no response'}`);
  return response.json();
}

export function buildAlphaDiagnosticBundle({
  releaseManifest = null,
  feedback = {},
  error = null,
  appState = null,
  route = null,
  runtimeShell = null,
  debug = {},
  browser = {}
} = {}) {
  const release = alphaReleaseSummary(releaseManifest);
  const safeContext = sanitizePublicContext({
    runtimeShell: runtimeShell ?? debug.runtimeShell ?? globalThis.ANCHOR_RUNTIME_SHELL_DEBUG?.resolvedRuntimeShell ?? 'default',
    route: route ?? debug.route ?? routeFromDocument(),
    browser: {
      userAgent: browser.userAgent ?? globalThis.navigator?.userAgent ?? null,
      platform: browser.platform ?? globalThis.navigator?.platform ?? null,
      viewport: browser.viewport ?? viewportSummary(),
      devicePixelRatio: browser.devicePixelRatio ?? globalThis.devicePixelRatio ?? null
    },
    scenario: {
      scenarioId: appState?.currentScenario?.levelId ?? appState?.level?.levelId ?? appState?.level?.id ?? null,
      missionId: appState?.currentScenario?.missionId ?? appState?.mission?.missionId ?? appState?.mission?.id ?? null,
      source: appState?.currentScenario?.source ?? null
    },
    identities: {
      environmentDigest: appState?.level?.environmentArtifact?.artifactDigest ?? appState?.level?.environmentDigest ?? appState?.level?.meta?.environmentDigest ?? null,
      planDigest: debug.planDigest ?? globalThis.ANCHOR_EXECUTION_DEBUG?.enginePlanDigest ?? globalThis.ANCHOR_EXECUTION_DEBUG?.launchPlanDigest ?? null,
      resultDigest: debug.resultDigest ?? globalThis.ANCHOR_EXECUTION_DEBUG?.resultDigest ?? appState?.result?.resultDigest ?? null,
      scoreResultDigest: debug.scoreResultDigest ?? appState?.result?.scoreResult?.resultDigest ?? null,
      validationBaselineDigest: release.validationBaselineDigest
    },
    resources: resourceSummary(debug),
    warnings: collectStructuredWarnings(debug)
  });
  const bundle = {
    artifactType: 'anchor.alpha-diagnostic-bundle',
    artifactVersion: '1.0.0',
    release,
    safeContext,
    feedback: sanitizeFeedback(feedback),
    error: sanitizeError(error),
    privacy: {
      hiddenTruthIncluded: false,
      oracleFieldsIncluded: false,
      localAbsolutePathsIncluded: false,
      importedFileContentsIncluded: false,
      personalIdentifiersIncluded: false,
      automaticallyTransmitted: false
    }
  };
  const withoutDigest = { ...bundle };
  delete withoutDigest.diagnosticDigest;
  bundle.diagnosticDigest = canonicalJsonDigest(withoutDigest);
  return bundle;
}

export function buildAlphaFeedbackSummary(bundle) {
  const feedback = bundle?.feedback ?? {};
  const release = bundle?.release ?? {};
  const context = bundle?.safeContext ?? {};
  return [
    `ANCHOR Alpha feedback: ${feedback.title || 'Untitled'}`,
    `Category: ${feedback.category || 'Unspecified'}`,
    `Severity: ${feedback.severity || 'Unspecified'}`,
    `Release: ${release.releaseId || ALPHA_RELEASE_ID} ${release.releaseVersion || ALPHA_RELEASE_VERSION}`,
    `Route: ${context.route || 'unknown'}`,
    `Scenario: ${context.scenario?.scenarioId || 'none'}`,
    `Mission: ${context.scenario?.missionId || 'none'}`,
    `Validation baseline: ${context.identities?.validationBaselineDigest || ALPHA_STATUS.validationBaselineDigest}`,
    `Google Colab hosting smoke: ${release.googleColabHostingSmoke || ALPHA_STATUS.googleColabHostingSmoke}`,
    '',
    'Observed behavior:',
    feedback.observedBehavior || '',
    '',
    'Expected behavior:',
    feedback.expectedBehavior || '',
    '',
    'Reproduction steps:',
    feedback.reproductionSteps || ''
  ].join('\n');
}

export function alphaReleaseDebugPayload(state = {}) {
  return {
    type: 'anchor.alpha.debug',
    version: ALPHA_RELEASE_MODULE_VERSION,
    releaseId: ALPHA_RELEASE_ID,
    releaseVersion: ALPHA_RELEASE_VERSION,
    positioning: ALPHA_POSITIONING,
    tagline: ALPHA_TAGLINE,
    onboardingVisible: Boolean(state.onboardingVisible),
    activeAlphaView: state.activeAlphaView ?? null,
    limitationCount: ALPHA_LIMITATIONS.length,
    scenarioCount: ALPHA_SCENARIO_CATALOG.length,
    localPythonExecution: ALPHA_STATUS.localPythonExecution,
    authoritativeAnchorFinalization: ALPHA_STATUS.authoritativeAnchorFinalization,
    googleColabHostingSmoke: ALPHA_STATUS.googleColabHostingSmoke,
    hiddenTruthExposed: false,
    changesScienceModels: false,
    changesScoring: false,
    addsPlanner: false,
    automaticTelemetry: false
  };
}

function limitation(id, label, status, detail, doc) {
  return Object.freeze({ id, label, status, detail, doc });
}

function catalogEntry(scenarioId, label, audience, estimatedDurationMinutes, difficulty, multiGlider, requiresDiveProfiles, requiresDynamicCurrents, supportsNotebookRoundTrip, levelOrMissionId, environmentDigest) {
  return Object.freeze({
    scenarioId,
    label,
    audience,
    learningObjectives: [],
    researchObjectives: [],
    estimatedDurationMinutes,
    difficulty,
    deterministic: true,
    multiGlider,
    requiresDiveProfiles,
    requiresDynamicCurrents,
    supportsNotebookRoundTrip,
    levelOrMissionId,
    environmentDigest,
    validationStatus: 'SUPPORTED_WITH_LIMITATIONS'
  });
}

function sanitizeFeedback(feedback = {}) {
  return {
    category: pickString(feedback.category, 80),
    severity: pickString(feedback.severity, 80),
    title: pickString(feedback.title, 180),
    observedBehavior: pickString(feedback.observedBehavior, 4000),
    expectedBehavior: pickString(feedback.expectedBehavior, 4000),
    reproductionSteps: pickString(feedback.reproductionSteps, 4000),
    optionalNotes: pickString(feedback.optionalNotes, 4000)
  };
}

function sanitizeError(error = null) {
  if (!error) return null;
  return {
    name: pickString(error.name ?? 'Error', 120),
    message: removeLocalPaths(pickString(error.message ?? error, 1000)),
    code: pickString(error.code, 120),
    route: pickString(error.route, 120)
  };
}

function sanitizePublicContext(context) {
  return JSON.parse(JSON.stringify(context, (key, value) => {
    if (/hidden|truth|oracle|cookie|localStorage|clipboard|history|fileContent/i.test(key)) return undefined;
    if (typeof value === 'string') return removeLocalPaths(value);
    return value;
  }));
}

function collectStructuredWarnings(debug = {}) {
  const warnings = [];
  for (const source of [
    debug.warning,
    globalThis.ANCHOR_APP_BOOT_DEBUG?.warning,
    globalThis.ANCHOR_MISSION_RENDER_DEBUG?.failureReason,
    globalThis.ANCHOR_EXECUTION_DEBUG?.failureReason,
    globalThis.ANCHOR_SCENE_ISOLATION_DEBUG?.failureReason
  ]) {
    if (source) warnings.push(pickString(source, 500));
  }
  return [...new Set(warnings)].slice(0, 12);
}

function resourceSummary(debug = {}) {
  const rendererSummary = globalThis.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary ?? {};
  return {
    activeRendererCount: Number(debug.activeRendererCount ?? rendererSummary.activeRendererCount ?? globalThis.ANCHOR_SCENE_ISOLATION_DEBUG?.threeMissionRendererCount ?? 0),
    activeRafCount: Number(debug.activeRafCount ?? rendererSummary.activeRafCount ?? globalThis.ANCHOR_SCENE_ISOLATION_DEBUG?.threeAnimationLoopCount ?? 0),
    canvasCount: Number(debug.canvasCount ?? globalThis.document?.querySelectorAll?.('canvas')?.length ?? 0),
    qualityProfile: globalThis.ANCHOR_MISSION_RENDER_DEBUG?.qualityProfile ?? globalThis.ANCHOR_SIMULATION_RENDER_DEBUG?.qualityProfile ?? 'unknown'
  };
}

function routeFromDocument() {
  return globalThis.document?.querySelector?.('#main-menu-hub') ? 'productHub' : (globalThis.anchorGame?.state?.mode ?? 'unknown');
}

function viewportSummary() {
  return {
    width: globalThis.innerWidth ?? null,
    height: globalThis.innerHeight ?? null
  };
}

function pickString(value, maxLength) {
  const text = String(value ?? '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function removeLocalPaths(text) {
  return String(text ?? '')
    .replace(/[A-Za-z]:\\[^\s"'<>]+/g, '[local-path]')
    .replace(/\/Users\/[^\s"'<>]+/g, '[local-path]');
}
