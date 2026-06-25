import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9399';

export const EXACT_TITLES = [
  'Codec Package Runs From GitHub Pages Subpath'
];

test.setTimeout(120000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9399 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test(EXACT_TITLES[0], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await page.goto(`${BASE}/auv-glider-planner-game/`);
  const summary = await page.evaluate(async () => {
    const codecs = await import('/auv-glider-planner-game/packages/codecs/src/index.js');
    const plan = {
      schemaVersion: '2.0',
      type: 'anchor.plan',
      meta: { solverPacketDigest: 'fnv1a32:abcdef12' },
      agentPlans: [{ agentId: 'glider_01', selectedStart: { x: 0, y: 0 }, waypoints: [{ id: 'w1', x: 1, y: 1, t: 1, action: 'sample' }] }],
      planningMarkers: [],
      assumptions: { coordinateFrame: 'local-meters', timeUnits: 'seconds', depthConvention: 'positive-down meters' }
    };
    const encodedPlan = codecs.encodeArtifact('plan', plan, { createdAt: '2026-06-25T00:00:00.000Z' });
    const decodedPlan = codecs.decodeArtifact(encodedPlan.text, { kind: 'plan' });
    const result = {
      schemaVersion: '3.0',
      type: 'anchor.result',
      scoreResult: {
        version: 'score-result-score-pkg-r1',
        profileId: 'balancedMission',
        profileVersion: 'score-profile-score-pkg-r1',
        officialScore: 51,
        resultDigest: 'fnv1a32:11111111',
        scoreDigest: 'fnv1a32:22222222'
      },
      scoreArtifactIdentities: {
        artifactType: 'anchor.result',
        artifactVersion: '3.0',
        environmentDigest: 'fnv1a32:33333333',
        planDigest: encodedPlan.payloadDigest,
        simulationResultDigest: 'fnv1a32:44444444',
        scoreResultDigest: 'fnv1a32:11111111',
        scoreDigest: 'fnv1a32:22222222',
        scoreProfileId: 'balancedMission',
        scoreProfileVersion: 'score-profile-score-pkg-r1',
        visibilityClass: 'PUBLIC_OBSERVATION_ONLY',
        fairnessClass: 'PUBLIC_FAIR'
      },
      codecMetadata: {
        packageVersion: codecs.CODEC_PACKAGE_VERSION,
        artifactType: 'anchor.result',
        artifactVersion: '3.0',
        payloadDigest: codecs.canonicalJsonDigest({ score: 51 }),
        visibilityClass: 'PUBLIC_OBSERVATION_ONLY',
        fairnessClass: 'PUBLIC_FAIR'
      }
    };
    const resultInspection = codecs.inspectArtifact(result, { kind: 'result' });
    const malformed = codecs.decodeArtifact('{bad json', { kind: 'plan' });
    return {
      packageVersion: codecs.CODEC_PACKAGE_VERSION,
      planStatus: decodedPlan.status,
      planDigestPreserved: decodedPlan.payloadDigest === encodedPlan.payloadDigest,
      resultStatus: resultInspection.status,
      resultScore: resultInspection.scoreMetadata.officialScore,
      resultPlanDigest: resultInspection.identities.planDigest,
      fairnessClass: resultInspection.fairnessClass,
      visibilityClass: resultInspection.visibilityClass,
      malformedStatus: malformed.status,
      malformedFailureCode: malformed.failures[0]?.code ?? null
    };
  });
  expect(summary.packageVersion).toBe('anchor-codecs-codec-r1');
  expect(summary.planStatus).toBe('ACCEPTED');
  expect(summary.planDigestPreserved).toBe(true);
  expect(summary.resultStatus).toBe('ACCEPTED');
  expect(summary.resultScore).toBe(51);
  expect(summary.resultPlanDigest).toMatch(/^fnv1a32:/);
  expect(summary.fairnessClass).toBe('PUBLIC_FAIR');
  expect(summary.visibilityClass).toBe('PUBLIC_OBSERVATION_ONLY');
  expect(summary.malformedStatus).toBe('REJECTED');
  expect(summary.malformedFailureCode).toBe('INVALID_JSON');
  browserErrors.assertClean();
});