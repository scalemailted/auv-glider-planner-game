# R3B Residual Phaser Audit

Phase: THREE-R3B gated preflight only

Status: blocked on owner approval. The R3A owner acceptance checklist in `docs/three_r3a_visual_acceptance.md` remains unchecked, including `Ready to switch default runtime` and `Ready to remove remaining Phaser dependency`. Per the R3B prompt, this pass did not switch the default runtime, delete Phaser, migrate labs, or remove vendor/package assets.

## Approval Gate

Reviewed artifacts:

- `docs/three_r3a_visual_acceptance.md`
- `test-results/three-r3a-current-shell-baseline/`
- `test-results/three-r3a-owner-review/`
- `test-results/three-r3a-owner-review/qa-summary.json`

Finding: automated R3A QA is present and passing, but owner approval is not recorded. Headed automated QA is not human manual QA.

## Preflight Baseline

- Current entry: `index.html` still loads `src/game/main.js`.
- Runtime files tracked before migration:
  - `vendor/phaser.min.js`
  - `vendor/three/build/three.core.js`
  - `vendor/three/build/three.module.js`
- Owner-review packages present:
  - `test-results/three-r2a-owner-review/`
  - `test-results/three-r2b-owner-review/`
  - `test-results/three-r3a-current-shell-baseline/`
  - `test-results/three-r3a-owner-review/`
- Starting worktree before this audit doc: clean at the R3A commit.

## Search Summary

Comprehensive residual search covered:

```text
index.html package.json package-lock.json src tests tools css docs .github vendor
```

Pattern:

```text
phaser|anchorGame\.phaser|globalThis\.Phaser|window\.Phaser|scene\.start|scene\.stop|scene\.restart|scene\.get|this\.scene|this\.sys\.game
```

Results:

| Bucket | Files | Hits | Meaning |
| --- | ---: | ---: | --- |
| Package/vendor/entry | 4 | 415 | Phaser package, lockfile, `index.html` default script, `vendor/phaser.min.js` |
| Active production runtime | 44 | 621 | Default shell, Phaser app, scenes, UI helpers, scene routing |
| Active R3A learning-lab island | 1 | 11 | Lazy Phaser island in `LegacyLearningLabHost` |
| Active tests | 9 | 788 | E2E tests still drive the default Phaser scene shell |
| Tools/audits/smokes | 129 | 429 | Current validation scripts still expect Phaser default shell or audit Phaser retirement |
| Documentation/history | 55 | 255 | Migration history, current architecture docs, acceptance docs |
| CSS | 1 | 1 | R3A gated shell CSS comment |
| Other core/UI compatibility | 17 | 97 | Retirement manifest, migration config, renderer capability docs/flags |

## Residual Runtime Table

