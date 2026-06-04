import { parseChallengeImport } from './ChallengeExporter.js';

export function importOracleDatasetJson(json, { researchMode = false } = {}) {
  if (!json || typeof json !== 'object') return failure('Oracle dataset JSON must be an object.');
  if (json.type !== 'anchor.oracleDataset') return failure('Expected type anchor.oracleDataset.');
  const warning = json.label ?? 'Contains hidden truth. Do not use for fair player planning.';
  if (!researchMode) {
    return {
      ok: false,
      blocked: true,
      warning,
      summary: {
        title: 'Oracle Dataset Import Blocked',
        message: `${warning} Enable research/debug mode to load oracle datasets.`
      }
    };
  }
  const imported = parseChallengeImport(json.challenge);
  return {
    ok: Boolean(imported?.level),
    blocked: false,
    warning,
    imported,
    dataset: json,
    summary: {
      title: 'Oracle Dataset Imported',
      message: warning,
      levelId: json.challenge?.levelId ?? imported?.level?.levelId ?? 'N/A',
      instanceId: json.challenge?.instanceId ?? imported?.level?.instanceId ?? 'N/A'
    }
  };
}

function failure(message) {
  return {
    ok: false,
    blocked: false,
    warning: null,
    summary: { title: 'Oracle Dataset Import Failed', message },
    errors: [message]
  };
}
