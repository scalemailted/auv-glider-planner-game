import fs from 'node:fs';
import path from 'node:path';

import { createHeadlessBundleManifest as createH0HeadlessBundleManifest } from '../HeadlessBundleManifest.js';
import { HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE } from '../HeadlessRoundtripTypes.js';
import { buildReplayArtifactsFromEpisode } from '../../replay/ReplayContractBuilder.js';

const VISIBLE_FIELD_IDS = Object.freeze(['E_forecast', 'mu_belief', 'U_uncertainty', 'P_unknown', 'A_global', 'F_u', 'F_v', 'hazard', 'constraintMask', 'staleness', 'boundaryStrength']);
const HIDDEN_FIELD_IDS = Object.freeze(['T_hiddenTruth']);

export function createHeadlessBundleManifest(episode, options = {}) {
  const includeHidden = options.includeHiddenTruth !== false;
  const combinedJson = options.combinedJson === true;
  const roundtripReport = options.roundtripReport ?? episode?.roundtripReport ?? null;
  const hasScienceDiagnostics = Boolean(episode?.scienceDiagnostics);
  const hasWaterColumnSummary = Boolean(episode?.waterColumnSummary);
  const hasDepthScienceSummary = Boolean(episode?.depthScienceSummary);
  const hasDepthScienceEvents = Boolean(episode?.depthScienceScoreEvents?.length);
  const hasDepthLayerPriority = Boolean(episode?.depthLayerPriority);
  const hasMotionTrajectory = Boolean(episode?.motionTrajectory);
  const hasMotionDiagnostics = Boolean(episode?.motionDiagnostics ?? episode?.motionTrajectory?.motionDiagnostics);
  const hasMissionFeasibilityReport = Boolean(episode?.missionFeasibilityReport);
  const hasMotionCostGraph = Boolean(episode?.motionCostGraph);
  const hasMotionCostMatrix = Boolean(episode?.motionCostMatrix);
  const hasMissionOutcomeReport = Boolean(episode?.missionOutcomeReport);
  const hasMissionScore = Boolean(episode?.missionScore);
  const hasMissionOutcomeMetrics = Boolean(episode?.missionOutcomeMetrics);
  const hasScoreProfile = Boolean(episode?.scoreProfileSummary);
  const hasRegretReport = Boolean(episode?.regretReport);
  const hasBathymetrySummary = Boolean(episode?.bathymetrySummary ?? episode?.fieldPackBefore?.bathymetrySummary ?? episode?.fieldPackAfter?.bathymetrySummary);
  const replayArtifacts = buildReplayArtifactsFromEpisode(episode, replayOptions(options, includeHidden));
  const hasReplayR1 = Boolean(replayArtifacts?.manifest && replayArtifacts?.events && replayArtifacts?.checkpoints);
  const hasMissionGeometrySummary = Boolean(episode?.missionGeometrySummary);
  const combinedBundleType = roundtripReport ? HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE : 'anchor.headless.bundle';
  const files = [
    fileEntry('manifest.json', 'manifest', 'anchor.headless.manifest', 'publicScenario', 'Bundle manifest.'),
    fileEntry('mission_config.json', 'missionConfig', 'anchor.headless.mission-config', 'publicScenario', 'Mission config used by the Node headless runtime.'),
    fileEntry('visible_fields.json', 'visibleFields', 'anchor.headless.field-pack', 'publicScenario', 'Forecast, belief, uncertainty, priority, flow, hazard, mask, and staleness fields.'),
    fileEntry('observations.json', 'observations', 'anchor.headless.observations', 'publicScenario', 'Noisy observations sampled along the provided waypoint route.'),
    fileEntry('observations.csv', 'observations', 'anchor.headless.observations', 'publicScenario', 'CSV observation table.'),
    fileEntry('glider_tracks.json', 'gliderTracks', 'anchor.headless.trajectory', 'publicScenario', 'Waypoint execution track points.'),
    fileEntry('glider_tracks.csv', 'gliderTracks', 'anchor.headless.trajectory', 'publicScenario', 'CSV glider track table.'),
    fileEntry('score_report.json', 'scoreReport', 'anchor.headless.score-report', 'publicScenario', 'Educational Node headless score report.'),
    fileEntry('replay.json', 'replay', 'anchor.headless.replay', 'publicScenario', 'Legacy lightweight replay path and observation references.'),
    ...(hasReplayR1 ? [
      fileEntry('replay_manifest.json', 'replayManifest', 'anchor.headless.replay-manifest', 'publicScenario', 'REPLAY-R1 deterministic replay manifest and compatibility contract.'),
      fileEntry('replay_events.json', 'replayEvents', 'anchor.headless.replay-events', 'publicScenario', 'REPLAY-R1 canonical ordered public command/event stream.'),
      fileEntry('replay_checkpoints.json', 'replayCheckpoints', 'anchor.headless.replay-checkpoints', 'publicScenario', 'REPLAY-R1 public replay checkpoints and stable public-state digests.'),
      fileEntry('replay_alignment_report.json', 'replayAlignmentReport', 'anchor.headless.replay-alignment-report', 'publicScenario', 'REPLAY-R1 replay alignment status and first-divergence report.')
    ] : []),
    fileEntry('episode.json', 'benchmarkRecords', 'anchor.headless.benchmark-episode', 'publicScenario', 'Complete H1 headless episode artifact.')
  ];
  if (hasScienceDiagnostics) {
    files.splice(7, 0, fileEntry('science_diagnostics.json', 'scienceDiagnostics', 'anchor.headless.science-diagnostics', 'publicScenario', 'Compact P9 public-safe forecast-correction and hidden-event hypothesis diagnostics.'));
  }
  if (hasWaterColumnSummary) {
    files.splice(8, 0, fileEntry('water_column_summary.json', 'waterColumnSummary', 'anchor.headless.water-column-summary', 'publicScenario', 'P11 public-safe 2.5D depth-layer sampling summary.'));
  }
  if (hasDepthLayerPriority) {
    files.splice(9, 0, fileEntry('depth_layer_priority.json', 'depthLayerPriority', 'anchor.headless.depth-layer-priority', 'publicScenario', 'P11 public-safe depth-layer A_global priority and top-down collapse.'));
  }
  if (hasDepthScienceSummary) files.push(fileEntry('depth_science_summary.json', 'depthScienceSummary', 'anchor.science.depth-aware-score-summary', 'publicScenario', 'THREE-R1.2A.2 public-safe actual-depth science score summary.'));
  if (hasDepthScienceEvents) files.push(fileEntry('depth_science_score_events.json', 'depthScienceScoreEvents', 'anchor.score.depth-aware-sample', 'publicScenario', 'THREE-R1.2A.2 canonical actual-observation science score events.'));
  if (hasBathymetrySummary) {
    files.push(fileEntry('bathymetry_summary.json', 'bathymetrySummary', 'anchor.headless.bathymetry-summary', 'publicScenario', 'ENV-R1 public-safe environmental bathymetry summary.'));
  }
  if (hasMissionGeometrySummary) {
    files.push(fileEntry('mission_geometry_summary.json', 'missionGeometrySummary', 'anchor.headless.mission-geometry-summary', 'publicScenario', 'ENV-R1 public-safe route/sample/depth-layer geometry counts.'));
  }
  if (hasMotionTrajectory) {
    files.push(fileEntry('motion_trajectory.json', 'motionTrajectory', 'anchor.motion.trajectory', 'publicScenario', 'MOTION-R1 planned-vs-realized motion trajectory.'));
    files.push(fileEntry('control_trace.json', 'controlTrace', 'anchor.motion.control-trace', 'publicScenario', 'MOTION-R1 controls adapted from provided waypoint intent; not a generated route.'));
  }
  if (hasMotionDiagnostics) {
    files.push(fileEntry('motion_diagnostics.json', 'motionDiagnostics', 'anchor.motion.diagnostics', 'publicScenario', 'MOTION-R1 motion diagnostics and planned-vs-realized summary.'));
  }
  if (hasMissionFeasibilityReport) {
    files.push(fileEntry('mission_feasibility_report.json', 'missionFeasibilityReport', 'anchor.benchmark.mission-feasibility-report', 'publicScenario', 'MOTION-R1 educational mission feasibility diagnostics; not official browser scoring.'));
  }
  if (hasMotionCostGraph) {
    files.push(fileEntry('motion_cost_graph.json', 'motionCostGraph', 'anchor.benchmark.feasibility-cost-graph', 'publicScenario', 'SIM-R1 public-safe directed motion cost graph; not a route planner or official scoring.'));
  }
  if (hasMotionCostMatrix) {
    files.push(fileEntry('motion_cost_matrix.json', 'motionCostMatrix', 'anchor.headless.motion-cost-matrix', 'publicScenario', 'SIM-R1 adjacency/cost matrix derived from the motion cost graph.'));
  }
  if (hasScoreProfile) files.push(fileEntry('score_profile.json', 'scoreProfile', 'anchor.benchmark.score-profile', 'publicScenario', 'SCORE-R1 objective-aware score profile summary.'));
  if (hasMissionOutcomeMetrics) files.push(fileEntry('mission_outcome_metrics.json', 'missionOutcomeMetrics', 'anchor.benchmark.mission-outcome-metrics', 'publicScenario', 'SCORE-R1 normalized source metrics for shadow benchmark scoring.'));
  if (hasMissionScore) files.push(fileEntry('mission_score.json', 'missionScore', 'anchor.benchmark.mission-score', 'publicScenario', 'SCORE-R1 shadow benchmark mission score.'));
  if (hasMissionOutcomeReport) files.push(fileEntry('mission_outcome_report.json', 'missionOutcomeReport', 'anchor.benchmark.mission-outcome-report', 'publicScenario', 'SCORE-R1 mission outcome scorecard report.'));
  if (hasRegretReport) files.push(fileEntry('regret_report.json', 'regretReport', 'anchor.benchmark.regret-report', 'publicScenario', 'SCORE-R1 compatible-reference regret report.'));
  if (includeHidden) {
    files.splice(3, 0, fileEntry('hidden_fields.json', 'hiddenFields', 'anchor.headless.field-pack', 'hiddenTruth', 'Hidden truth and oracle-only fields for instructor/debug use.'));
  }
  if (combinedJson) {
    files.push(fileEntry('bundle.json', 'combinedBundle', combinedBundleType, 'publicScenario', roundtripReport ? 'Single-file H3.1 solver roundtrip browser import bundle.' : 'Single-file H2 browser import bundle.'));
  }
  if (options.roundtripReport || episode?.roundtripReport) {
    files.push(fileEntry('roundtrip_report.json', 'roundtripReport', HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'publicScenario', 'H3.1 solver-packet / plan / headless-bundle roundtrip report.'));
  }

  const jsonFiles = ['mission_config.json', 'score_report.json', 'replay.json', ...(hasReplayR1 ? ['replay_manifest.json', 'replay_events.json', 'replay_checkpoints.json', 'replay_alignment_report.json'] : []), 'episode.json'];
  if (hasScienceDiagnostics) jsonFiles.push('science_diagnostics.json');
  if (hasWaterColumnSummary) jsonFiles.push('water_column_summary.json');
  if (hasDepthLayerPriority) jsonFiles.push('depth_layer_priority.json');
  if (hasDepthScienceSummary) jsonFiles.push('depth_science_summary.json');
  if (hasDepthScienceEvents) jsonFiles.push('depth_science_score_events.json');
  if (hasMotionTrajectory) jsonFiles.push('motion_trajectory.json', 'control_trace.json');
  if (hasMotionDiagnostics) jsonFiles.push('motion_diagnostics.json');
  if (hasMissionFeasibilityReport) jsonFiles.push('mission_feasibility_report.json');
  if (hasMotionCostGraph) jsonFiles.push('motion_cost_graph.json');
  if (hasMotionCostMatrix) jsonFiles.push('motion_cost_matrix.json');
  if (hasScoreProfile) jsonFiles.push('score_profile.json');
  if (hasMissionOutcomeMetrics) jsonFiles.push('mission_outcome_metrics.json');
  if (hasMissionScore) jsonFiles.push('mission_score.json');
  if (hasMissionOutcomeReport) jsonFiles.push('mission_outcome_report.json');
  if (hasRegretReport) jsonFiles.push('regret_report.json');
  if (hasBathymetrySummary) jsonFiles.push('bathymetry_summary.json');
  if (hasMissionGeometrySummary) jsonFiles.push('mission_geometry_summary.json');
  if (combinedJson) jsonFiles.push('bundle.json');
  if (options.roundtripReport || episode?.roundtripReport) jsonFiles.push('roundtrip_report.json');

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
      'P9 science diagnostics are public-safe educational heuristics and do not embed hidden truth fields.',
      'H1/H2/H3/P9 do not implement Python OceanBox, a new planner, MARL/RL, production data assimilation, or calibrated ocean forecasting.'
    ]
  });
}