| File/module | Runtime reachability | Purpose | Canonical behavior owned | R3B action |
| --- | ---: | --- | --- | --- |
| `index.html` | ACTIVE_PRODUCTION | Loads `vendor/phaser.min.js` for default runtime when `runtimeShell` is not `next`. | None; entry/runtime selection only. | Remove default Phaser script after owner approval and default-runtime switch. |
| `src/game/main.js` | ACTIVE_PRODUCTION | Runtime selector; default imports `src/game/phaser/PhaserProductionBootstrap.js`; `?runtimeShell=next` imports R3A shell. | None; bootstrap routing only. | Make production shell default only after approval; remove fallback import to Phaser. |
| `src/game/phaser/PhaserProductionBootstrap.js` | ACTIVE_PRODUCTION | Builds default Phaser app and DOM panels. | Bootstraps shell; not canonical model logic. | Retire after all default-shell parity, tests, and lab replacements exist. |
| `src/game/phaser/PhaserGame.js` | ACTIVE_PRODUCTION | Registers and starts 22 Phaser scenes. | Owns transitional lifecycle shell only; canonical game state lives outside renderer. | Delete only after all scenes/tools/labs are replaced and tests no longer reference `anchorGame.phaser`. |
| `src/game/phaser/scenes/MainMenuScene.js` | ACTIVE_PRODUCTION | Default Product Hub and route launcher. | Route dispatch for current shell. | Replace with framework-neutral production route commands. |
| `src/game/phaser/scenes/MissionBriefingScene.js` | ACTIVE_PRODUCTION | Briefing and Scenario Start route. | Launches planning via scene routing; canonical mission data remains portable. | Replace route view and action dispatch in production shell. |
| `src/game/phaser/scenes/MissionWorkspaceScene.js` | ACTIVE_PRODUCTION | Planning route shell hosting Three mission renderer and controls. | Canonical planning mutation paths are portable; scene owns current shell integration. | Replace shell-specific lifecycle/interaction bridge, preserve canonical Planning and Three renderer. |
| `src/game/phaser/scenes/SimulationScene.js` | ACTIVE_PRODUCTION | Simulation route shell hosting Three presentation and playback controls. | Simulation engine remains canonical; scene owns current route integration. | Replace shell-specific lifecycle, preserve simulation engine and Three presentation. |
| `src/game/phaser/scenes/DebriefScene.js` | ACTIVE_PRODUCTION | Debrief route and result actions. | Displays canonical result/scoring outputs; does not own scoring. | Replace with DOM production route view preserving result/export/replay actions. |
| `src/game/phaser/scenes/MissionReplayReviewScene.js` | ACTIVE_PRODUCTION | Replay review route shell. | Shared replay reducer/session own replay semantics. | Replace shell wrapper while preserving reducer and Three replay controller. |
| `src/game/phaser/scenes/EnvironmentEditorScene.js` | ACTIVE_PRODUCTION | Mission Editor route shell; normal editor world is Three. | Portable editor document/session owns canonical editor state. | Replace shell wrapper while preserving editor controller/session. |
| `src/game/phaser/scenes/LoadLevelJsonScene.js` | ACTIVE_PRODUCTION | JSON import/play/edit tool. | Import validation and normalized level data live in core/tool code. | Replace with DOM import route and lifecycle commands. |
| `src/game/phaser/scenes/LoadLevelByIdScene.js` | ACTIVE_PRODUCTION | Legacy saved-level registry route. | Level lookup/selection only. | Replace with DOM route or retire if no longer advertised. |
| `src/game/phaser/scenes/DatasetExportScene.js` | ACTIVE_PRODUCTION | Dataset/export workflow route. | Export builders own serialized formats. | Replace with DOM route preserving exports. |
| `src/game/phaser/scenes/HeadlessBundleViewerScene.js` | ACTIVE_PRODUCTION | Headless bundle viewer route shell. | Headless loader/view model own artifact semantics. | Replace with existing R3A DOM headless viewer route as default. |
| `src/game/phaser/scenes/BenchmarkModeOverviewScene.js` | ACTIVE_PRODUCTION | Planner/adaptive benchmark overview route. | Benchmark core modules own benchmark data. | Replace with DOM benchmark route views. |
| `src/game/phaser/scenes/BathymetryWorldViewScene.js` | ACTIVE_PRODUCTION | Three bathymetry demo hosted by Phaser shell. | Bathymetry core/view models own terrain semantics. | Register directly as Three-native production/lab route. |
| `src/game/phaser/scenes/RendererArchitecturePreviewScene.js` | ACTIVE_PRODUCTION | Renderer architecture preview route. | Informational/presentation only. | Replace with DOM/Three route or retire if no longer active. |
| `src/game/phaser/scenes/MotionPlanningDemoScene.js` | ACTIVE_LEARNING_LAB | Motion planning demonstration. | Demo only; no production planner authority. | Migrate to DOM/Canvas/Three lab depending on active scope. |
| `src/game/phaser/scenes/FlowFieldDemoScene.js` | ACTIVE_LEARNING_LAB | Flow Fields demo and diagnostics. | Portable flow math/diagnostics own canonical field evaluation. | Migrate to Canvas 2D/DOM lab preserving `ANCHOR_FLOW_DEMO_DEBUG`. |
| `src/game/phaser/scenes/RoiGeneratorDemoScene.js` | ACTIVE_LEARNING_LAB | Sampling Process / ROI Process Pattern lab. | Portable sampling process modules own process rules and exports. | Migrate to Canvas 2D/DOM lab preserving `ANCHOR_ROI_UI_DEBUG`. |
| `src/game/phaser/scenes/CoupledFieldsDemoScene.js` | ACTIVE_LEARNING_LAB | Deterministic coupled fields demo. | `src/core/demo/coupled/` owns engines/objective semantics. | Migrate to Canvas 2D/DOM lab preserving `ANCHOR_COUPLED_DEMO_DEBUG`. |
| `src/game/phaser/scenes/UncertaintyForecastDemoScene.js` | ACTIVE_LEARNING_LAB | Uncertainty/forecast demo. | Portable uncertainty model owns public/hidden boundaries. | Migrate to Canvas 2D/DOM lab preserving debug and hidden-truth policy. |
| `src/game/phaser/scenes/SamplingPriorityDemoScene.js` | ACTIVE_LEARNING_LAB | Sampling priority demo. | Core sampling priority modules own selection/value semantics. | Migrate to Canvas 2D/DOM lab or register under lab host. |
| `src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js` | ACTIVE_LEARNING_LAB | Flow-coupled sampling demo. | Core demo modules own science behavior. | Migrate to Canvas 2D/DOM lab or register under lab host. |
| `src/game/phaser/scenes/BootScene.js` | ACTIVE_PRODUCTION | Phaser boot scene. | None. | Delete with Phaser shell. |
| `src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js` | ACTIVE_PRODUCTION | Bridges Phaser pointer/scene lifecycle to Three planning controls. | Canonical mutations remain in planning/editor commands. | Move reusable intent/bridge pieces to framework-neutral interaction modules. |
| `src/game/phaser/ui/*` | ACTIVE_PRODUCTION | Phaser-native HUD/widgets for default shell and editor tooling. | UI only; canonical state elsewhere. | Replace needed controls with DOM/canvas equivalents; delete unused widgets. |
| `src/game/phaser/renderers/SamplingProcessRenderLayers.js` | ACTIVE_LEARNING_LAB | Rendering helpers for Sampling Process lab. | Presentation only. | Reuse/extract drawing logic into Canvas 2D renderer if useful, then retire Phaser dependency. |
| `src/game/phaser/renderers/BathymetryWorldRenderer.js` | TRANSITIONAL_COMPATIBILITY | Legacy bathymetry rendering helper. | Presentation only. | Confirm no production dependency, then delete or archive during R3B. |
| `src/app/production/LegacyLearningLabHost.js` | ACTIVE_LEARNING_LAB | R3A lazy Phaser island for retained Learning Lab route. | No production mission authority. | Remove after all retained labs have Phaser-free replacements. |
| `src/app/production/views/RouteViewFactory.js` | ACTIVE_LEARNING_LAB | Imports `LegacyLearningLabHost` for R3A learning lab route. | Route view only. | Replace legacy lab mount with framework-neutral lab registry/host. |
| `src/app/production/AnchorRuntimeSelector.js` | TRANSITIONAL_COMPATIBILITY | Tracks `loadedPhaser` and default/next selection debug. | Runtime diagnostics only. | Simplify to production-only debug after Phaser removal. |
| `src/core/runtime/ProductionPhaserRetirementManifest.js` | TRANSITIONAL_COMPATIBILITY | Documents retained Phaser status and final-removal flags. | Manifest only. | Update to final Phaser-removed state in R3B. |
| `src/core/runtime/MigrationRuntimeConfig.js` | TRANSITIONAL_COMPATIBILITY | Migration/runtime flags. | Configuration only. | Remove or update Phaser flags after final migration. |
| `src/core/rendering/RendererCapabilityModel.js` | TRANSITIONAL_COMPATIBILITY | Renderer capability flags mention legacy Phaser fallback. | Capability reporting only. | Remove Phaser fallback capability when unavailable. |
| `src/ui/MissionConsole.js` and related UI | TRANSITIONAL_COMPATIBILITY | Some actions still know about scene-style route concepts or Phaser-era labels. | UI commands only. | Route through framework-neutral action dispatcher. |
| Former `tests/e2e/smoke.spec.js` tests | RETIRED_TEST_MONOLITH | REPO-CLEAN-R3 split the former monolith into capability-owned files. | Test authority only. | Continue replacing scene-shell references in the split tests with production-shell route commands and lab APIs before final Phaser removal. |
| `tests/e2e/three_r1_2c_headed_acceptance.spec.js` | ACTIVE_TEST | Historical headed acceptance still uses `anchorGame.phaser`. | Test authority only. | Replace or retire once R3B acceptance supersedes it. |
| `tests/e2e/three_r2a_*` | ACTIVE_TEST | Replay acceptance still reaches Phaser scenes for default shell. | Test authority only. | Replace default-shell route setup with production-shell APIs. |
| `tests/e2e/three_r2b_*` | ACTIVE_TEST | Mission editor acceptance still drives `EnvironmentEditorScene`. | Test authority only. | Replace with Phaser-free editor route tests. |
| `tests/e2e/three_r3a_*` | ACTIVE_TEST | R3A asserts next shell lacks Phaser and legacy island loads Phaser on demand. | Test authority only. | Convert to R3B no-Phaser assertions and remove legacy-island expectation. |
| `tools/js/smoke_github_pages_static_host.mjs` | ACTIVE_TEST | Static smoke still drives current Phaser default runtime plus next shell. | Test tool only. | Update to production-only no-Phaser static smoke. |
| `tools/js/audit_current_runtime_baseline.mjs` | ACTIVE_TEST | Requires default Phaser bootstrap in R3A. | Audit only. | Update baseline expectation to production shell default. |
| `tools/js/audit_static_release_paths.mjs` | ACTIVE_TEST | Requires `vendor/phaser.min.js` and Phaser bootstrap path. | Audit only. | Replace with no-Phaser asset absence audit. |
| `tools/js/build_github_pages.mjs` | ACTIVE_TEST | Requires `vendor/phaser.min.js` in generated site. | Build validation only. | Remove Phaser from required asset list. |
| `tools/js/smoke_runtime_selector.mjs` | ACTIVE_TEST | Verifies R3A selector references Phaser default. | Smoke only. | Replace with production-only selector smoke and legacy query safety. |
| `tools/js/smoke_sampling_process_scene_layout_text.mjs` | ACTIVE_TEST | Stubs `globalThis.Phaser` for scene layout tests. | Test-only shim. | Replace with Canvas lab layout tests. |
| `package.json` / `package-lock.json` | ACTIVE_PRODUCTION | Package dependency still includes Phaser. | Dependency metadata only. | Remove after source/tests/tools have no runtime need. |
| `vendor/phaser.min.js` | ACTIVE_PRODUCTION | Shipped Phaser vendor asset for default shell and lazy island. | Third-party runtime binary. | Delete only after all active routes and tests are Phaser-free. |
| `docs/*` | DOCUMENTATION_HISTORY | Historical/current migration docs mention Phaser. | Documentation only. | Update current docs after R3B; historical docs can retain context. |
| `css/game.css` | DOCUMENTATION_HISTORY | R3A gated shell comment mentions Phaser-free shell. | Styling only. | No runtime blocker; wording can be updated later. |

