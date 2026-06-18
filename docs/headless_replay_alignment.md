# Headless Replay Alignment (REPLAY-R1)

REPLAY-R1 is the versioned replay contract shared by the Node/OceanBox-JS headless runtime and the browser Headless Bundle Viewer.

It does not add a planner, route optimizer, Python simulator, RL/MARL system, calibrated ocean forecast, or official browser scoring replacement. Browser ANCHOR remains the official visual referee and browser scoring UI. SCORE-R1 remains an optional shadow benchmark score.

## Artifacts

A replayable headless bundle may include:

- `replay_manifest.json`: replay schema/version, scenario and mission identifiers, seed/substreams, fixed timestep, initial public state, feature flags, ordering policy, numeric policy, replay mode, termination reason, bundle/scoring schema versions, and public boundary flags.
- `replay_events.json`: canonical ordered public command/event stream.
- `replay_checkpoints.json`: public replay checkpoints with stable public-state digests.
- `replay_alignment_report.json`: verification status and first-divergence details.
- `replay_contract.json`: optional wrapper used by CLI output; combined `bundle.json` embeds equivalent fields as `replayManifest`, `replayEvents`, `replayCheckpoints`, `replayAlignmentReport`, and `replayContract`.

Legacy `replay.json` remains available for backward compatibility, but it is marked legacy/limited and does not claim deterministic REPLAY-R1 alignment.

## Replay Modes

- `publicObservationPlayback`: public sanitized bundles replay the recorded public event/checkpoint timeline. They do not resimulate hidden truth.
- `authoritativeSimulationReplay`: reserved for explicitly authorized internal/referee contexts with enough protected state to resimulate.
- `refereeInternalReplay`: reserved for protected internal/referee workflows. Public exports do not use this mode.

Public/no-hidden bundles must not include `T_hiddenTruth`, hidden field payloads, oracle state, referee-only payloads, or reconstructable hidden truth. Public playback remains useful for browser and Colab inspection because it preserves public timeline, objective transitions, surfacing events, and terminal digest state.

## Event Ordering

Events at the same simulation time use one canonical ordering policy:

1. simulation tick/time
2. replay phase/type rank
3. vehicle/agent id
4. explicit monotonic sequence number

The browser viewer consumes this ordering. Browser animation timing and UI callbacks do not determine simulation state.

## Checkpoint Digest Policy

Checkpoints are emitted at initial state, surfacing events, objective transitions, periodic fixed ticks, and terminal state.

Digest input is public replay state only: public vehicle state, active objectives, public observations, surfacing count, mission outcome status, and SCORE-R1 public score fields when present.

REPLAY-R1 uses stable JSON canonicalization with volatile metadata removed. Numeric public state is quantized per documented field policy, currently `replay-r1-public-state-quantized-1e-6`. Exact fields such as tick and sequence stay exact. There is no unexplained global close-enough comparison.

## CLI

```bash
node tools/js/headless_oceanbox.mjs simulate --seed h4-demo --out tmp/h4-run --motion-aware --cost-graph --mission-score --no-hidden-export --combined-json --checkpoint-every 5 --demo-objectives
node tools/js/headless_oceanbox.mjs replay --bundle tmp/h4-run/bundle.json --out tmp/h4-replay --checkpoint-every 5 --demo-objectives
node tools/js/headless_oceanbox.mjs verify-replay --bundle tmp/h4-run/bundle.json --report tmp/h4-replay/replay_alignment_report.json --checkpoint-every 5 --demo-objectives
```

Useful flags include `--strict`, `--checkpoint-every <ticks>`, `--allow-compatible-version`, `--public-playback`, and `--referee-replay`. Public playback is the default for sanitized bundles.

## Example Fixtures

Checked-in examples live under `docs/examples/`:

- `headless_replay_bundle.example.json`
- `headless_replay_manifest.example.json`
- `headless_replay_events.example.json`
- `headless_replay_checkpoints.example.json`
- `headless_replay_alignment_report.example.json`

The example preserves this objective sequence:

- Dive 1: reconnaissance
- Dive 2: validate expected state
- Dive 3: front tracking
- Dive 4: persistent monitoring
- Dive 5: return/recovery

## Browser Viewer

The Headless Bundle Viewer loads REPLAY-R1 artifacts from combined or separate bundle files. It shows replay mode/fidelity/status, event/checkpoint counts, terminal digest, objective transitions, and controls for play/pause, event step, start checkpoint, next checkpoint, and terminal checkpoint.

The viewer labels public bundles as public observation playback. It does not claim authoritative hidden-truth resimulation for sanitized bundles.

## H4.1 Schema And Integrity Hardening

H4.1 adds formal replay schema files, runtime schema validation, explicit compatibility policy, structured integrity issue codes, compact tampered fixtures, and a contract-only multi-agent replay fixture. `verify-replay` exits nonzero on `FAIL`; `--strict` also exits nonzero on `WARN`. Public verification checks recorded public artifacts only and does not perform hidden-state resimulation or physics replay. See `docs/replay_artifact_schemas.md`.
