# Phaser Final Removal Audit

Phase: THREE-R3A

R3A does not delete Phaser. The default runtime remains the current Phaser lifecycle shell. The gated next shell is available only with `?runtimeShell=next`.

| Route / capability | Current scene | Canonical owner | World renderer | Shell dependency | R3A action |
| --- | --- | --- | --- | --- | --- |
| Product Hub | MainMenuScene | MainMenuScene / campaign state | Phaser idle background | Phaser default, next shell gated | Recreated behind route contract |
| Challenge Mode selection | MainMenuScene | Campaign/experience state | none | Phaser default | Next shell opens Mission Setup |
| Simulation Lab selection | MainMenuScene | Experience routing | none | Phaser default | Next shell preserves tool route entry points |
| Learning Labs selection | MainMenuScene / lab pages | Learning lab content | Phaser for retained labs | Lazy legacy island allowed | Deferred full migration to R3B |
| mission setup | MissionBriefingScene setup mode | Scenario generation config | none | Phaser default | Next shell uses portable session store |
| stochastic setup | MissionBriefingScene setup mode | Scenario generation config | none | Phaser default | Documented; not expanded in R3A |
| briefing | MissionBriefingScene | Scenario state | none | Phaser default | Separate next-shell route |
| Scenario Start | MissionBriefingScene | Scenario state | none | Phaser default | Separate next-shell route |
| Planning | MissionWorkspaceScene | canonical mission/session state | ThreeMissionWorldRenderer | Phaser lifecycle shell default | Next shell mounts Three renderer without Phaser |
| Simulation | SimulationScene | SimulationScene / portable core | ThreeMissionWorldRenderer | Phaser lifecycle shell default | Next shell route shell only; no new engine |
| surfacing/replanning | SimulationScene | simulation wait state | ThreeMissionWorldRenderer | Phaser lifecycle shell default | Separate next-shell route |
| Debrief | DebriefScene | result/export adapters | DOM debrief | Phaser lifecycle shell default | Next shell displays canonical summary |
| Replay Review | MissionReplayReviewScene | shared replay reducer/session | ThreeReplayReviewController / Three renderer | Phaser lifecycle shell default | Next shell route preserves digest and Three world |
| Mission Editor | EnvironmentEditorScene | MissionEditorSession/document | ThreeMissionEditorController / Three renderer | Phaser lifecycle shell default | Next shell route preserves editor digest |
| import/export tools | MainMenuScene / MissionWorkspaceScene | IO adapters | DOM | Phaser default | Next shell tool route added |
| leaderboard | MainMenuScene / DebriefScene | LeaderboardStore | DOM | Phaser default | Next shell route stub preserves separation |
| external solver workflow | MissionWorkspaceScene / docs | Solver packet/headless runtime | DOM | Phaser default | Next shell exposes import/export entry |
| headless bundle viewer | HeadlessBundleViewerScene | Headless bundle loader/view model | DOM/Three replay where selected | Phaser default | Next shell tool route loads example bundle |
| tutorial browser | MainMenuScene | tutorial content | DOM | Phaser default | Next shell route preserved |
| benchmark routes | BenchmarkModeOverviewScene / DebriefScene | benchmark core modules | DOM | Phaser default | Next shell route preserved |
| adaptive benchmark routes | Benchmark/Debrief panels | adaptive benchmark core | DOM | Phaser default | Next shell route preserved |
| Learning Labs | multiple demo scenes/pages | lab modules | Phaser or DOM depending lab | Lazy legacy island | R3B migration required |
| scientific demos | demo scenes | demo core modules | Phaser scenes | Phaser default | Not migrated in R3A |

Scene classification:

- PRODUCTION_LIFECYCLE: MainMenuScene, MissionBriefingScene, MissionWorkspaceScene, SimulationScene, DebriefScene, MissionReplayReviewScene, EnvironmentEditorScene, HeadlessBundleViewerScene.
- PRODUCTION_WORLD: ThreeMissionWorldRenderer, ThreeReplayReviewController, ThreeMissionEditorController.
- PRODUCTION_TOOL: DatasetExportScene, LoadLevelJsonScene, LoadLevelByIdScene, BenchmarkModeOverviewScene.
- LEARNING_LAB: retained lab pages and selected lab scenes.
- SCIENTIFIC_DEMO: FlowFieldDemoScene, CoupledFieldsDemoScene, RoiGeneratorDemoScene, UncertaintyForecastDemoScene, SamplingPriorityDemoScene, FlowCoupledSamplingDemoScene, MotionPlanningDemoScene, BathymetryWorldViewScene, RendererArchitecturePreviewScene.
- LEGACY_FALLBACK: Phaser lifecycle shell and R3A lazy Learning Lab island.
- OBSOLETE: reverted AnchorBrowserRuntime and RouteScopedViewHost are not active.

Final removal readiness: not ready. R3A creates the gated shell and audits; R3B must switch default runtime and migrate Learning Labs before `vendor/phaser.min.js` can be removed.
