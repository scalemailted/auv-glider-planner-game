import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForDefaultPhaserApp } from './helpers/SmokeSpecShared.js';

let server;

test.setTimeout(120000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Product Hub Opens Methods and Validation', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openMethodsValidation(page, '/');

  await expect(page.locator('#methods-validation-route')).toContainText('Official Validation Baseline');
  await expect(page.locator('#methods-validation-route')).toContainText("Evidence for how ANCHOR's models are implemented, tested, reproduced, and bounded.");
  await expect(page.locator('[data-action="validation-mode-learn"]')).toHaveText('Plain Language');
  await expect(page.locator('[data-action="validation-mode-research"]')).toHaveText('Technical Detail');
  await expect(page.locator('#methods-validation-route')).toContainText('No universal scientific-validity score is used.');
  await expect(page.locator('.methods-validation-components')).toContainText('Currents');
  await expect(page.locator('#methods-validation-route')).not.toContainText(/Validation Lab|Validation Simulation|Validation Lesson|Validation Tutorial|Validation Experiment/);
  await expect(page.locator('.methods-validation-overview')).toContainText('Pass');
  const debug = await validationDebug(page);
  expect(debug.officialBaselineLoaded).toBe(true);
  expect(debug.componentCount).toBeGreaterThanOrEqual(8);
  expect(debug.universalValidityScoreUsed).toBe(false);
  expect(debug.hiddenTruthExposed).toBe(false);
  errors.assertClean();
});

test('Component Claims Metrics and Limitations Are Inspectable', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openMethodsValidation(page, '/');

  await page.locator('[data-component-id="currents"]').click();
  await page.locator('[data-action="validation-mode-research"]').click();
  await page.locator('.methods-claim-button').filter({ hasText: 'Physically Plausible' }).first().click();

  const detail = page.locator('.methods-validation-detail');
  await expect(detail).toContainText('Result Status:');
  await expect(detail).toContainText('Evidence Level: Physically Plausible');
  await expect(detail).toContainText('Measured Result');
  await expect(detail).toContainText('Acceptance Criterion');
  await expect(detail).toContainText('Threshold Rationale');
  await expect(detail).toContainText('Known Limitations');
  await expect(detail).toContainText('References & Provenance');
  await expect(detail).toContainText('What this does not establish');
  await expect(detail).toContainText('Evidence digest');
  await expect(page.locator('.methods-validation-table')).toContainText('Evidence Level');
  await expect(page.locator('.methods-validation-table')).toContainText('Result Status');
  await expect(page.locator('.methods-validation-svg')).toBeVisible();
  errors.assertClean();
});

test('Official Baseline and Exploratory Rerun Stay Distinct', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openMethodsValidation(page, '/');

  const beforeDigest = (await validationDebug(page)).officialBaselineDigest;
  await page.locator('[data-action="run-validation-exploratory"]').click();
  await expect(page.locator('#methods-validation-route')).toContainText('Exploratory local reruns do not modify the official ANCHOR validation baseline.');
  await expect(page.locator('.methods-validation-exploratory')).toContainText('Exploratory Local Rerun');
  await expect(page.locator('.methods-validation-exploratory')).toContainText('Official report unchanged: true');
  const after = await validationDebug(page);
  expect(after.officialBaselineDigest).toBe(beforeDigest);
  expect(after.exploratoryRerunCount).toBe(1);
  expect(after.lastExploratoryRerunStatus).toBe('MATCHED_OFFICIAL_DIGEST');
  expect(after.officialReportsMutable).toBe(false);
  errors.assertClean();
});

test('Methods and Validation Runs From Pages Subpath', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await openMethodsValidation(page, '/auv-glider-planner-game/');

  await expect(page.locator('#methods-validation-route')).toContainText('Methods & Validation');
  await expect(page.locator('.methods-validation-plot')).toContainText('Evidence Overview');
  await expect(page.locator('[data-action="download-validation-plot-data"]')).toBeVisible();
  const debug = await validationDebug(page);
  expect(debug.officialBaselineLoaded).toBe(true);
  expect(debug.packageUsesDom).toBe(false);
  expect(debug.packageUsesThree).toBe(false);
  errors.assertClean();
});

async function openMethodsValidation(page, path) {
  await page.goto(path);
  await waitForDefaultPhaserApp(page);
  await expect(page.locator('#main-menu-hub')).toContainText('Challenge Mode');
  await expect(page.locator('#main-menu-hub')).toContainText('Simulation Lab');
  await expect(page.locator('#main-menu-hub')).toContainText('Learning Labs');
  await expect(page.locator('#main-menu-hub')).toContainText('Methods & Validation');
  await expect(page.locator('#main-menu-hub')).toContainText('Inspect model assumptions, numerical tests, reference comparisons, provenance, and known limitations.');
  await page.locator('#main-menu-hub [data-action="methods-validation"]').first().click();
  await expect(page.locator('#methods-validation-route')).toBeVisible({ timeout: 20000 });
  await expect.poll(() => page.evaluate(() => globalThis.ANCHOR_SCIENTIFIC_VALIDATION_DEBUG?.officialBaselineLoaded === true), { timeout: 20000 }).toBe(true);
}

async function validationDebug(page) {
  return page.evaluate(() => globalThis.ANCHOR_SCIENTIFIC_VALIDATION_DEBUG ?? {});
}
