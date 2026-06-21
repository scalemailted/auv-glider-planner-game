import assert from 'node:assert/strict';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { buildEditorWorldRenderViewModel, editorWorldRenderViewModelSummary, validateEditorWorldRenderViewModel } from '../../src/core/rendering/EditorWorldRenderViewModel.js';

const { document } = createMissionEditorFixture();
const viewModel = buildEditorWorldRenderViewModel(document, { frameIndex: 0 });
const validation = validateEditorWorldRenderViewModel(viewModel);
assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.equal(viewModel.type, 'anchor.rendering.editor-world');
assert.equal(viewModel.phase, 'editor');
assert.equal(viewModel.boundaryFlags.editorDocumentIsAuthority, true);
assert.equal(viewModel.boundaryFlags.rendererOwnsEditorState, false);
assert.equal(viewModel.boundaryFlags.includesHiddenTruth, false);
assert.ok(viewModel.scalarFieldLayer.values.length > 0, 'editor renders scalar field from canonical frame');
assert.ok(viewModel.vectorFieldLayer.vectors.length > 0, 'editor renders vector field from canonical frame');
const summary = editorWorldRenderViewModelSummary(viewModel);
assert.equal(summary.usesThreeRenderer, true);
console.log('smoke_editor_world_render_view_model: PASS', JSON.stringify({ scalar: summary.missionWorld.scalarFieldCellCount, vectors: summary.missionWorld.currentVectorCount }));
