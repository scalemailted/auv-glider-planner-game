# THREE-R2A.1 Visual Acceptance

Headed automated QA is not human manual QA.

This document is the canonical owner-facing acceptance checklist for THREE-R2A.1 replay review. The automated headed run writes evidence to:

```text
test-results/three-r2a-owner-review/
```

## Environment

- Browser: recorded in `test-results/three-r2a-owner-review/qa-summary.json`
- Primary viewport: 1920 x 1080
- Compact viewport: 1366 x 768
- DPR/effective DPR: recorded in `qa-summary.json`
- Quality: Balanced replay renderer
- Fixture: `docs/examples/headless_replay_r2a_acceptance.example.json`

## Acceptance Table

| Stage | Result | Screenshot |
| ----- | ------ | ---------- |
| Debrief | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/01-debrief-summary.png` |
| Initial replay | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/02-replay-initial-state.png` |
| Playback controls | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/03-replay-playing.png` |
| Scrubbing | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/10-replay-checkpoint-navigation.png` |
| Planned vs realized | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/04-replay-planned-predicted-realized.png` |
| Depth observations | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/05-replay-depth-observation.png` |
| Terrain events | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/06-replay-terrain-event.png` |
| Multi-agent selection | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/08-replay-multi-agent-glider-01.png`, `test-results/three-r2a-owner-review/09-replay-multi-agent-glider-02.png` |
| Integrity status | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/02-replay-initial-state.png` |
| Camera controls | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/07-replay-side-profile.png` |
| Return to Debrief | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/12-debrief-after-replay.png` |
| Main Menu cleanup | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/13-main-menu-cleanup.png` |
| Compact layout | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/14-compact-replay-layout.png` |
| Terminal state | Automated gate writes PASS/FAIL | `test-results/three-r2a-owner-review/11-replay-terminal-state.png` |

## Owner Checklist

- [ ] Debrief summary accepted
- [ ] Replay controls accepted
- [ ] Timeline accepted
- [ ] Planned-versus-realized display accepted
- [ ] Depth replay accepted
- [ ] Terrain-event replay accepted
- [ ] Multi-agent replay accepted
- [ ] Integrity presentation accepted
- [ ] Camera controls accepted
- [ ] Compact layout accepted
- [ ] Ready to begin THREE-R2B

## Boundary Notes

Replay consumes canonical public events and checkpoints. Replay does not rerun mission physics, recompute official scoring, include hidden truth, or give Three.js authority over replay semantics. Reverse navigation restores a checkpoint and replays forward. Camera and display state do not affect replay digests.