export function headlessBundleFiles(episode, options = {}) {
  const includeHidden = options.includeHiddenTruth !== false;
  const combinedJson = options.combinedJson === true;
  const roundtripReport = options.roundtripReport ?? episode?.roundtripReport ?? null;
  const manifest = createHeadlessBundleManifest(episode, { includeHiddenTruth: includeHidden, combinedJson, createdAt: options.createdAt, roundtripReport });
  const publicObservations = includeHidden ? (episode.observations ?? []) : (episode.observations ?? []).map(publicObservation);
  const replayArtifacts = buildReplayArtifactsFromEpisode(episode, replayOptions(options, includeHidden));
  const files = {
    'manifest.json': stableJson(manifest),
    'mission_config.json': stableJson(includeHidden ? episode.missionConfig : publicMissionConfig(episode.missionConfig)),
    'visible_fields.json': stableJson(buildFieldPackFile(episode.fieldPackAfter ?? episode.fieldPackBefore, VISIBLE_FIELD_IDS, 'publicScenario')),
    'observations.json': stableJson({ type: 'anchor.headless.observations', version: 'headless-runtime-observations-h1', observations: publicObservations }),
    'observations.csv': observationsCsv(publicObservations),
    'glider_tracks.json': stableJson({ type: 'anchor.headless.trajectory', version: 'headless-runtime-tracks-h1', tracks: episode.tracks ?? [] }),
    'glider_tracks.csv': tracksCsv(episode.tracks ?? []),
    ...(episode.motionTrajectory ? { 'motion_trajectory.json': stableJson(publicMotionTrajectory(episode.motionTrajectory)) } : {}),
    ...(episode.motionTrajectory ? { 'control_trace.json': stableJson({ type: 'anchor.motion.control-trace', version: episode.motionTrajectory.version, planId: episode.motionTrajectory.planId, gliderId: episode.motionTrajectory.gliderId, controls: episode.controlTrace ?? episode.motionTrajectory.controlCommands ?? [], generatedRoute: false, usesNewPlanner: false }) } : {}),
    ...(episode.motionDiagnostics || episode.motionTrajectory?.motionDiagnostics ? { 'motion_diagnostics.json': stableJson(episode.motionDiagnostics ?? episode.motionTrajectory.motionDiagnostics) } : {}),
    ...(episode.missionFeasibilityReport ? { 'mission_feasibility_report.json': stableJson(episode.missionFeasibilityReport) } : {}),
    ...(episode.motionCostGraph ? { 'motion_cost_graph.json': stableJson(episode.motionCostGraph) } : {}),
    ...(episode.motionCostMatrix ? { 'motion_cost_matrix.json': stableJson(episode.motionCostMatrix) } : {}),
    ...(episode.scoreProfileSummary ? { 'score_profile.json': stableJson(episode.scoreProfileSummary) } : {}),
    ...(episode.missionOutcomeMetrics ? { 'mission_outcome_metrics.json': stableJson(episode.missionOutcomeMetrics) } : {}),
    ...(episode.missionScore ? { 'mission_score.json': stableJson(episode.missionScore) } : {}),
    ...(episode.missionOutcomeReport ? { 'mission_outcome_report.json': stableJson(episode.missionOutcomeReport) } : {}),
    ...(episode.regretReport ? { 'regret_report.json': stableJson(episode.regretReport) } : {}),
    'score_report.json': stableJson(episode.scoreReport),
    ...(episode.scienceDiagnostics ? { 'science_diagnostics.json': stableJson(episode.scienceDiagnostics) } : {}),
    ...(episode.waterColumnSummary ? { 'water_column_summary.json': stableJson(episode.waterColumnSummary) } : {}),
    ...(episode.depthScienceSummary ? { 'depth_science_summary.json': stableJson(episode.depthScienceSummary) } : {}),
    ...(episode.depthScienceScoreEvents?.length ? { 'depth_science_score_events.json': stableJson({ type: 'anchor.score.depth-aware-sample-events', version: 'depth-aware-science-value-three-r1-2a-2', events: episode.depthScienceScoreEvents }) } : {}),
    ...(episode.bathymetrySummary || episode.fieldPackBefore?.bathymetrySummary || episode.fieldPackAfter?.bathymetrySummary ? { 'bathymetry_summary.json': stableJson(episode.bathymetrySummary ?? episode.fieldPackBefore?.bathymetrySummary ?? episode.fieldPackAfter?.bathymetrySummary) } : {}),
    ...(episode.missionGeometrySummary ? { 'mission_geometry_summary.json': stableJson(episode.missionGeometrySummary) } : {}),
    ...(episode.depthLayerPriority ? { 'depth_layer_priority.json': stableJson(episode.depthLayerPriority) } : {}),
    'replay.json': stableJson(episode.replay),
    'replay_manifest.json': stableJson(replayArtifacts.manifest),
    'replay_events.json': stableJson(replayArtifacts.events),
    'replay_checkpoints.json': stableJson(replayArtifacts.checkpoints),
    'replay_alignment_report.json': stableJson(replayArtifacts.alignmentReport),
    'episode.json': stableJson(stripBundleEpisode(episode, includeHidden))
  };
  if (includeHidden) {
    files['hidden_fields.json'] = stableJson(buildFieldPackFile(episode.fieldPackBefore, HIDDEN_FIELD_IDS, 'hiddenTruth'));
  }
  if (roundtripReport) {
    files['roundtrip_report.json'] = stableJson(roundtripReport);
  }
  if (combinedJson) {
    files['bundle.json'] = stableJson(createHeadlessCombinedBundle(episode, { includeHiddenTruth: includeHidden, createdAt: options.createdAt, roundtripReport, checkpointEvery: options.checkpointEvery ?? options.checkpointEveryTicks, publicPlayback: options.publicPlayback, refereeReplay: options.refereeReplay, authoritativeReplay: options.authoritativeReplay, objectiveSequence: options.objectiveSequence, useDemoObjectiveSequence: options.useDemoObjectiveSequence }));
  }
  return files;
}

