import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9387';

export const EXACT_TITLES = [
  'Environment Package Powers Generated Planning World',
  'Planning Execute Simulation Preserve One Environment Identity',
  'Browser and Headless Share Environment Artifact Samples',
  'Environment Package Runs From GitHub Pages Subpath'
];

test.setTimeout(240000);
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9387 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test(EXACT_TITLES[0], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await bootVisiblePlanning(page);
  const snap = await environmentSnapshot(page);
  assertEnvironmentDebug(snap.environmentDebug);
  expect(snap.environmentDebug.environmentPackageVersion).toBe('anchor-environment-env-pkg-r1');
  expect(snap.environmentDebug.environmentArtifactDigest).toBe(snap.levelEnvironmentArtifactDigest);
  expect(snap.environmentDebug.environmentManifestDigest).toBe(snap.levelEnvironmentManifestDigest);
  expect(snap.environmentDebug.environmentFieldCount).toBeGreaterThan(0);
  expect(snap.environmentDebug.environmentFieldRoleSummary.some((entry) => entry.fieldType === 'current')).toBe(true);
  expect(snap.currentDebug.currentPackageVersion).toBe('anchor-currents-flow-pkg-r1');
  expect(snap.currentDebug.currentArtifactDigest).toBe(snap.environmentDebug.currentFieldDigest);
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await bootVisiblePlanning(page);
  const planning = await environmentSnapshot(page);
  assertEnvironmentDebug(planning.environmentDebug);
  const execute = page.locator('#mission-console [data-action="execute"], #waypoint-timeline [data-action="execute"]').first();
  await expect(execute).toBeVisible({ timeout: 30000 });
  await execute.click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.environmentArtifactDigest ?? null), { timeout: 45000 }).toBe(planning.environmentDebug.environmentArtifactDigest);
  const launch = await page.evaluate(() => window.ANCHOR_SIMULATION_LAUNCH_DEBUG ?? {});
  expect(launch.environmentPackageVersion).toBe('anchor-environment-env-pkg-r1');
  expect(launch.environmentManifestDigest).toBe(planning.environmentDebug.environmentManifestDigest);
  expect(Object.values(launch.currentArtifactDigests ?? {})).toContain(planning.environmentDebug.currentFieldDigest);
  expect(launch.environmentArtifactBuildCount).toBeGreaterThanOrEqual(0);
  expect(launch.environmentValidationSummary?.valid).not.toBe(false);
  browserErrors.assertClean();
});

