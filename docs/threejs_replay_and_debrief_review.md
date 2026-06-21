# Three.js Replay and Debrief Review

THREE-R2A adds a browser replay review surface for public mission results and headless replay bundles. Phaser remains the scene lifecycle shell, while Three.js owns the replay presentation through the existing mission world renderer.

Replay consumes canonical public replay events and checkpoints. It does not rerun mission physics, recompute official scoring, create plans, or use hidden truth. Display and camera state are inspection controls and do not enter replay digests.

Debrief remains the official mission-result summary. Replay Review is an inspection surface for planned route, realized trajectory, observations, surfacing events, terrain events, and integrity status. Legacy or summary-only results may be inspected in compatibility mode without fabricated canonical events.