export function createHeadlessCombinedBundle(episode, options = {}) {
  const includeHidden = options.includeHiddenTruth !== false;
  const roundtripReport = options.roundtripReport ?? episode.roundtripReport ?? null;
  const manifest = createHeadlessBundleManifest(episode, { includeHiddenTruth: includeHidden, combinedJson: true, createdAt: options.createdAt, roundtripReport });
  const publicObservations = includeHidden ? (episode.observations ?? []) : (episode.observations ?? []).map(publicObservation);
  const replayArtifacts = buildReplayArtifactsFromEpisode(episode, replayOptions(options, includeHidden));
  const bundle = {
    type: roundtripReport ? HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE : 'anchor.headless.bundle',
    version: roundtripReport ? 'headless-solver-roundtrip-bundle-h3.1' : 'headless-combined-bundle-h2',
    manifest,
    missionConfig: includeHidden ? episode.missionConfig : publicMissionConfig(episode.missionConfig),
    visibleFields: buildFieldPackFile(episode.fieldPackAfter ?? episode.fieldPackBefore, VISIBLE_FIELD_IDS, 'publicScenario'),
    observations: publicObservations,
    gliderTracks: episode.tracks ?? [],
    motionTrajectory: episode.motionTrajectory ? publicMotionTrajectory(episode.motionTrajectory) : null,
    controlTrace: episode.controlTrace ?? episode.motionTrajectory?.controlCommands ?? [],
    motionDiagnostics: episode.motionDiagnostics ?? episode.motionTrajectory?.motionDiagnostics ?? null,
    missionFeasibilityReport: episode.missionFeasibilityReport ?? null,
    missionFeasibilitySummary: episode.missionFeasibilitySummary ?? episode.diagnostics?.missionFeasibilitySummary ?? null,
    motionCostGraph: episode.motionCostGraph ?? null,
    motionCostMatrix: episode.motionCostMatrix ?? null,
    motionCostGraphSummary: episode.motionCostGraphSummary ?? episode.diagnostics?.motionCostGraphSummary ?? null,
    motionCostMatrixSummary: episode.motionCostMatrixSummary ?? episode.diagnostics?.motionCostMatrixSummary ?? null,
    scoreProfileSummary: episode.scoreProfileSummary ?? null,
    missionOutcomeMetrics: episode.missionOutcomeMetrics ?? null,
    missionScore: episode.missionScore ?? null,
    missionOutcomeReport: episode.missionOutcomeReport ?? null,
    regretReport: episode.regretReport ?? null,
    scoreReport: episode.scoreReport,
    scienceDiagnostics: episode.scienceDiagnostics ?? null,
    waterColumnSummary: episode.waterColumnSummary ?? null,
    depthScienceSummary: episode.depthScienceSummary ?? null,
    depthScienceScoreEvents: episode.depthScienceScoreEvents ?? [],
    bathymetrySummary: episode.bathymetrySummary ?? episode.fieldPackBefore?.bathymetrySummary ?? episode.fieldPackAfter?.bathymetrySummary ?? null,
    missionGeometrySummary: episode.missionGeometrySummary ?? null,
    depthLayerPrioritySummary: episode.depthLayerPriority?.summary ?? episode.depthLayerPrioritySummary ?? null,
    replay: episode.replay,
    replayManifest: replayArtifacts.manifest,
    replayEvents: replayArtifacts.events,
    replayCheckpoints: replayArtifacts.checkpoints,
    replayAlignmentReport: replayArtifacts.alignmentReport,
    replayContract: replayArtifacts.contract,
    roundtripReport,
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
    replayManifest: files.includes('replay_manifest.json'),
    replayEvents: files.includes('replay_events.json'),
    replayCheckpoints: files.includes('replay_checkpoints.json'),
    replayAlignmentReport: files.includes('replay_alignment_report.json'),
    finalScoreFile: files.includes('score_report.json'),
    scienceDiagnostics: files.includes('science_diagnostics.json'),
    waterColumnSummary: files.includes('water_column_summary.json'),
    bathymetrySummary: files.includes('bathymetry_summary.json'),
    missionGeometrySummary: files.includes('mission_geometry_summary.json'),
    depthLayerPriority: files.includes('depth_layer_priority.json'),
    motionTrajectory: files.includes('motion_trajectory.json'),
    motionDiagnostics: files.includes('motion_diagnostics.json'),
    missionFeasibilityReport: files.includes('mission_feasibility_report.json'),
    motionCostGraph: files.includes('motion_cost_graph.json'),
    motionCostMatrix: files.includes('motion_cost_matrix.json'),
    scoreProfile: files.includes('score_profile.json'),
    missionOutcomeMetrics: files.includes('mission_outcome_metrics.json'),
    missionScore: files.includes('mission_score.json'),
    missionOutcomeReport: files.includes('mission_outcome_report.json'),
    regretReport: files.includes('regret_report.json'),
    observationCsv: files.includes('observations.csv'),
    trackCsv: files.includes('glider_tracks.csv'),
    manifestNotes: manifest?.notes ?? []
  };
}

