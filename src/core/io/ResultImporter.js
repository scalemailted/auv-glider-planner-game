export function importResultJson(json, gameState = {}) {
  if (!json || typeof json !== 'object') return failure('Result JSON must be an object.');
  if (json.type !== 'anchor.result') return failure('Expected type anchor.result.');
  const result = json.rawResult ?? json;
  const activeInstanceId = gameState?.level?.instanceId ?? null;
  const activeMissionId = gameState?.mission?.missionId ?? gameState?.mission?.id ?? null;
  const compatible = Boolean(activeInstanceId && json.instanceId === activeInstanceId
    && (!activeMissionId || !json.missionId || json.missionId === activeMissionId));
  return {
    ok: true,
    compatible,
    result,
    summary: {
      title: 'Imported Result',
      levelId: json.levelId ?? 'N/A',
      instanceId: json.instanceId ?? 'N/A',
      missionId: json.missionId ?? 'N/A',
      label: json.label ?? result?.source ?? 'Imported Result',
      executionMode: json.executionMode ?? 'openLoop',
      finalScore: json.scoreSummary?.finalScore ?? result?.summary?.finalScore ?? 'N/A',
      oracleAssisted: Boolean(json.fairness?.oracleAssisted),
      compatible,
      message: compatible
        ? 'Result is compatible with the active challenge and can be shown in Debrief.'
        : 'Result imported as data only. Load the matching challenge before opening Debrief.'
    }
  };
}

function failure(message) {
  return {
    ok: false,
    compatible: false,
    result: null,
    summary: { title: 'Result Import Failed', message },
    errors: [message]
  };
}