test(EXACT_TITLES[2], async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const bathymetry = await import('/packages/bathymetry/src/index.js');
    const currents = await import('/packages/currents/src/index.js');
    const scalarProcesses = await import('/packages/scalar-processes/src/index.js');
    const environment = await import('/packages/environment/src/index.js');
    const artifact = createFixtureEnvironment({ bathymetry, currents, scalarProcesses, environment });
    const sampler = environment.createEnvironmentSampler(artifact);
    const sampleA = environment.sampleEnvironment(sampler, 5, 5, 50, 50);
    const sampleB = environment.sampleEnvironment(sampler, 5, 5, 50, 50);
    const fixture = await (await fetch('/tests/fixtures/environment_package_r1_parity.json')).json();
    const expected = fixture.cases.find((entry) => entry.manifestConfigId === 'public-composed-environment');
    return {
      packageVersion: environment.PACKAGE_VERSION,
      artifactDigest: artifact.artifactDigest,
      expectedArtifactDigest: expected.environmentArtifactDigest,
      manifestDigest: artifact.manifestDigest,
      expectedManifestDigest: expected.environmentManifestDigest,
      componentDigests: environment.environmentComponentDigests(artifact),
      expectedComponentDigests: expected.componentDigests,
      sampleA: compactSample(sampleA),
      sampleB: compactSample(sampleB),
      expectedMiddleSample: expected.samples.find((sample) => sample.eastMeters === 5 && sample.northMeters === 5),
      validationStatus: artifact.validationReport.status,
      warningCount: artifact.validationReport.warnings.length
    };

    function createFixtureEnvironment({ bathymetry, currents, scalarProcesses, environment }) {
      const bathy = bathymetry.createBathymetryArtifact({
        id: 'environment-fixture-bathymetry',
        coordinateFrame: 'localEastNorthDown',
        bottomDepthMeters: [[120, 120], [120, 80]],
        wetMask: [[true, true], [true, true]],
        landMask: [[false, false], [false, false]],
        physicalExtentMeters: { east: 10, north: 10 },
        sourceMetadata: { sourceTier: 'manufacturedAnalytical', sourceType: 'manufactured', sourceId: 'environment-fixture-bathymetry', synthetic: true, calibratedBathymetry: false, operationalNavigationProduct: false }
      });
      const eastAxisMeters = [0, 5, 10];
      const northAxisMeters = [0, 10];
      const depthAxisMeters = [0, 40, 100];
      const timeAxisSeconds = [0, 100];
      const u = timeAxisSeconds.map((_time, ti) => depthAxisMeters.map((_depth, zi) => northAxisMeters.map((_north, yi) => eastAxisMeters.map((_east, xi) => round(0.1 + ti + zi * 0.2 + yi * 0.03 + xi * 0.01)))));
      const v = timeAxisSeconds.map((_time, ti) => depthAxisMeters.map((_depth, zi) => northAxisMeters.map((_north, yi) => eastAxisMeters.map((_east, xi) => round(-0.05 + ti * 0.1 - zi * 0.04 + yi * 0.02 - xi * 0.01)))));
      const current = currents.createCurrentField4D({
        id: 'environment-fixture-current-truth',
        coordinateFrame: 'localEastNorthDown',
        eastAxisMeters,
        northAxisMeters,
        depthAxisMeters,
        timeAxisSeconds,
        temporalBoundaryMode: 'bounded',
        validTimeStartSeconds: 0,
        validTimeEndSeconds: 100,
        uEastMetersPerSecond: u,
        vNorthMetersPerSecond: v,
        wetMask: [[true, true, true], [true, true, true]],
        bottomDepthMeters: [[120, 120, 120], [120, 90, 80]],
        sourceMetadata: { sourceTier: 'manufacturedAnalytical', sourceType: 'manufactured', sourceId: 'environment-fixture-current-truth', equationFamily: 'manufactured:environmentCurrentFixture', temporalBoundaryMode: 'bounded', validTimeStartSeconds: 0, validTimeEndSeconds: 100, hiddenTruthIncluded: false, synthetic: true, calibratedForecast: false, usesRealHycom: false, usesRealMarineCopernicus: false }
      });
      const xAxis = [0, 10];
      const yAxis = [0, 10];
      const scalarDepthAxisMeters = [0, 50, 100];
      const scalarTimeAxisSeconds = [0, 100];
      const scalarValue = scalarTimeAxisSeconds.map((timeSeconds) => scalarDepthAxisMeters.map((depthMeters) => yAxis.map((_north, yi) => xAxis.map((_east, xi) => round(1 + xi + yi * 2 + depthMeters * 0.02 + timeSeconds * 0.001)))));
      const scalar = scalarProcesses.createScalarField4D({
        id: 'environment-fixture-scalar-truth',
        coordinateFrame: 'localEastNorthDown',
        xAxis,
        yAxis,
        depthAxisMeters: scalarDepthAxisMeters,
        timeAxisSeconds: scalarTimeAxisSeconds,
        scalarValue,
        sourceMetadata: { sourceTier: 'manufacturedAnalytical', sourceType: 'manufactured', sourceId: 'environment-fixture-scalar-truth', variableId: 'scienceValue', units: 'normalized science value', processKind: 'manufactured:environmentScalarFixture', equationFamily: 'manufactured:environmentScalarFixture', synthetic: true, calibratedOceanForecast: false, calibratedBiogeochemicalForecast: false, hiddenTruthIncluded: false }
      });
      return environment.createEnvironmentArtifact({
        id: 'env-pkg-r1-public',
        seed: 'env-pkg-r1-fixture',
        generatorId: 'environmentPackageTestHelper',
        generatorVersion: 'env-pkg-r1',
        coordinateFrame: 'localEastNorthDown',
        operationalDomain: {
          id: 'environment-fixture-domain',
          coordinateFrame: 'localEastNorthDown',
          horizontal: { minEastMeters: 0, minNorthMeters: 0, widthMeters: 10, heightMeters: 10 },
          vertical: { minDepthMeters: 0, maxDepthMeters: 120 },
          time: { startSeconds: 0, durationSeconds: 100, dtSeconds: 10 }
        },
        bathymetry: bathy,
        currentFields: [current],
        scalarFields: [scalar],
        fieldRoles: {
          bathymetry: { epistemicRole: 'publicReference', publicVisibility: 'publicScenario' },
          currentFields: { [current.id]: { epistemicRole: 'truth', publicVisibility: 'publicScenario' } },
          scalarFields: { [scalar.id]: { epistemicRole: 'truth', publicVisibility: 'publicScenario' } }
        },
        claimBoundary: { synthetic: true, scientificallyConstrained: true, calibratedOceanProduct: false, operationalForecast: false, certifiedForNavigation: false }
      });
    }

    function compactSample(sample) {
      return {
        eastMeters: sample.eastMeters,
        northMeters: sample.northMeters,
        depthMeters: sample.depthMeters,
        timeSeconds: sample.timeSeconds,
        bathymetryBottomDepthMeters: sample.bathymetry?.bottomDepthMeters ?? null,
        currentFieldId: sample.current?.fieldId ?? null,
        currentU: sample.current?.uEastMetersPerSecond ?? null,
        currentV: sample.current?.vNorthMetersPerSecond ?? null,
        scalarValues: Object.fromEntries(Object.entries(sample.scalars ?? {}).map(([id, value]) => [id, value.value])),
        valid: sample.valid
      };
    }

    function round(value, digits = 8) {
      const number = Number(value);
      return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
    }
  });
  expect(result.packageVersion).toBe('anchor-environment-env-pkg-r1');
  expect(result.componentDigests).toEqual(result.expectedComponentDigests);
  expect(result.sampleA).toEqual(result.sampleB);
  expect(result.sampleA).toEqual(result.expectedMiddleSample);
  expect(result.validationStatus).toBe('WARN');
  expect(result.warningCount).toBeGreaterThan(0);
});

