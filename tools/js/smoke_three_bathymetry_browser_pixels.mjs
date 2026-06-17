import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

import { chromium } from 'playwright';

import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 820 },
  { label: 'mobile', width: 390, height: 844 }
];

await mkdir('test-results', { recursive: true });
const server = await startStaticServer({ port: 9323 });
const browser = await chromium.launch();
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    await page.goto('http://127.0.0.1:9323/');
    await page.waitForSelector('#main-menu-hub');
    await page.locator('#main-menu-hub [data-hub-view="simulation"]').first().click();
    await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').first().click();
    await page.waitForFunction(() => globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true, null, { timeout: 15_000 });
    await page.waitForSelector('.three-bathymetry-canvas');
    await page.waitForTimeout(250);
    await page.locator('.bathymetry-three-renderer-host').screenshot({ path: `test-results/gfx-r2-bathymetry-${viewport.label}.png` });
    const stats = await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => {
        const canvas = document.querySelector('.three-bathymetry-canvas');
        const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
        if (!canvas || !gl) {
          resolve({ hasCanvas: Boolean(canvas), hasGl: false });
          return;
        }
        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        const pixel = new Uint8Array(4);
        const unique = new Set();
        let nonTransparent = 0;
        let nonDark = 0;
        const cols = 18;
        const rows = 12;
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const x = Math.max(0, Math.min(width - 1, Math.floor((col + 0.5) * width / cols)));
            const y = Math.max(0, Math.min(height - 1, Math.floor((row + 0.5) * height / rows)));
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            const [r, g, b, a] = pixel;
            if (a > 0) nonTransparent += 1;
            if (r + g + b > 45) nonDark += 1;
            unique.add(`${r >> 4}:${g >> 4}:${b >> 4}:${a >> 4}`);
          }
        }
        resolve({ hasCanvas: true, hasGl: true, width, height, nonTransparent, nonDark, uniqueBucketCount: unique.size });
      });
    }));
    const debug = await page.evaluate(() => ({
      terrainVertexCount: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainVertexCount ?? 0,
      coastlineEdgeCount: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.coastlineEdgeCount ?? 0,
      usesThreeRenderer: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true,
      usesEnable3D: globalThis.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesEnable3D === true
    }));
    assert.equal(stats.hasCanvas, true, `${viewport.label} has Three canvas`);
    assert.equal(stats.hasGl, true, `${viewport.label} has WebGL context`);
    assert.ok(stats.width >= Math.min(320, viewport.width), `${viewport.label} canvas has width`);
    assert.ok(stats.height >= Math.min(320, viewport.height * 0.5), `${viewport.label} canvas has height`);
    assert.ok(stats.nonTransparent > 0, `${viewport.label} WebGL pixels are visible`);
    assert.ok(stats.uniqueBucketCount >= 2 || stats.nonDark > 0, `${viewport.label} WebGL pixels are nonblank`);
    assert.ok(debug.terrainVertexCount > 0, `${viewport.label} debug exposes terrain vertices`);
    assert.ok(debug.coastlineEdgeCount > 0, `${viewport.label} debug exposes coastline edges`);
    assert.equal(debug.usesThreeRenderer, true, `${viewport.label} debug marks Three renderer`);
    assert.equal(debug.usesEnable3D, false, `${viewport.label} debug excludes Enable3D`);
    console.log(`smoke_three_bathymetry_browser_pixels: ${viewport.label} ok`, { stats, debug });
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}