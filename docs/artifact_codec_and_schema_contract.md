# Artifact Codec and Schema Contract

CODEC-R1 makes `packages/codecs/` the pure transport authority for versioned ANCHOR artifacts. The package identifies artifact kinds, validates current versions, reports supported migrations, computes deterministic transport digests, applies import safety limits, and returns structured decode reports.

ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.

Tagline: Plan. Simulate. Compare. Learn.

## Ownership

| Responsibility | Current owner | Pure | Runtime coupled | CODEC-R1 action |
|---|---|---:|---:|---|
| Artifact-kind authority | `packages/codecs/src/ArtifactKindRegistry.js` | yes | no | Central registry for Alpha-critical and supported compatibility artifacts. |
| Version authority | `packages/codecs` plus `schemas/` | yes | no | Runtime detection rejects missing, unsupported legacy, and future versions. |
| JSON Schema authority | `schemas/` | yes | no | Source-controlled schema-like files remain public contracts; codec audits alignment. |
| Runtime validator authority | `packages/codecs` for transport, domain packages for semantics | yes | no | Codec validates transport shape, visibility/fairness metadata, safety limits, and digests. |
| Migration authority | `packages/codecs/src/Migration.js` | yes | no | Only actual supported legacy migrations are registered; CODEC-R1 includes plan 1.0 to 2.0. |
| Digest authority | `packages/contracts` and `packages/codecs` | yes | no | Contracts provide FNV helper; codecs define canonical JSON payload/envelope/bundle digests. |
| Public/private visibility authority | App policy plus codec metadata | mixed | yes | Codec records and validates classes; the app decides visible import/export policy. |
| Filename authority | Codec registry defaults, app download UI | mixed | yes | Registry provides default filenames; UI still owns actual downloads. |
| Browser file handling | `src/core/io` and UI scenes | no | yes | App adapters call codecs after file-size checks and before workflow routing. |
| Headless serialization | Existing headless runtime plus codecs | mixed | yes | Headless artifacts can be inspected by codec reports without changing runtime behavior. |
| Python compatibility | Plain JSON/JSONL contracts | yes | no | Standard-library Python smoke loads solver packet, plan, result, and benchmark fixtures. |
| Duplicated parsers | Legacy app adapters | no | yes | Generic app JSON helpers now route through canonical codec parse/stringify. |
| Silent compatibility fallbacks | Historically distributed | no | yes | Structured failures replace guessing for missing, future, and unsupported legacy versions. |
| Unsupported legacy assumptions | Codec migration registry | yes | no | Unsupported old versions fail clearly instead of being silently treated as current. |

## Alpha-Critical Families

The codec registry classifies these as Alpha-critical: challenge, level, mission, plan, plan segment, environment manifest, environment artifact metadata, solver packet, external solver plan, simulation snapshot, result, ScoreResult metadata, replay manifest/events/checkpoints/bundle, headless bundle, benchmark run/comparison record, surface observation, dataset manifest placeholder, and ML-ready JSONL record placeholder.

Internal debug objects are not public codec artifacts unless explicitly registered.

## Canonical JSON

Canonical JSON has stable object-key ordering, stable array ordering, finite numbers only, negative zero normalized to zero, deterministic newline handling, and no JavaScript-only values. Pretty printing is allowed for user downloads, but payload digests are computed from compact canonical JSON.

## Safety Limits

`ArtifactSafetyLimits` defines maximum input bytes, nesting depth, object-key count, array length, waypoint count, agent count, event count, checkpoint count, field-value count, JSONL record count, JSONL line size, and string length. Unsafe structural keys `__proto__`, `prototype`, and `constructor` fail. Executable text such as script tags or `javascript:` URLs fails at the transport layer.

## Structured Decode Reports

`decodeArtifact` returns `ACCEPTED`, `ACCEPTED_WITH_WARNINGS`, or `REJECTED` with validation, migration, integrity, safety, warnings, failures, source version, target version, payload digest, and envelope digest. Stable failure codes include invalid JSON, oversized input, unsupported artifact type, missing version, unsupported legacy/future versions, schema/runtime validation failure, migration failure, digest mismatch, visibility conflict, nonfinite number, dimension limit, and unsafe object key.

## Migration Graph

CODEC-R1 registers one supported migration: `anchor.plan` `1.0` to `2.0`. It is lossless and preserves source and migrated digests in the migration report. Unknown future versions and unsupported legacy versions fail.

## Integrity

`payloadDigest` identifies deterministic payload content. `envelopeDigest` identifies envelope metadata plus payload. `sourceDigest` and `migratedDigest` appear in migration reports. Digests support reproducibility, identity checks, and accidental-corruption detection. They are not cryptographic authenticity guarantees unless a cryptographic algorithm is explicitly declared.

## Visibility And Fairness

Supported visibility classes are `PUBLIC`, `PUBLIC_OBSERVATION_ONLY`, `FORECAST_ONLY`, `BELIEF_AWARE`, `ORACLE_HIDDEN_TRUTH`, `INTERNAL`, and `TEACHING_FIXTURE`. Supported fairness classes are `PUBLIC_FAIR`, `FORECAST_ONLY`, `BELIEF_AWARE`, `ORACLE_ASSISTED`, `INTERNAL_REPLAY`, and `TEACHING_FIXTURE`.

Codec validation rejects public or forecast-visible artifacts that carry known hidden-truth markers. The application remains responsible for deciding which fields to export and which preview to show.

## Result And Score Metadata

`anchor.result` exports now include `scoreArtifactIdentities` and `codecMetadata` for artifact type/version, official score identity, ScoreProfile ID/version, ScoreResult digest, environment digest, plan digest, simulation digest, terminal reason, planner provenance, visibility class, fairness class, and payload digest. Debrief displays these values without recalculating score.

## Python And Colab

Alpha transport artifacts are plain JSON or JSONL. Units are strings, time is seconds, depth is positive-down meters, axes are explicit when present, typed arrays are encoded as ordinary arrays, and no imported artifact is executable code.

## Current Limits

CODEC-R1 does not add NetCDF, Zarr, ZIP bundles, Pyodide, WASM, WebGPU, ML dataset generation, a planner, a Python simulator, or new scientific semantics.