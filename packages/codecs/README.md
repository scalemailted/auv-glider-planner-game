# @anchor/codecs

`packages/codecs` owns deterministic artifact encoding, decoding, runtime validation, migration reports, safety limits, JSON/JSONL transport, artifact envelopes, bundle manifests, and reproducibility digests for ANCHOR artifacts.

Allowed dependency: `@anchor/contracts`.

The package is pure: it receives strings, bytes, or plain JSON-compatible objects and returns structured reports. It does not own file pickers, downloads, UI routing, visibility policy decisions, scientific equations, simulation transitions, scoring formulas, replay playback, or renderer state.

Primary APIs are exported from `src/index.js`:

- `artifactKindRegistry()` and `artifactKindById(kind)`
- `canonicalJsonStringify`, `canonicalJsonParse`, `canonicalJsonDigest`
- `encodeArtifact`, `decodeArtifact`, `validateArtifact`, `migrateArtifact`
- `createArtifactEnvelope`, `validateArtifactEnvelope`, `artifactEnvelopeDigest`
- `createBundleManifest`, `validateBundleManifest`, `bundleManifestDigest`
- `encodeJsonLines`, `decodeJsonLines`, `validateJsonLines`
- `inspectArtifact`

Digests support reproducibility, identity checks, and accidental-corruption detection. They are not cryptographic authenticity guarantees unless a cryptographic algorithm is explicitly declared.