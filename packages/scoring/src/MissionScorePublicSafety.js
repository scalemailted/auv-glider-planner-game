export const MISSION_SCORE_PUBLIC_SAFETY_VERSION = 'mission-score-public-safety-score-r1';

const BANNED_KEYS = new Set(['T_hiddenTruth', 'trueRoi', 'eventIntensity', 'hiddenFields', 'debugOnlyTensor', 'rawOracleTensor']);
const BANNED_PATTERNS = [/"T_hiddenTruth"\s*:/, /"trueRoi"\s*:/, /"eventIntensity"\s*:/, /"hiddenFields"\s*:/, /raw hidden truth/i];

export function sanitizeMissionOutcomeReportForPublicExport(report = {}, options = {}) {
  const copy = sanitizeValue(report, { allowLabels: true });
  copy.publicSafe = true;
  copy.changesOfficialBrowserScoring = false;
  copy.hiddenTruthIncluded = false;
  return copy;
}

export function sanitizeMissionRegretReportForPublicExport(report = {}, options = {}) {
  if (!report) return null;
  const copy = sanitizeValue(report, { allowLabels: true });
  copy.publicSafe = true;
  copy.hiddenTruthIncluded = false;
  return copy;
}

export function auditMissionScorePublicSafety(record = {}) {
  const warnings = [];
  const failures = [];
  const text = JSON.stringify(record ?? {});
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) failures.push(`Public score artifact matches banned pattern ${pattern}.`);
  }
  if (record?.hiddenTruthIncluded === true) failures.push('Public score artifact must not mark hiddenTruthIncluded=true.');
  if (record?.publicSafe === false) failures.push('Public score artifact must not mark publicSafe=false.');
  if (record?.changesOfficialBrowserScoring !== undefined && record.changesOfficialBrowserScoring !== false) failures.push('SCORE-R1 artifacts must not change official browser scoring.');
  if (/oracle/i.test(text) && !/oracleDerived|oracle comparison|oracle attempt|explicitly labelled oracle/i.test(text)) warnings.push('Oracle text appears without explicit derived/comparison labelling.');
  return { valid: failures.length === 0, status: failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', failures, warnings };
}

export function missionScorePublicSafetySummary(record = {}) {
  const audit = auditMissionScorePublicSafety(record);
  return {
    type: 'anchor.benchmark.mission-score-public-safety-summary',
    version: MISSION_SCORE_PUBLIC_SAFETY_VERSION,
    publicSafe: audit.valid,
    status: audit.status,
    failureCount: audit.failures.length,
    warningCount: audit.warnings.length,
    changesOfficialBrowserScoring: record?.changesOfficialBrowserScoring === false ? false : record?.changesOfficialBrowserScoring ?? false
  };
}

function sanitizeValue(value, options = {}) {
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry, options));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (BANNED_KEYS.has(key)) continue;
    if (key === 'hiddenEventHypothesis' && child && typeof child === 'object') {
      out.hiddenEventHypothesisSummary = sanitizeValue(compactHiddenEventSummary(child), options);
      continue;
    }
    out[key] = sanitizeValue(child, options);
  }
  return out;
}

function compactHiddenEventSummary(value = {}) {
  return {
    status: value.status ?? null,
    confidence: finiteOrNull(value.confidence ?? value.evidenceConfidence),
    publicSafe: true,
    note: 'Public-safe hidden-event hypothesis summary; raw hidden truth is not exported.'
  };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
