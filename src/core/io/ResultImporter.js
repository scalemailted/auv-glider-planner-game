import { buildArtifactInspectionViewModel } from './ArtifactInspectionViewModel.js';

export function importResultJson(json, gameState = {}) {
  const inspection = buildArtifactInspectionViewModel(json, { kind: 'result' });
  if (!json || typeof json !== 'object') return failure('Result JSON must be an object.', inspection);
  if (json.type !== 'anchor.result') return failure('Expected type anchor.result.', inspection);
  if (inspection.failures?.length) return failure(inspection.failures.map((item) => item.message).join(' '), inspection);
  const result = json.rawResult ?? json;
  const activeInstanceId = gameState?.level?.instanceId ?? null;
  const activeMissionId = gameState?.mission?.missionId ?? gameState?.mission?.id ?? null;
  const compatible = Boolean(activeInstanceId && json.instanceId === activeInstanceId
    && (!activeMissionId || !json.missionId || json.missionId === activeMissionId));
  const scoreMetadata = inspection.scoreMetadata ?? {};
  return {
    ok: true,
    compatible,
    result,
    inspection,
    summary: {
      title: 'Imported Result',
      levelId: json.levelId ?? 'N/A',
      instanceId: json.instanceId ?? 'N/A',
      missionId: json.missionId ?? 'N/A',
      label: json.label ?? result?.source ?? 'Imported Result',
      executionMode: json.executionMode ?? 'openLoop',
      finalScore: scoreMetadata.officialScore ?? json.scoreSummary?.finalScore ?? result?.summary?.finalScore ?? 'N/A',
      artifactType: inspection.artifactType ?? json.type,
      artifactVersion: inspection.sourceVersion ?? json.schemaVersion ?? 'N/A',
      payloadDigest: inspection.payloadDigest ?? 'N/A',
      scoreProfileId: scoreMetadata.scoreProfileId ?? 'N/A',
      scoreProfileVersion: scoreMetadata.scoreProfileVersion ?? 'N/A',
      scoreResultDigest: scoreMetadata.scoreResultDigest ?? 'N/A',
      fairnessClass: inspection.fairnessClass ?? (json.fairness?.oracleAssisted ? 'ORACLE_ASSISTED' : 'PUBLIC_FAIR'),
      visibilityClass: inspection.visibilityClass ?? 'PUBLIC_OBSERVATION_ONLY',
      oracleAssisted: Boolean(json.fairness?.oracleAssisted),
      compatible,
      message: compatible
        ? 'Result is compatible with the active challenge and can be shown in Debrief.'
        : 'Result imported as data only. Load the matching challenge before opening Debrief.'
    }
  };
}

function failure(message, inspection = null) {
  return {
    ok: false,
    compatible: false,
    result: null,
    inspection,
    summary: { title: 'Result Import Failed', message, artifactType: inspection?.artifactType ?? null, payloadDigest: inspection?.payloadDigest ?? null },
    errors: [message]
  };
}