import { JSON_LINES_CODEC_VERSION, FailureCodes } from './ArtifactKindRegistry.js';
import { canonicalJsonParse, canonicalJsonStringify, utf8ByteLength } from './CanonicalJson.js';
import { codecFailure } from './CodecError.js';
import { limitsForArtifact } from './Safety.js';

export function encodeJsonLines(records, options = {}) {
  const limits = limitsForArtifact('mlJsonlRecord', options.limits);
  const input = Array.isArray(records) ? records : [];
  if (input.length > limits.maxJsonLineRecords) throw new Error(`JSONL record count exceeds ${limits.maxJsonLineRecords}.`);
  const lines = input.map((record, index) => {
    const line = canonicalJsonStringify(record, { pretty: false });
    const bytes = utf8ByteLength(line);
    if (bytes > limits.maxJsonLineBytes) throw new Error(`JSONL line ${index + 1} exceeds ${limits.maxJsonLineBytes} bytes.`);
    return line;
  });
  return options.trailingNewline === false ? lines.join('\n') : `${lines.join('\n')}\n`;
}

export function decodeJsonLines(text, options = {}) {
  const limits = limitsForArtifact('mlJsonlRecord', options.limits);
  const rawLines = String(text ?? '').split(/\r?\n/);
  const records = [];
  const failures = [];
  const warnings = [];
  rawLines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line === '') {
      if (index === rawLines.length - 1) return;
      if (options.allowEmptyLines === true) return;
      failures.push(codecFailure(FailureCodes.INVALID_JSON, 'Empty JSONL line is ambiguous.', `$[line ${lineNumber}]`, { lineNumber }));
      return;
    }
    if (/^\s*#/.test(line)) {
      if (options.allowComments === true) return;
      failures.push(codecFailure(FailureCodes.INVALID_JSON, 'JSONL comments are disabled unless explicitly allowed.', `$[line ${lineNumber}]`, { lineNumber }));
      return;
    }
    const bytes = utf8ByteLength(line);
    if (bytes > limits.maxJsonLineBytes) {
      failures.push(codecFailure(FailureCodes.INPUT_TOO_LARGE, `JSONL line exceeds ${limits.maxJsonLineBytes} bytes.`, `$[line ${lineNumber}]`, { lineNumber, bytes }));
      return;
    }
    try {
      records.push(canonicalJsonParse(line, { limits }));
    } catch (error) {
      failures.push(codecFailure(error.code ?? FailureCodes.INVALID_JSON, `Line ${lineNumber}: ${error.message}`, `$[line ${lineNumber}]`, { lineNumber }));
    }
  });
  if (records.length > limits.maxJsonLineRecords) failures.push(codecFailure(FailureCodes.DIMENSION_LIMIT_EXCEEDED, `JSONL record count exceeds ${limits.maxJsonLineRecords}.`, '$'));
  return {
    version: JSON_LINES_CODEC_VERSION,
    status: failures.length ? 'REJECTED' : (warnings.length ? 'ACCEPTED_WITH_WARNINGS' : 'ACCEPTED'),
    records: failures.length ? [] : records,
    recordCount: records.length,
    warnings,
    failures
  };
}

export function validateJsonLines(records, recordValidator, options = {}) {
  const warnings = [];
  const failures = [];
  const input = Array.isArray(records) ? records : [];
  input.forEach((record, index) => {
    const lineNumber = index + 1;
    const result = recordValidator?.(record, { lineNumber, options }) ?? { status: 'PASS', warnings: [], failures: [] };
    warnings.push(...(result.warnings ?? []).map((warning) => ({ ...warning, lineNumber })));
    failures.push(...(result.failures ?? []).map((failure) => ({ ...failure, lineNumber })));
  });
  return {
    version: JSON_LINES_CODEC_VERSION,
    status: failures.length ? 'FAIL' : (warnings.length ? 'WARN' : 'PASS'),
    recordCount: input.length,
    warnings,
    failures
  };
}