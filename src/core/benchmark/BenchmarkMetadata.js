import {
  BENCHMARK_MODE_CONTRACT_VERSION,
  BENCHMARK_MODE_IDS,
  createBenchmarkModeConfig
} from './BenchmarkModeContract.js';
import { normalizeBenchmarkAttemptSource } from './BenchmarkEpisodeContract.js';

export const BENCHMARK_METADATA_VERSION = 'benchmark-metadata-p1';

export function attachBenchmarkMetadataToLevel(level, benchmarkConfig = {}) {
  const clone = cloneJson(level ?? {});
  clone.meta ??= {};
  clone.meta.benchmarkMetadata = normalizeBenchmarkMetadata(benchmarkConfig);
  return clone;
}

export function attachBenchmarkMetadataToMission(mission, benchmarkConfig = {}) {
  const clone = cloneJson(mission ?? {});
  clone.meta ??= {};
  clone.meta.benchmarkMetadata = normalizeBenchmarkMetadata(benchmarkConfig);
  return clone;
}

export function attachBenchmarkMetadataToPlan(plan, attemptContext = {}) {
  const clone = cloneJson(plan ?? {});
  clone.meta ??= {};
  clone.meta.benchmarkMetadata = normalizeBenchmarkMetadata(attemptContext);
  return clone;
}

export function attachBenchmarkMetadataToResult(result, runRecord = {}) {
  const clone = cloneJson(result ?? {});
  clone.benchmarkMetadata = normalizeBenchmarkMetadata({
    ...runRecord,
    benchmarkMode: runRecord.benchmarkMode,
    informationAccessTier: runRecord.informationAccessTier,
    objectiveAuthority: runRecord.objectiveAuthority,
    routeAuthority: runRecord.routeAuthority,
    fairnessLabel: runRecord.fairnessLabel,
    worldModelTier: runRecord.worldModelTier
  });
  clone.benchmarkRunRecord = cloneJson(runRecord ?? null);
  return clone;
}

export function extractBenchmarkMetadata(source) {
  if (!source || typeof source !== 'object') return null;
  return source.benchmarkMetadata
    ?? source.meta?.benchmarkMetadata
    ?? source.benchmark?.metadata
    ?? source.result?.benchmarkMetadata
    ?? source.plan?.meta?.benchmarkMetadata
    ?? source.mission?.meta?.benchmarkMetadata
    ?? source.level?.meta?.benchmarkMetadata
    ?? null;
}

export function validateBenchmarkMetadata(metadata = {}) {
  const errors = [];
  if (!metadata || typeof metadata !== 'object') errors.push('Benchmark metadata must be an object.');
  if (!BENCHMARK_MODE_IDS.includes(metadata?.benchmarkMode)) errors.push(`Unknown benchmarkMode: ${metadata?.benchmarkMode ?? 'missing'}`);
  if (!metadata?.benchmarkModeConfigVersion) errors.push('benchmarkModeConfigVersion is required.');
  if (!metadata?.informationAccessTier) errors.push('informationAccessTier is required.');
  if (!metadata?.objectiveAuthority) errors.push('objectiveAuthority is required.');
  if (!metadata?.routeAuthority) errors.push('routeAuthority is required.');
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}

function normalizeBenchmarkMetadata(source = {}) {
  const config = createBenchmarkModeConfig(source.benchmarkModeConfig ?? source);
  return {
    benchmarkMode: config.benchmarkMode,
    benchmarkModeConfigVersion: config.version ?? BENCHMARK_MODE_CONTRACT_VERSION,
    episodeId: stringOrNull(source.episodeId),
    informationAccessTier: source.informationAccessTier ?? config.informationAccessTier,
    objectiveAuthority: source.objectiveAuthority ?? config.objectiveAuthority,
    routeAuthority: source.routeAuthority ?? config.routeAuthority,
    fairnessLabel: source.fairnessLabel ?? config.fairnessLabel,
    attemptSource: source.attemptSource == null ? null : normalizeBenchmarkAttemptSource(source.attemptSource),
    worldModelTier: source.worldModelTier ?? config.worldModelTier,
    metadataVersion: BENCHMARK_METADATA_VERSION
  };
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
