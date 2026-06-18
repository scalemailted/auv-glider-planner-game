import { test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { expectMainMenu, openAnchor } from './helpers/AnchorDomRuntimeHarness.js';

let server;

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('DOM runtime smoke opens the Product Hub without production Phaser', async ({ page }) => {
  await openAnchor(page);
  await expectMainMenu(page);
});
