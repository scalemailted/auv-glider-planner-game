import { BENCHMARK_MODE_CONTRACT_VERSION, createBenchmarkModeConfig } from './BenchmarkModeContract.js';
import { createBenchmarkModeState } from './BenchmarkModeState.js';
import { MISSION_OBJECTIVE_TAXONOMY_VERSION } from './MissionObjectiveTaxonomy.js';
import { BENCHMARK_RUN_RECORD_VERSION } from './BenchmarkRunRecord.js';
import { createBenchmarkEpisodeConfig, BENCHMARK_EPISODE_CONTRACT_VERSION } from './BenchmarkEpisodeContract.js';
import {
  BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
  createRouteExecutionRecord
} from './BenchmarkRouteExecutionRecord.js';
import { BENCHMARK_ATTEMPT_SET_VERSION, createBenchmarkAttemptSet } from './BenchmarkAttemptRegistry.js';

export const BENCHMARK_MODE_CONFIG_EXPORT_TYPE = 'anchor.benchmark.mode-config';
export const BENCHMARK_MODE_CONFIG_EXPORT_VERSION = 'benchmark-mode-config-export-p0';
export const BENCHMARK_EPISODE_CONFIG_EXPORT_TYPE = 'anchor.benchmark.episode-config';
export const BENCHMARK_RUN_RECORD_EXPORT_TYPE = 'anchor.benchmark.run-record';
export const BENCHMARK_ROUTE_EXECUTION_EXPORT_TYPE = 'anchor.benchmark.route-execution';
export const BENCHMARK_ATTEMPT_SET_EXPORT_TYPE = 'anchor.benchmark.attempt-set';
export const BENCHMARK_P1_EXPORT_VERSION = 'benchmark-contract-export-p1';

export function buildBenchmarkModeConfigExport(options = {}) {
  const benchmarkModeConfig = createBenchmarkModeConfig(options);
  const state = createBenchmarkModeState(benchmarkModeConfig);
  return {
    type: BENCHMARK_MODE_CONFIG_EXPORT_TYPE,
    version: BENCHMARK_MODE_CONFIG_EXPORT_VERSION,
    benchmarkModeContractVersion: BENCHMARK_MODE_CONTRACT_VERSION,
    benchmarkModeConfig,
    objectiveTaxonomyVersion: MISSION_OBJECTIVE_TAXONOMY_VERSION,
    runRecordVersion: BENCHMARK_RUN_RECORD_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    implemented: benchmarkModeConfig.implemented,
    implementedSystems: state.implementedSystems,
    missingSystems: state.missingSystems,
    nextRequiredSystems: benchmarkModeConfig.nextRequiredSystems,
    visibleLayers: state.visibleLayers,
    exportFlags: state.exportFlags,
    debugFlags: state.debugFlags,
    boundaryFlags: {
      usesRoutePlanning: false,
      usesMissionScoring: false,
      usesMARL: false
    },
    notes: [
      'P0 defines benchmark architecture contracts only.',
      'P1 adds adapter-only route-execution records using existing planning, simulation, and debrief data.',
      'Route planning, mission scoring, and MARL/RL training are not implemented by this export.',
      ...(Array.isArray(options.notes) ? options.notes : [])
    ]
  };
}

export function buildBenchmarkEpisodeConfigExport(options = {}) {
  const episodeConfig = options.type === BENCHMARK_EPISODE_CONFIG_EXPORT_TYPE
    ? options
    : createBenchmarkEpisodeConfig(options);
  return {
    ...cloneJson(episodeConfig),
    exportVersion: BENCHMARK_P1_EXPORT_VERSION,
    episodeContractVersion: BENCHMARK_EPISODE_CONTRACT_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    notes: [
      ...(Array.isArray(episodeConfig.notes) ? episodeConfig.notes : []),
      'P1 episode config describes existing planning/simulation/debrief execution. It does not add a new planner.'
    ]
  };
}

export function buildBenchmarkRunRecordExport(runRecord = {}, options = {}) {
  return {
    type: BENCHMARK_RUN_RECORD_EXPORT_TYPE,
    version: BENCHMARK_P1_EXPORT_VERSION,
    runRecordVersion: BENCHMARK_RUN_RECORD_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    runRecord: cloneJson(runRecord),
    notes: normalizeNotes(options.notes)
  };
}

export function buildBenchmarkRouteExecutionExport(routeExecutionRecord = {}, options = {}) {
  const record = routeExecutionRecord?.type === BENCHMARK_ROUTE_EXECUTION_EXPORT_TYPE
    ? routeExecutionRecord
    : createRouteExecutionRecord(routeExecutionRecord);
  return {
    ...cloneJson(record),
    exportVersion: BENCHMARK_P1_EXPORT_VERSION,
    routeExecutionRecordVersion: BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString()
  };
}

export function buildBenchmarkAttemptSetExport(attemptSet = {}, options = {}) {
  const set = attemptSet?.type === BENCHMARK_ATTEMPT_SET_EXPORT_TYPE
    ? attemptSet
    : createBenchmarkAttemptSet(attemptSet);
  return {
    ...cloneJson(set),
    exportVersion: BENCHMARK_P1_EXPORT_VERSION,
    attemptSetVersion: BENCHMARK_ATTEMPT_SET_VERSION,
    createdAt: options.createdAt ?? set.createdAt ?? new Date().toISOString()
  };
}

export function benchmarkModeConfigFilename(config = {}) {
  const mode = createBenchmarkModeConfig(config).benchmarkMode;
  return `anchor-benchmark-mode-config-${mode}.json`;
}

export function benchmarkEpisodeConfigFilename(config = {}) {
  const mode = createBenchmarkEpisodeConfig(config).benchmarkMode;
  return `anchor-benchmark-episode-${mode}.json`;
}

function normalizeNotes(notes) {
  return Array.isArray(notes) ? notes.map((note) => String(note ?? '')).filter(Boolean) : [];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}