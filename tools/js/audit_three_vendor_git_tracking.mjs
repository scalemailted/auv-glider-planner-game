import { existsSync } from 'node:fs';
import path from 'node:path';

import { REQUIRED_THREE_VENDOR_FILES, THREE_VENDOR_ROOT } from './three_vendor_files.mjs';
import { auditThreeVendorGitState, gitFileState, readThreeVendorManifest, runtimeFilesReferenceNodeModules } from './three_vendor_git_audit_lib.mjs';

const root = process.cwd();
const failures = [];
const warnings = [];
const manifest = await readThreeVendorManifest(root);
if (!manifest) failures.push('vendor/three/manifest.json must parse.');
for (const relative of REQUIRED_THREE_VENDOR_FILES) {
  if (!existsSync(path.join(root, THREE_VENDOR_ROOT, relative))) failures.push(`${THREE_VENDOR_ROOT}/${relative} is missing.`);
}
const audit = await auditThreeVendorGitState({
  root,
  requireTracked: process.env.CI === 'true' || process.argv.includes('--ci'),
  allowVisibleUntracked: process.env.CI !== 'true' && !process.argv.includes('--ci'),
  includeMetadata: true
});
failures.push(...audit.failures);
warnings.push(...audit.warnings);
failures.push(...await runtimeFilesReferenceNodeModules(root));
for (const file of [`${THREE_VENDOR_ROOT}/build/three.module.js`, `${THREE_VENDOR_ROOT}/build/three.core.js`]) {
  const state = gitFileState(file, { cwd: root });
  if (state.ignored) failures.push(`${file} is ignored: ${state.ignoreRule}`);
}
if (failures.length) {
  console.error('Three vendor Git tracking audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
for (const warning of warnings) console.warn(`WARN ${warning}`);
console.log('Three vendor Git tracking audit passed.', {
  manifestFiles: manifest?.files?.map((entry) => entry.path) ?? [],
  ciRequiresTracked: process.env.CI === 'true' || process.argv.includes('--ci')
});