test(EXACT_TITLES[3], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const failedResponses = [];
  const moduleResponses = [];
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
    if (url.includes('/packages/environment/src/') || url.includes('/packages/bathymetry/src/') || url.includes('/packages/currents/src/') || url.includes('/packages/scalar-processes/src/')) {
      moduleResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] ?? '' });
    }
  });
  await bootVisiblePlanning(page, '/auv-glider-planner-game/');
  const snap = await environmentSnapshot(page);
  assertEnvironmentDebug(snap.environmentDebug);
  expect(moduleResponses.some((entry) => entry.url.includes('/packages/environment/src/index.js'))).toBe(true);
  expect(moduleResponses.some((entry) => entry.url.includes('/packages/currents/src/index.js'))).toBe(true);
  expect(moduleResponses.every((entry) => entry.status === 200 && (entry.contentType.includes('javascript') || entry.contentType.includes('text/plain') || entry.contentType.includes('application/octet-stream')))).toBe(true);
  expect(failedResponses).toEqual([]);
  browserErrors.assertClean();
});

async function bootVisiblePlanning(page, route = '/') {
  await page.goto(BASE + route);
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame)), { timeout: 30000 }).toBe(true);
  const challengeHub = page.locator('[data-hub-view="challenge"]').first();
  if (await challengeHub.count()) await challengeHub.click();
  await page.locator('[data-action="play-challenge"]').first().click();
  await expect(page.locator('[data-action="generate"]').first()).toBeVisible({ timeout: 30000 });
  await page.locator('[data-action="generate"]').first().click();
  await expect(page.locator('#bottom-timeline [data-action="time-slider"]')).toBeVisible({ timeout: 30000 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_ENVIRONMENT_GENERATOR_DEBUG?.environmentPackageVersion === 'anchor-environment-env-pkg-r1'), { timeout: 30000 }).toBe(true);
}

async function environmentSnapshot(page) {
  return page.evaluate(() => ({
    environmentDebug: window.ANCHOR_ENVIRONMENT_GENERATOR_DEBUG ?? null,
    currentDebug: window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? null,
    launchDebug: window.ANCHOR_SIMULATION_LAUNCH_DEBUG ?? null,
    levelEnvironmentArtifactDigest: window.anchorGame.state.level?.environmentArtifactDigest ?? window.anchorGame.state.level?.meta?.environmentArtifactDigest ?? null,
    levelEnvironmentManifestDigest: window.anchorGame.state.level?.meta?.environmentManifestDigest ?? null,
    levelComponentDigests: window.anchorGame.state.level?.componentDigests ?? window.anchorGame.state.level?.meta?.environmentComponentDigests ?? null
  }));
}

function assertEnvironmentDebug(debug) {
  expect(debug).toBeTruthy();
  expect(debug.environmentPackageVersion).toBe('anchor-environment-env-pkg-r1');
  expect(debug.environmentArtifactDigest).toMatch(/^fnv1a32:/);
  expect(debug.environmentManifestDigest).toMatch(/^fnv1a32:/);
  expect(['PASS', 'WARN']).toContain(debug.environmentValidationStatus);
  expect(debug.synthetic).toBe(true);
  expect(debug.calibratedOceanProduct).toBe(false);
  expect(debug.operationalForecast).toBe(false);
  expect(debug.certifiedForNavigation).toBe(false);
  expect(debug.usesRealHycom).toBe(false);
  expect(debug.usesRealMarineCopernicus).toBe(false);
  expect(debug.packageOwnsGenerationEquations).toBe(false);
  expect(debug.packageOwnsVisibilityPolicy).toBe(false);
  expect(debug.packageOwnsObservationNoise).toBe(false);
  expect(debug.packageOwnsSimulation).toBe(false);
  expect(debug.packageOwnsScoring).toBe(false);
  expect(debug.rendererOwnsEnvironmentTruth).toBe(false);
  expect(debug.packageUsesThree).toBe(false);
  expect(debug.packageUsesPhaser).toBe(false);
  expect(debug.packageUsesDom).toBe(false);
}