function replayOptions(options = {}, includeHidden = false) {
  return {
    checkpointEvery: options.checkpointEvery ?? options.checkpointEveryTicks,
    objectiveSequence: options.objectiveSequence,
    useDemoObjectiveSequence: options.useDemoObjectiveSequence === true,
    publicPlayback: options.publicPlayback !== false,
    refereeReplay: includeHidden === true && options.refereeReplay === true,
    authoritativeReplay: includeHidden === true && options.authoritativeReplay === true,
    seed: options.seed,
    timeStepSeconds: options.timeStepSeconds
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
    waterColumnConfig: fieldPack?.waterColumnConfig ?? fieldPack?.grid?.waterColumnConfig ?? null,
    notes: fieldPack?.notes ?? []
  };
}

function publicMissionConfig(missionConfig) {
  const copy = JSON.parse(JSON.stringify(missionConfig ?? null));
  if (!copy || typeof copy !== 'object') return copy;
  if (Array.isArray(copy.hiddenFields)) copy.hiddenFields = copy.hiddenFields.filter((id) => id !== 'T_hiddenTruth');
  if (copy.world && typeof copy.world === 'object') {
    if (Array.isArray(copy.world.fieldDescriptors)) {
      copy.world.fieldDescriptors = copy.world.fieldDescriptors.filter((descriptor) => descriptor?.id !== 'T_hiddenTruth' && descriptor?.canonicalId !== 'T_hiddenTruth');
    }
    if (Array.isArray(copy.world.fieldIds)) copy.world.fieldIds = copy.world.fieldIds.filter((id) => id !== 'T_hiddenTruth');
    if (Array.isArray(copy.world.fieldOrder)) copy.world.fieldOrder = copy.world.fieldOrder.filter((id) => id !== 'T_hiddenTruth');
    if (copy.world.fieldVisibility && typeof copy.world.fieldVisibility === 'object') delete copy.world.fieldVisibility.T_hiddenTruth;
  }
  return copy;
}
function publicMotionTrajectory(trajectory) {
  const copy = JSON.parse(JSON.stringify(trajectory ?? null));
  if (!copy || typeof copy !== 'object') return copy;
  copy.sampledObservations = Array.isArray(copy.sampledObservations)
    ? copy.sampledObservations.map(publicObservation)
    : [];
  return copy;
}

