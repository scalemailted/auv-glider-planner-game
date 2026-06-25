import {
  ArtifactSafetyLimits,
  canonicalJsonParse,
  canonicalJsonStringify,
  inspectArtifact
} from '../../../packages/codecs/src/index.js';
import {
  buildArtifactInspectionViewModel,
  recordArtifactEncodeForDebug
} from './ArtifactInspectionViewModel.js';

export async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  const text = await response.text();
  return canonicalJsonParse(text, { maxBytes: ArtifactSafetyLimits.defaults.maxInputBytes });
}

export async function readJSONFile(file) {
  enforceFileSizeLimit(file);
  const text = await file.text();
  return canonicalJsonParse(text, { maxBytes: ArtifactSafetyLimits.defaults.maxInputBytes });
}

export async function readArtifactFile(file, options = {}) {
  enforceFileSizeLimit(file, options.maxBytes);
  const text = await file.text();
  return buildArtifactInspectionViewModel(text, {
    sourceFilename: file.name,
    byteSize: file.size,
    maxBytes: options.maxBytes ?? ArtifactSafetyLimits.defaults.maxInputBytes,
    ...options
  });
}

export function downloadJSON(filename, data) {
  let text;
  try {
    text = canonicalJsonStringify(data, { pretty: true, trailingNewline: true });
    const inspection = inspectArtifact(data);
    recordArtifactEncodeForDebug({
      artifactType: inspection.artifactType,
      sourceVersion: inspection.sourceVersion,
      targetVersion: inspection.targetVersion,
      payloadDigest: inspection.payloadDigest,
      envelopeDigest: inspection.envelopeDigest,
      visibilityClass: inspection.visibilityClass,
      fairnessClass: inspection.fairnessClass,
      warnings: inspection.warnings,
      failures: inspection.failures,
      status: inspection.status
    });
  } catch (error) {
    text = `${JSON.stringify(data, null, 2)}\n`;
    recordArtifactEncodeForDebug({ status: 'REJECTED', warnings: [], failures: [{ code: error.code ?? 'CANONICAL_JSON_FAILED', message: error.message, path: '$' }] });
  }
  downloadText(filename, text, 'application/json');
}

export function downloadText(filename, text, mimeType = 'text/plain') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function enforceFileSizeLimit(file, maxBytes = ArtifactSafetyLimits.defaults.maxInputBytes) {
  if (file?.size != null && file.size > maxBytes) {
    throw new Error(`File is too large for JSON import: ${file.size} bytes exceeds ${maxBytes}.`);
  }
}