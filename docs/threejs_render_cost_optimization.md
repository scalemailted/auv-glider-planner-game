# Three.js Render-Cost Optimization

THREE-R1.2A.4.4 is a render-cost closure pass before continuous bathymetric seabed work. It does not change mission mechanics, canonical simulation cadence, scoring, planning, dive logic, sampling semantics, replay, or field values.

## Render-Cost Policy

`src/game/three/ThreeRenderCostPolicy.js` defines presentation-only quality profiles:

| Profile | Pixel-ratio cap | Presentation cadence | Current stride | Default field slabs |
|---|---:|---:|---:|---|
| Performance | 1.0 | 20 Hz | 3 | active layer only |
| Balanced | 1.25 | 30 Hz | 2 | active layer only |
| High | 2.0 | 60 Hz | 1 | high-detail presentation |

Quality profiles affect rendering only. They do not own simulation state, planning, scoring, hidden truth, route optimization, WebGPU, Python simulation, RL, or MARL.

## Implemented Optimizations

- One centralized `renderer.render()` submission path in `ThreeMissionWorldRenderer`.
- Optional nonblocking WebGL2 GPU timer using `EXT_disjoint_timer_query_webgl2` when available; unsupported mode reports null GPU values and continues.
- Render-on-demand for static planning, bounded presentation cadence for playing simulation, and camera-gesture render requests without canonical step changes.
- Balanced active/context slab LOD: one active textured slab plus low-cost context outlines by default.
- Pixel-ratio caps update in place without recreating the renderer.
- Safe static object transforms can be frozen while gliders, live trajectory heads, current glyphs, and selection remain dynamic.
- Current vector stride is presentation-only and profile-dependent.
- Performance debug separates frame interval, presentation update CPU duration, renderer submission CPU duration, and optional GPU duration.

## Debug Fields

`globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG` now includes frame interval average/p95/p99, CPU update/submission averages and p95s, GPU support and timing, rendered FPS, render calls per presentation frame, pixel ratio, transparent/texture/slab counts, static/dynamic object counts, visible/interactive object counts, quality profile, cadence, and performance gate status.

## Boundary

Reducing transparent overdraw does not remove canonical layers. Context-slab LOD does not alter water-column science. Surface waypoints and sampling targets keep their existing semantics. Headed performance evidence is environment-specific. Human manual QA by the project owner remains pending.

## THREE-R1.2B Terrain Cost Policy

Terrain uses a single indexed mesh plus bounded land/coastline/contour line geometry. Terrain builds are gated by bathymetry source/resolution changes and should not rebuild during camera gestures or ordinary simulation steps. Quality profiles may change presentation resolution or materials only; they must not change canonical bathymetry sampling or mission results.