function publicObservation(observation) {
  const copy = JSON.parse(JSON.stringify(observation ?? {}));
  redactObservationPayload(copy);
  copy.visibilityTier = 'publicScenario';
  return copy;
}

function redactObservationPayload(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) redactObservationPayload(entry);
    return;
  }
  if (value.fieldId === 'T_hiddenTruth') value.fieldId = 'observedScalar';
  if (value.sourceFieldId === 'T_hiddenTruth') value.sourceFieldId = 'observedScalar';
  if (value.visibilityTier === 'hiddenTruth') value.visibilityTier = 'publicScenario';
  delete value.truthValue;
  delete value.hiddenTruth;
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') redactObservationPayload(child);
  }
}
function stripBundleEpisode(episode, includeHidden) {
  const copy = JSON.parse(JSON.stringify(episode));
  if (!includeHidden) {
    stripHiddenTruthFromFieldPack(copy.fieldPackBefore);
    stripHiddenTruthFromFieldPack(copy.fieldPackAfter);
    copy.missionConfig = publicMissionConfig(copy.missionConfig);
    if (Array.isArray(copy.observations)) copy.observations = copy.observations.map(publicObservation);
    if (Array.isArray(copy.schemaEpisode?.observations)) copy.schemaEpisode.observations = copy.schemaEpisode.observations.map(publicObservation);
    if (copy.motionTrajectory) copy.motionTrajectory = publicMotionTrajectory(copy.motionTrajectory);
  }
  return copy;
}

