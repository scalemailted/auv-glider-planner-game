import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { artifactKindRegistry } from '../../packages/codecs/src/index.js';

const root = process.cwd();
const schemasDir = path.join(root, 'schemas');
const schemaFiles = readdirSync(schemasDir).filter((file) => file.endsWith('.schema.json')).sort();
assert.ok(schemaFiles.length >= 19, 'schema inventory is present');
const failures = [];
for (const file of schemaFiles) JSON.parse(readFileSync(path.join(schemasDir, file), 'utf8').replace(/^\uFEFF/, ''));
for (const entry of artifactKindRegistry().filter((item) => item.schemaId)) {
  const full = path.join(root, entry.schemaId);
  if (!existsSync(full)) {
    failures.push(`${entry.kind} schema missing: ${entry.schemaId}`);
    continue;
  }
  const schema = JSON.parse(readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
  const declaredTypes = new Set([
    ...(schema.properties?.type?.enum ?? []),
    ...(schema.properties?.type?.const ? [schema.properties.type.const] : []),
    ...(schema.describes ? [schema.describes] : [])
  ]);
  const schemaMentionsType = [...declaredTypes].some((item) => String(item).includes(entry.artifactType));
  if (entry.kind !== 'datasetManifest' && entry.kind !== 'demoArtifact' && declaredTypes.size && !schemaMentionsType) {
    failures.push(`${entry.kind} schema declares ${[...declaredTypes].join(' | ')}, registry says ${entry.artifactType}`);
  }
  const schemaVersion = schema.schemaVersion ?? schema.properties?.schemaVersion?.const ?? null;
  if (schemaVersion && entry.kind !== 'datasetManifest' && entry.kind !== 'demoArtifact' && String(schemaVersion) !== String(entry.currentVersion)) {
    failures.push(`${entry.kind} schema version ${schemaVersion}, registry says ${entry.currentVersion}`);
  }
}
assert.deepEqual(failures, []);
console.log(JSON.stringify({ ok: true, schemaCount: schemaFiles.length, registeredSchemas: artifactKindRegistry().filter((item) => item.schemaId).length }, null, 2));