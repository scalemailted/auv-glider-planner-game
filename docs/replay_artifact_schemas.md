# Replay Artifact Schemas

## Replay Artifacts Overview

H4.1 hardens the REPLAY-R1 public playback contract shared by Node/OceanBox-JS and the browser Headless Bundle Viewer. A replay bundle may include `replay_manifest.json`, `replay_events.json`, `replay_checkpoints.json`, `replay_alignment_report.json`, or equivalent combined `bundle.json` fields.

## Replay Manifest

`anchor.headless.replay-manifest` declares replay identity, mission/scenario/episode IDs, seed substreams, fixed timestep, initial public state, feature flags, replay mode, event ordering, checkpoint policy, public boundary, terminal reason, bundle schema version, and scoring schema version. `schemaVersion` and `replayVersion` are the H4.1 names; older REPLAY-R1 `version`, `deterministicSubstreams`, `initialState`, and `terminationReason` aliases remain accepted with warnings where appropriate.

## Replay Event Stream

`anchor.headless.replay-events` stores the canonical ordered public event stream. Events include `eventId`, `tick`, `timeSeconds`, `phase`, `eventType`, `sequence`, nullable `agentId`, `payload`, `publicSafe`, `visibilityTier`, and `schemaVersion`.

## Replay Checkpoints

`anchor.headless.replay-checkpoints` stores public checkpoint state, per-agent states, objective state, event cursor, checkpoint reason, deterministic digest metadata, quantization metadata, and public-safety labels. Checkpoint reasons include `initial`, `periodic`, `surfacing`, `objectiveTransition`, and `terminal`.

## Replay Alignment Report

`anchor.headless.replay-alignment-report` records schema, compatibility, ordering, checkpoint, digest, public-safety, and alignment issues. H4.1 issues use stable codes such as `REPLAY_CHECKPOINT_DIGEST_MISMATCH`, `REPLAY_EVENT_ORDER_INVALID`, and `REPLAY_PUBLIC_HIDDEN_TRUTH_LEAK`.

## Event Ordering Policy

Canonical ordering is: tick, time, phase/type rank, normalized agent ID, explicit sequence, then stable event ID fallback. Mission-global events use a null/empty agent ID and sort before agent-specific events. For example: Mission / Global, then `glider-alpha`, then `glider-bravo`.

## Agent And Global Events

A null `agentId` means Mission / Global. Agent events update only the referenced public agent state unless the event is explicitly mission-global. Multi-agent fixture support proves serialization, ordering, and playback state restoration; it does not mean multi-agent mission execution is implemented.

## Checkpoint Digest Policy

A replay digest is a deterministic integrity check unless a cryptographic algorithm is explicitly used. REPLAY-R1 currently uses stable JSON plus FNV-1a over public replay state with documented numeric quantization. It is a replay consistency digest, not a security signature.

## Numeric Quantization

The current public-state policy is `replay-r1-public-state-quantized-1e-6`. Exact identifiers such as tick and sequence stay exact. Public numeric values are quantized per field policy before digesting.

## Public Replay Boundary

Public replay verification does not reconstruct hidden truth. Public playback is not authoritative hidden-state resimulation. Public replay artifacts must not contain `T_hiddenTruth`, `trueRoi`, raw event-intensity truth, hidden fields, oracle tensors, debug-all arrays, or unmarked referee payloads.

## Combined Vs Separate Bundle Representations

Combined bundles use `replayManifest`, `replayEvents`, `replayCheckpoints`, `replayAlignmentReport`, and `replayContract`. Separate files use `replay_manifest.json`, `replay_events.json`, `replay_checkpoints.json`, and `replay_alignment_report.json`. When both representations are loaded and disagree, validation fails with `REPLAY_COMBINED_SEPARATE_MISMATCH`.

## Schema Compatibility Policy

Current version: `replay-r1.0`. Oldest supported version: `replay-r1.0`. Older REPLAY-R1 artifacts missing optional H4.1 fields generally warn rather than fail when core fields are present. Unknown newer versions report `forwardVersionUnknown`; strict mode treats compatibility warnings as failures.

## Tamper Detection

H4.1 verification detects digest changes, event ordering changes, invalid checkpoint cursors, removed terminal events, event/checkpoint count mismatches, and public hidden-truth markers. It reports exact issue codes and concise expected/actual values without dumping full payloads.

## Multi-Agent Replay Contract

The checked-in multi-agent fixture includes `glider-alpha` and `glider-bravo`, same-tick interleaved events, per-agent public states, a mission/global event, surfacing, objective transition, and terminal checkpoints. It is `multiAgentReplayContractOnly: true` and adds no fleet planner, coordination policy, RL, or MARL semantics.

## What Replay Verification Proves

Replay verification proves that recorded public replay artifacts satisfy declared schema, compatibility, ordering, checkpoint, digest, public-safety, and alignment rules.

## What Replay Verification Does Not Prove

Replay verification does not reconstruct hidden truth, rerun mission physics, perform authoritative protected resimulation, change official browser scoring, add a planner or optimizer, add RL/MARL, add a Python simulator, or certify calibrated ocean forecasts.