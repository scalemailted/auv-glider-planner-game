import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9401';

export const EXACT_TITLES = [
  'Notebook and Fixtures Load From Pages Subpath'
];

test.setTimeout(120000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9401 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test(EXACT_TITLES[0], async ({ page }) => {
  await page.goto(`${BASE}/auv-glider-planner-game/`);
  const summary = await page.evaluate(async () => {
    const paths = [
      '/auv-glider-planner-game/tools/python/notebooks/anchor_classical_planner_benchmark.ipynb',
      '/auv-glider-planner-game/tools/python/notebooks/anchor_external_solver_template.ipynb',
      '/auv-glider-planner-game/tests/fixtures/colab_benchmark/manifest.json',
      '/auv-glider-planner-game/tests/fixtures/colab_benchmark/static_additive_routing_solver_packet.json',
      '/auv-glider-planner-game/tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json',
      '/auv-glider-planner-game/tests/fixtures/colab_benchmark/colab_bench_r1_1_local_acceptance.json',
      '/auv-glider-planner-game/tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json',
      '/auv-glider-planner-game/tools/python/anchor_benchmark/bundle.py',
      '/auv-glider-planner-game/schemas/solver-packet.schema.json',
      '/auv-glider-planner-game/schemas/classical-planner-benchmark-bundle.schema.json',
      '/auv-glider-planner-game/schemas/plan.schema.json',
      '/auv-glider-planner-game/validation/manifest.json',
      '/auv-glider-planner-game/docs/classical_planner_benchmark_notebook.md'
    ];
    const results = [];
    for (const path of paths) {
      const response = await fetch(path);
      const text = await response.text();
      let parsed = null;
      if (path.endsWith('.json') || path.endsWith('.ipynb')) parsed = JSON.parse(text);
      results.push({
        path,
        status: response.status,
        contentType: response.headers.get('content-type'),
        bytes: text.length,
        parsedType: parsed?.type ?? parsed?.nbformat ?? null,
        text
      });
    }
    const notebook = results.find((item) => item.path.endsWith('anchor_classical_planner_benchmark.ipynb'));
    const packet = results.find((item) => item.path.endsWith('static_additive_routing_solver_packet.json'));
    const bundle = results.find((item) => item.path.endsWith('static_additive_routing.classical-planner-benchmark-bundle.json'));
    const plan = results.find((item) => item.path.endsWith('static_additive_astar.anchor.plan.json'));
    const evidence = results.find((item) => item.path.endsWith('colab_bench_r1_1_local_acceptance.json'));
    const manifest = results.find((item) => item.path.endsWith('manifest.json') && item.path.includes('colab_benchmark'));
    const pythonBundle = results.find((item) => item.path.endsWith('tools/python/anchor_benchmark/bundle.py'));
    return {
      results: results.map(({ text, ...item }) => item),
      notebookHasAlphaStatement: notebook.text.includes('ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox'),
      notebookHasBoundary: notebook.text.includes('Colab proposes. ANCHOR validates. ANCHOR simulates. ANCHOR scores.'),
      packetForecastOnly: packet.text.includes('"fairnessClass": "FORECAST_ONLY"'),
      bundleIsPublic4d: bundle.text.includes('"type": "anchor.classical-planner-benchmark-bundle"') && bundle.text.includes('"containsHiddenTruth": false') && bundle.text.includes('time->depth->north->east'),
      planIsAnchorPlan: plan.text.includes('"type": "anchor.plan"'),
      evidenceIsLocalVerified: evidence.text.includes('"status": "LOCAL_PYTHON_EXECUTION_VERIFIED"') && evidence.text.includes('"googleColabHostingSmoke": "PENDING"'),
      manifestListsFixtures: manifest.text.includes('static_additive_routing') && manifest.text.includes('regional_challenge'),
      pythonSupportAvailable: pythonBundle.text.includes('def load_benchmark_bundle') && pythonBundle.text.toLowerCase().includes('reference data-inspection sampler')
    };
  });

  for (const result of summary.results) {
    expect(result.status, result.path).toBe(200);
    expect(result.bytes, result.path).toBeGreaterThan(100);
    if (result.path.endsWith('.json') || result.path.endsWith('.ipynb')) {
      expect(result.contentType, result.path).toContain('application/json');
    }
  }
  expect(summary.notebookHasAlphaStatement).toBe(true);
  expect(summary.notebookHasBoundary).toBe(true);
  expect(summary.packetForecastOnly).toBe(true);
  expect(summary.bundleIsPublic4d).toBe(true);
  expect(summary.planIsAnchorPlan).toBe(true);
  expect(summary.evidenceIsLocalVerified).toBe(true);
  expect(summary.manifestListsFixtures).toBe(true);
  expect(summary.pythonSupportAvailable).toBe(true);
});
