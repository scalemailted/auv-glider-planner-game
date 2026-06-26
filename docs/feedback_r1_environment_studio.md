# ENV-STUDIO-R1 Feedback Response

ENV-STUDIO-R0 converted Alpha tester feedback about environment creation into a staged, reproducible Environment Studio plan. ENV-STUDIO-R1 adds the visible browser thin slice for that plan. It does not change simulation, scoring, current generation, scalar generation, generated mission semantics, or existing Alpha workflows.

## Feedback Classification

The feedback is not a P0/P1 release blocker for the current Alpha because the Guided Mission, benchmark, solver-packet, Colab, Methods & Validation, and diagnostic workflows still operate on the curated deterministic environments.

It is classified as:

| Tag | Classification | Reason |
| --- | --- | --- |
| `P2` | Significant workflow gap | Testers need a clearer way to create and reproduce custom synthetic environments without editing code or JSON by hand. |
| `BENCH` | Benchmark artifact concern | External planners and classroom studies need stable environment identities, digests, and validation reports. |
| `EDU` | Teaching concern | Learners need to see how domain size, bathymetry, currents, scalar layers, and validation fit together. |
| `SCI` | Scientific assumption concern | Authored environments need explicit synthetic/not-calibrated boundaries and reproducible component provenance. |

## Product Decision

The product should have one unified **Environment Studio**, not separate editors for bathymetry, currents, scalar fields, and mission scenarios.

Placement:

```text
Product Hub -> Simulation Lab -> Environment Studio
```

Environment Studio should not become a fifth Product Hub pillar. The four Alpha pillars remain stable.

## What R0 Implements

R0 adds a pure contract layer and a focused Node smoke:

- normalized domain specs with rows/columns derived from physical size and resolution;
- browser-friendly cell-count limits;
- bathymetry archetype specs;
- bathymetry tile manifests;
- edge profile validation;
- mosaic manifests;
- seam validation helpers;
- edit provenance;
- dependency graph states;
- validation report digests;
- hidden-truth rejection;
- codec-friendly canonical JSON checks.

Implementation entry points:

- `src/core/editor/EnvironmentStudioContracts.js`
- `tools/js/smoke_environment_studio_contracts.mjs`

## What R0 Does Not Implement

R0 intentionally does not:

- add freeform terrain sculpting;
- regenerate currents or scalar fields from edited bathymetry;
- modify generated environment equations;
- change official scoring;
- change mission generation semantics;
- expose hidden truth;
- add WebGPU, NetCDF, backend services, or ML workflows;
- create multiple editor apps.

## What R1 Implements

Implemented browser thin slice:

```text
ENV-STUDIO-R1 - Unified Environment Studio Browser Thin Slice
```

Scope:

1. Add one Simulation Lab entry: `Environment Studio`.
2. Show a domain setup panel with width, height, resolution, depth layers, and time span.
3. Show deterministic bathymetry archetype and seed controls using the R0 contract.
4. Show a compact tile preview and a simple 2x2 mosaic preview as a low-risk read-only surface.
5. Export and import Environment Studio JSON artifacts with canonical digests.
6. Show the validation report and dependency graph state.
7. Publish `globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG` for route, digest, validation, dependency, and cleanup checks.
8. Do not run missions from edited environments until a later adapter explicitly maps the Studio artifact into existing environment loaders.

R1 still avoids changing simulation, scoring, and scientific equations. It focuses on making the contract visible and round-trippable in the browser.
