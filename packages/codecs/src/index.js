export * from './ArtifactKindRegistry.js';
export * from './CanonicalJson.js';
export * from './CodecError.js';
export * from './Safety.js';
export * from './Envelope.js';
export * from './Migration.js';
export * from './Codec.js';
export * from './JsonLines.js';

import { CODEC_PACKAGE_VERSION } from './ArtifactKindRegistry.js';

export const PACKAGE_VERSION = CODEC_PACKAGE_VERSION;

export const PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/codecs',
  owns: [
    'artifact kind registry',
    'versioned canonical JSON and JSONL transport',
    'artifact envelopes and bundle manifests',
    'structured validation and migration reports',
    'import safety limits and deterministic transport digests'
  ],
  dependsOn: ['@anchor/contracts'],
  doesNotOwn: [
    'scientific generation',
    'mission simulation semantics',
    'official scoring equations',
    'replay playback behavior',
    'file pickers, downloads, routing, or visibility policy UI'
  ]
});

export function packageBoundarySummary() {
  return {
    package: PACKAGE_BOUNDARY.package,
    version: PACKAGE_VERSION,
    owns: PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: PACKAGE_BOUNDARY.doesNotOwn.slice()
  };
}