## Scene Registration Audit

`src/game/phaser/PhaserGame.js` registers these 22 scenes:

```text
BootScene
MainMenuScene
MissionBriefingScene
MissionWorkspaceScene
SimulationScene
DebriefScene
EnvironmentEditorScene
DatasetExportScene
FlowFieldDemoScene
RoiGeneratorDemoScene
CoupledFieldsDemoScene
UncertaintyForecastDemoScene
SamplingPriorityDemoScene
FlowCoupledSamplingDemoScene
MotionPlanningDemoScene
BathymetryWorldViewScene
RendererArchitecturePreviewScene
BenchmarkModeOverviewScene
HeadlessBundleViewerScene
MissionReplayReviewScene
LoadLevelJsonScene
LoadLevelByIdScene
```

R3B cannot delete `src/game/phaser/` until every active production route, retained scientific demo, and test route above has a replacement or explicit retirement decision.

## Dynamic Import and Script Injection Audit

Active Phaser loading paths:

- `index.html` writes `vendor/phaser.min.js` for the default runtime unless `runtimeShell=next`.
- `src/game/main.js` dynamically imports `./phaser/PhaserProductionBootstrap.js` for the default runtime and as next-shell fallback.
- `src/game/phaser/PhaserProductionBootstrap.js` dynamically injects `vendor/phaser.min.js` if `globalThis.Phaser` is absent.
- `src/app/production/LegacyLearningLabHost.js` dynamically injects `vendor/phaser.min.js` when the R3A learning lab island is selected.

These are intentionally active in R3A and must be removed only after owner approval and lab/tool migration.

## Test Dependency Audit

The current Playwright and tool suites still depend on Phaser-era APIs:

- `window.anchorGame.phaser`
- `globalThis.Phaser`
- `scene.getScene(...)`
- `scene.start(...)`

The former largest test dependency, `tests/e2e/smoke.spec.js`, was retired by REPO-CLEAN-R3 and split into capability-owned files. Final Phaser removal still requires replacing any remaining scene-shell references in those split tests with production-shell route commands, framework-neutral lab APIs, and no-Phaser static/package assertions.

## Current R3B Decision

Blocked. Do not switch the default runtime, remove `vendor/phaser.min.js`, delete `src/game/phaser/`, or edit package dependencies until the project owner explicitly accepts the R3A visual package and marks the owner checklist.

