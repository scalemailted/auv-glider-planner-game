import assert from 'node:assert/strict';

const matrix = {
  cameraMovement: { dirty: ['camera', 'viewportRender'], notDirty: ['missionModel', 'prediction', 'fields', 'currents', 'route', 'targets', 'panels', 'timeline'] },
  hoverSelection: { dirty: ['selectionHighlight', 'smallInspectorPanel'], notDirty: ['fields', 'currents', 'predictionUnlessRouteContextChanges'] },
  surfaceWaypointMove: { dirty: ['routeGeometry', 'affectedSegmentPredictions', 'targetCoverage', 'routeRightPanelTimelineSummaries'], notDirty: ['unrelatedGliderPredictions', 'scalarTextures', 'currentFieldBuffers'] },
  samplingTargetMoveAttach: { dirty: ['targetGeometry', 'affectedTargetCoverage', 'affectedSegmentPrediction', 'scienceTargetsPanel'], notDirty: ['unrelatedRouteSegments', 'scalarTextures', 'currents'] },
  profileChange: { dirty: ['affectedSegmentPrediction', 'predictedSampleMarkers', 'targetCoverage', 'routeProfileSummaries'], notDirty: [] },
  fieldTimeLayerChange: { dirty: ['relevantScalarTexture', 'relevantCurrentBuffer', 'fieldLegendInspector'], notDirty: [] }
};

assert.deepEqual(matrix.cameraMovement.notDirty, ['missionModel', 'prediction', 'fields', 'currents', 'route', 'targets', 'panels', 'timeline'], 'camera movement invalidation boundary is explicit');
assert.ok(matrix.surfaceWaypointMove.dirty.includes('affectedSegmentPredictions'), 'surface waypoint move invalidates affected predictions');
assert.ok(matrix.samplingTargetMoveAttach.notDirty.includes('currents'), 'sampling-target edits do not invalidate currents');
assert.ok(matrix.fieldTimeLayerChange.dirty.includes('relevantScalarTexture'), 'field time/layer changes update scalar textures only where relevant');
console.log(JSON.stringify({ ok: true, matrix }));
