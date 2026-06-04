import { cloneJson } from './ExportVisibility.js';

export function encodeHiddenTruthBundle(truth) {
  if (!truth) return null;
  return {
    mode: 'opaqueBundle',
    encrypted: false,
    algorithm: 'browser-obfuscation-v1',
    warning: 'Client-side cheat-resistant only; not secure against determined users.',
    bundle: encodeText(JSON.stringify(cloneJson(truth)))
  };
}

export function decodeHiddenTruthBundle(hiddenTruth) {
  if (hiddenTruth?.mode !== 'opaqueBundle' || !hiddenTruth.bundle) return null;
  try {
    return JSON.parse(decodeText(hiddenTruth.bundle));
  } catch {
    return null;
  }
}

function encodeText(text) {
  if (typeof globalThis.btoa === 'function') return globalThis.btoa(unescape(encodeURIComponent(text)));
  return Buffer.from(text, 'utf8').toString('base64');
}

function decodeText(text) {
  if (typeof globalThis.atob === 'function') return decodeURIComponent(escape(globalThis.atob(text)));
  return Buffer.from(text, 'base64').toString('utf8');
}
