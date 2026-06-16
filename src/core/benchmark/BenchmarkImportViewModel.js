import {
  BENCHMARK_IMPORT_SUPPORTED_TYPES,
  normalizeImportedBenchmarkArtifact,
  validateBenchmarkArtifactCompatibility
} from './BenchmarkArtifactImport.js';

export const BENCHMARK_IMPORT_VIEW_MODEL_VERSION = 'benchmark-import-view-model-p5';

export function buildBenchmarkImportViewModel({ currentEpisode, currentSession, importedArtifacts, persistedSessions } = {}) {
  const current = normalizeCurrentEpisode(currentEpisode, currentSession);
  const artifacts = (Array.isArray(importedArtifacts) ? importedArtifacts : []).map((artifact, index) => {
    const normalized = artifact?.type === 'anchor.benchmark.imported-artifact' ? artifact : normalizeImportedBenchmarkArtifact(artifact);
    const compatibility = validateBenchmarkArtifactCompatibility({ artifact: normalized, currentEpisode: current });
    return {
      index,
      artifactType: normalized.artifactType,
      supported: normalized.supported,
      compatible: compatibility.compatible,
      referenceOnly: compatibility.referenceOnly,
      status: compatibility.status,
      episodeId: normalized.episodeId ?? 'not recorded',
      benchmarkMode: normalized.benchmarkMode ?? 'plannerBenchmark',
      attemptCount: normalized.attemptCount ?? 0,
      hasRouteGeometry: Boolean(normalized.hasRouteGeometry),
      warnings: [...(normalized.warnings ?? []), ...(compatibility.warnings ?? [])],
      errors: compatibility.errors ?? [],
      label: artifactLabel(normalized)
    };
  });
  const sessions = (Array.isArray(persistedSessions) ? persistedSessions : []).map((record, index) => ({
    index,
    episodeId: record.episodeId ?? record.session?.episodeId ?? 'unknown episode',
    benchmarkMode: record.benchmarkMode ?? record.session?.benchmarkMode ?? 'plannerBenchmark',
    savedAt: record.savedAt ?? record.updatedAt ?? null,
    attemptCount: record.attemptCount ?? record.session?.attempts?.length ?? 0,
    routeGeometryCount: record.routeGeometryCount ?? countRouteGeometry(record.session),
    currentEpisode: current.episodeId && (record.episodeId ?? record.session?.episodeId) === current.episodeId,
    compatible: (!current.episodeId || !record.episodeId || current.episodeId === record.episodeId)
      && (!current.benchmarkMode || !record.benchmarkMode || current.benchmarkMode === record.benchmarkMode)
  }));
  const compatibleImportCount = artifacts.filter((artifact) => artifact.compatible).length;
  const incompatibleImportCount = artifacts.filter((artifact) => !artifact.compatible).length;
  const warnings = uniqueStrings([
    ...artifacts.flatMap((artifact) => artifact.warnings),
    ...artifacts.flatMap((artifact) => artifact.errors),
    ...(artifacts.some((artifact) => artifact.referenceOnly) ? ['Some imported artifacts are reference-only for the current benchmark episode.'] : [])
  ]);
  return {
    version: BENCHMARK_IMPORT_VIEW_MODEL_VERSION,
    currentEpisode: current,
    currentSession: {
      episodeId: currentSession?.episodeId ?? current.episodeId ?? null,
      benchmarkMode: currentSession?.benchmarkMode ?? current.benchmarkMode ?? 'plannerBenchmark',
      attemptCount: currentSession?.attempts?.length ?? 0,
      routeGeometryCount: countRouteGeometry(currentSession)
    },
    importedArtifacts: artifacts,
    persistedSessions: sessions,
    importedArtifactCount: artifacts.length,
    compatibleImportCount,
    incompatibleImportCount,
    persistedSessionCount: sessions.length,
    supportedTypes: [...BENCHMARK_IMPORT_SUPPORTED_TYPES],
    canMergeCompatible: compatibleImportCount > 0,
    warnings,
    empty: !artifacts.length && !sessions.length,
    copy: {
      episodeBoundary: 'Imported benchmark artifacts are merged only when they match the current benchmark episode or are explicitly treated as reference-only.',
      scoreBoundary: 'P5 does not recompute scores. It compares metrics stored in the imported benchmark records.',
      persistenceBoundary: 'Local persistence stores compact attempt summaries and route geometry, not full hidden ocean fields.',
      sessionPurpose: 'Attempt sessions let you compare multiple plans for the same fixed benchmark objective.',
      importNoRerun: 'Importing an attempt does not rerun the simulation. It loads exported benchmark metrics and route geometry.',
      compatibilityBoundary: 'Only compatible attempts are merged automatically. Different episodes or missions are shown as reference-only unless explicitly loaded separately.',
      p5Boundary: 'P5 does not add a new planner, change scoring, or train an autonomy policy.'
    }
  };
}

export function benchmarkImportSummary(viewModel = {}) {
  return {
    version: viewModel.version ?? BENCHMARK_IMPORT_VIEW_MODEL_VERSION,
    episodeId: viewModel.currentEpisode?.episodeId ?? null,
    benchmarkMode: viewModel.currentEpisode?.benchmarkMode ?? 'plannerBenchmark',
    currentAttemptCount: viewModel.currentSession?.attemptCount ?? 0,
    importedArtifactCount: viewModel.importedArtifactCount ?? 0,
    compatibleImportCount: viewModel.compatibleImportCount ?? 0,
    incompatibleImportCount: viewModel.incompatibleImportCount ?? 0,
    persistedSessionCount: viewModel.persistedSessionCount ?? 0,
    warnings: Array.isArray(viewModel.warnings) ? [...viewModel.warnings] : []
  };
}

function normalizeCurrentEpisode(currentEpisode, currentSession) {
  const source = typeof currentEpisode === 'string' ? { episodeId: currentEpisode } : currentEpisode ?? {};
  return {
    episodeId: stringOrNull(source.episodeId ?? currentSession?.episodeId),
    benchmarkMode: stringOrNull(source.benchmarkMode ?? currentSession?.benchmarkMode) ?? 'plannerBenchmark',
    levelId: stringOrNull(source.levelId ?? source.level?.levelId),
    missionId: stringOrNull(source.missionId ?? source.mission?.missionId ?? source.mission?.id)
  };
}

function artifactLabel(artifact = {}) {
  const type = String(artifact.artifactType ?? 'unknown').replace(/^anchor\.benchmark\./, '').replace(/^anchor\./, '');
  const episode = artifact.episodeId ? `Episode ${artifact.episodeId}` : 'No episode id';
  const attempts = `${artifact.attemptCount ?? 0} attempt${Number(artifact.attemptCount ?? 0) === 1 ? '' : 's'}`;
  return `${labelize(type)} | ${episode} | ${attempts}`;
}

function countRouteGeometry(session = {}) {
  return (Array.isArray(session?.attempts) ? session.attempts : []).filter((attempt) => (
    attempt?.routeGeometry?.segments?.length
    || attempt?.routeGeometry?.waypoints?.length
    || attempt?.routeExecutionRecord?.segments?.length
  )).length;
}

function labelize(value) {
  return String(value ?? 'artifact')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))];
}