# Agent Instructions for AUV Glider Planner Game

This is a vanilla JavaScript static-web game/simulator for **ANCHOR: Glider Command**, also referred to as the **AUV Glider Planner Game**. Phaser 3 is the active browser game shell.

## Hard Constraints

- Do not introduce React, TypeScript, Vue, Svelte, Angular, Next.js, or a backend.
- Preserve the Phaser 3 shell in `src/game/phaser/`; do not revert the active game to the archived vanilla Canvas/DOM shell.
- Preserve the full-screen Phaser app shell. Do not reintroduce persistent DOM top navigation or dashboard sidebars as normal player-facing UI.
- Use the Mission Console + Phaser Simulator Viewport shell intentionally: HTML/CSS owns the left `#mission-console` for menus, forms, imports/exports, editor/debrief controls, and scene-aware status; Phaser owns the center `#game-root` for the simulator viewport, map, sprites, waypoint drag/drop, currents, drift cones, route overlays, and simulation animation.
- Use the right `#waypoint-timeline` as the authoritative visible waypoint list with agent tabs. Do not duplicate the waypoint table in the left Mission Console.
- Preserve the compact center overlays: top selected-glider planning HUD, bottom mission performance leaderboard, and bottom time slider. These may summarize route/score/agent state, but must not duplicate the right waypoint table.
- Do not duplicate main menu buttons inside Phaser. The Phaser Main Menu scene should be an idle/waiting simulator viewport; launch controls live in the Mission Console.
- Do not reintroduce accidental dashboard grids, empty right panels, or DOM columns that make Phaser look like a tiny preview.
- Do not require npm for normal browser use.
- Do not require Python for browser functionality, except optional local static serving with `python -m http.server 8000`.
- Keep the browser version self-contained and static-host compatible.
- Keep simulation, scoring, data schemas, planners, generation, and evaluation independent from Phaser rendering/game scenes.
- Core IO/storage browser bridges may use `fetch`, download anchors, or `localStorage`, but must not depend on Phaser scenes or local filesystem paths.
- Do not bury scientific logic in scene code.
- Do not hardcode local file paths in browser code.
- Preserve JSON schema compatibility.
- Prefer small targeted patches over rewrites.

## Architecture Rule

Phaser game scenes call into core simulation, planning, generation, evaluation, and IO modules.
Core simulation/data modules must not depend on game scenes, Phaser, or DOM UI. Keep any browser API usage isolated to IO/storage bridge modules.

## Testing Expectations

- Run `node tools/check-js.mjs` after JavaScript edits.
- Validate sample JSON files parse.
- Optional development-only browser smoke tests use Playwright:

```bash
npm install
npx playwright install
npm run test:e2e
```

Playwright must remain optional; do not make npm required for normal browser use.
- When the environment allows it, test with:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Smoke-test the campaign, planning, simulation, debrief, level generator, plan import/export, solver packet export, dataset export, and forecast mode.
