# Production Shell Parity Specification

The current Phaser shell is the visual and functional reference. R3A adds `?runtimeShell=next` as a gated shell only.

| Route | Left panel heading | Left sections | Primary actions | Center heading/status | Three world | Right panel heading | Right sections | Timeline | Performance HUD | Body/shell classes | Focus target | Return route | Cleanup expectations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Product Hub | Production Shell | Runtime, controls | Challenge Mode, Simulation Lab, Learning Labs, Import JSON, Headless Bundle Viewer | ANCHOR: Glider Command | no | Mission Context | route/runtime metrics | no | no | main-menu-shell hub-mode no-mission-hub | #next-shell-route-heading | n/a | zero Three/Phaser production resources |
| Mission Setup | Mission Navigator | Controls, boundary | Generate Mission, Back | Mission Setup | no | Setup Details | generated mission metrics | no | no | setup-route | #next-shell-route-heading | Product Hub | previous route root removed |
| Mission Briefing | Mission Briefing | Controls, boundary | Start Planning, Back | Scenario Start | no | Briefing Dossier | mission/scenario digest | no | no | briefing-route | #next-shell-route-heading | Setup | no tactical map leakage |
| Mission Planning | Mission Console | Planning controls | Add Waypoint, Add Target, Execute | Planning | yes | Waypoint Timeline | plan digest and waypoint counts | yes | route debug | planning-workspace | #next-shell-route-heading | Setup/Product Hub | one Three renderer, no Phaser game |
| Mission Simulation | Mission Console | Playback controls | Play/Pause, Surface, Finish | Simulation | yes | Mission Timeline | launch digest/status | yes | route debug | simulation-route | #next-shell-route-heading | Planning/Debrief | one Three renderer, no Phaser game |
| Surfacing Decision | Surfacing Decision | Decision controls | Continue, Replan, Finish | Surfacing Decision | yes | Decision Timeline | solver/import status | yes | route debug | surfacing-route | #next-shell-route-heading | Simulation/Planning | no stale overlays |
| Mission Debrief | Debrief Console | replay/export controls | Replay Review, Export Result, Main Menu | Mission Debrief | no | Result Timeline | score/result/replay digests | no | no | debrief-route | #next-shell-route-heading | Product Hub | result retained until menu reset |
| Replay Review | Replay Console | replay controls | Play/Pause, Return | Replay Review | yes | Replay Timeline | public replay digest | yes | route debug | replay-route | #next-shell-route-heading | Debrief | no replay resimulation |
| Mission Editor | Editor Console | edit/preview/export controls | Edit, Preview, Export/Reimport | Mission Editor | yes | Validation | editor digest | no | route debug | editor-route | #next-shell-route-heading | Product Hub/Planning preview | editor document digest preserved |
| Import / Export | Import / Export | import/export controls | Import Invalid JSON, Export Plan, Export Result | Import / Export | no | Tool Status | plan/result digest | no | no | tool-route | #next-shell-route-heading | Product Hub | validation feedback visible |
| Leaderboard | Leaderboard | leaderboard controls | Main Menu | Challenge Leaderboard | no | Leaderboard Detail | records | no | no | tool-route | #next-shell-route-heading | Product Hub | route root disposed |
| Headless Bundle Viewer | Headless Bundle Viewer | load controls | Load Example Bundle, Main Menu | Headless Bundle Viewer | no | Bundle Detail | bundle status | no | no | tool-route | #next-shell-route-heading | Product Hub | example load does not instantiate Phaser |
| Tutorial Browser | Tutorial Browser | tutorial controls | Main Menu | Tutorial Browser | no | Tutorial Detail | route status | no | no | tool-route | #next-shell-route-heading | Product Hub | route root disposed |
| Planner Benchmark | Planner Benchmark | benchmark controls | Main Menu | Planner Benchmark | no | Benchmark Detail | scoring/planner boundary | no | no | benchmark-route | #next-shell-route-heading | Product Hub | no planner added |
| Adaptive Benchmark | Adaptive Benchmark | benchmark controls | Main Menu | Adaptive Benchmark | no | Adaptive Detail | scoring/planner boundary | no | no | benchmark-route | #next-shell-route-heading | Product Hub | no scoring change |

The next shell must not merge routes, leave prior route content visible, replace mature panels with debug placeholders, lose export/replay controls, or move normal content into debug-only panels.
