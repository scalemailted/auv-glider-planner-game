import fs from 'node:fs/promises';
import path from 'node:path';
import { createReferenceBathymetryAtlas } from '../../src/core/editor/ReferenceBathymetryAtlas.js';

export async function loadReferenceAtlasFixtureContext(root = process.cwd()) {
  const manifest = await readJson(root, 'assets/reference_bathymetry/manifest.json');
  const overviewArtifact = await readJson(root, manifest.overview.overviewPath);
  const overviewRasterArtifact = await readJson(root, overviewArtifact.previewPath ?? manifest.overview.previewPath);
  const referenceFixtures = await Promise.all((manifest.fixtures ?? []).map(async (fixture) => ({
    ...fixture,
    rasterArtifact: await readJson(root, fixture.rasterPath)
  })));
  return {
    manifest,
    overviewArtifact,
    overviewRasterArtifact,
    referenceFixtures,
    atlas: createReferenceBathymetryAtlas({
      manifest,
      overviewArtifact,
      overviewRasterArtifact,
      referenceFixtures
    })
  };
}

export async function readJson(root, relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(root, String(relativePath).replaceAll('/', path.sep)), 'utf8'));
}
