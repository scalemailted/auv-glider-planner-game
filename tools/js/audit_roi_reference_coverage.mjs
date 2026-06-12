#!/usr/bin/env node
import {
  CA_TAXONOMY_FAMILIES,
  ROI_REFERENCE_MODEL_CATALOG,
  REQUIRED_REFERENCE_SIGNATURE_IDS,
  referenceSignatureCoverageMatrix
} from '../../src/core/demo/roi/RoiReferenceModelCatalog.js';
import { ROI_REFERENCE_SIGNATURES } from '../../src/core/demo/roi/RoiReferenceSignatures.js';

const failures = [];
const warnings = [];
const signatureIds = new Set(ROI_REFERENCE_SIGNATURES.map((signature) => signature.id));
const modelIds = new Set();
const duplicateModelIds = [];

for (const model of ROI_REFERENCE_MODEL_CATALOG) {
  if (modelIds.has(model.id)) duplicateModelIds.push(model.id);
  modelIds.add(model.id);
  if (!signatureIds.has(model.mapsToSignature)) failures.push(`model ${model.id} maps to missing signature ${model.mapsToSignature}`);
  if (!model.caTaxonomy) failures.push(`model ${model.id} missing caTaxonomy`);
}

for (const id of REQUIRED_REFERENCE_SIGNATURE_IDS) {
  if (!signatureIds.has(id)) failures.push(`missing required signature ${id}`);
}

for (const signature of ROI_REFERENCE_SIGNATURES) {
  if (!signature.componentDefaults || !Object.keys(signature.componentDefaults).length) failures.push(`${signature.id} missing componentDefaults`);
  if (!signature.qaExpectations) failures.push(`${signature.id} missing qaExpectations`);
  if (!signature.roiInterpretation) failures.push(`${signature.id} missing roiInterpretation`);
  if (!signature.caTaxonomy) failures.push(`${signature.id} missing caTaxonomy`);
  if (!signature.phenotypeMetrics) failures.push(`${signature.id} missing phenotypeMetrics`);
  if (!signature.genotypeNotes) failures.push(`${signature.id} missing genotypeNotes`);
  const models = ROI_REFERENCE_MODEL_CATALOG.filter((model) => model.mapsToSignature === signature.id);
  if (!models.length) failures.push(`${signature.id} has no catalog models`);
}

for (const family of CA_TAXONOMY_FAMILIES) {
  const models = ROI_REFERENCE_MODEL_CATALOG.filter((model) => model.caTaxonomyFamilies?.includes(family));
  if (!models.length) warnings.push(`CA family has no models: ${family}`);
}

if (duplicateModelIds.length) failures.push(`duplicate model IDs: ${duplicateModelIds.join(', ')}`);

const matrix = referenceSignatureCoverageMatrix(ROI_REFERENCE_SIGNATURES);
console.log('ROI Reference Coverage Audit');
console.log(`- signatures: ${ROI_REFERENCE_SIGNATURES.length}`);
console.log(`- reference models: ${ROI_REFERENCE_MODEL_CATALOG.length}`);
console.log('- model counts by signature:');
for (const signature of ROI_REFERENCE_SIGNATURES) {
  console.log(`  ${signature.id}: ${matrix.coverageBySignature[signature.id]?.length ?? 0}`);
}
console.log('- model counts by CA family:');
for (const [family, ids] of Object.entries(matrix.coverageByCaFamily)) {
  console.log(`  ${family}: ${ids.length}`);
}
console.log('- model counts by model family:');
for (const [family, ids] of Object.entries(matrix.coverageByModelFamily)) {
  console.log(`  ${family}: ${ids.length}`);
}
console.log(`- coverage tags: ${matrix.coverageTags.join(', ')}`);

if (warnings.length) {
  console.warn('Warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('Structural failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ROI reference coverage audit passed');