function stripHiddenTruthFromFieldPack(fieldPack) {
  if (!fieldPack) return;
  delete fieldPack.fields?.T_hiddenTruth;
  delete fieldPack.fieldVisibility?.T_hiddenTruth;
  delete fieldPack.diagnostics?.T_hiddenTruth;
  if (Array.isArray(fieldPack.fieldIds)) fieldPack.fieldIds = fieldPack.fieldIds.filter((id) => id !== 'T_hiddenTruth');
  if (Array.isArray(fieldPack.fieldOrder)) fieldPack.fieldOrder = fieldPack.fieldOrder.filter((id) => id !== 'T_hiddenTruth');
  if (Array.isArray(fieldPack.fieldDescriptors)) fieldPack.fieldDescriptors = fieldPack.fieldDescriptors.filter((descriptor) => descriptor?.id !== 'T_hiddenTruth' && descriptor?.canonicalId !== 'T_hiddenTruth');
}

function fileEntry(pathValue, role, schemaType, visibilityTier, description) {
  return { path: pathValue, role, schemaType, visibilityTier, description };
}

function observationsCsv(observations) {
  const columns = ['observationId', 'timeSeconds', 'gliderId', 'x', 'y', 'zIndex', 'depthLayer', 'depthLayerId', 'depthMeters', 'diveProfileId', 'truthValue', 'forecastValue', 'beliefValue', 'observedValue', 'sensorNoise', 'innovation', 'surprise'];
  return toCsv(columns, observations);
}

function tracksCsv(tracks) {
  const columns = ['timeSeconds', 'gliderId', 'x', 'y', 'zIndex', 'depthLayer', 'depthLayerId', 'diveProfileId', 'flowU', 'flowV', 'currentAssist', 'crossCurrent', 'energyUsedIncrement', 'hazard', 'constraintMask'];
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
