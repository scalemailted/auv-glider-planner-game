export const PRODUCTION_PHASER_RETIREMENT_MANIFEST_VERSION = 'production-phaser-retirement-manifest-three-r2b';

export const PRODUCTION_PHASER_RETIREMENT_MANIFEST = Object.freeze({
  type: 'anchor.runtime.production-phaser-retirement-manifest',
  version: PRODUCTION_PHASER_RETIREMENT_MANIFEST_VERSION,
  phase: 'THREE-R2B',
  productionEntryPoint: 'src/game/main.js',
  phaserDependencyStillRequired: true,
  readyForFinalPhaserRemoval: false,
  dependencyRemovalAllowed: false,
  vendorRemovalAllowed: false,
  routeChangeAllowed: false,
  currentShellRole: 'Phaser remains the transitional scene lifecycle shell.',
  retiredProductionWorldRenderers: [
    {
      id: 'environment-editor-phaser-world-rendering',
      status: 'retiredFromNormalEditorPath',
      replacement: 'src/game/three/ThreeMissionEditorController.js + shared ThreeMissionWorldRenderer',
      note: 'EnvironmentEditorScene still hosts UI and Phaser lifecycle, but normal editor world presentation uses Three.js.'
    }
  ],
  retainedPhaserScenes: [
    'MainMenuScene',
    'MissionBriefingScene',
    'MissionWorkspaceScene',
    'SimulationScene',
    'DebriefScene',
    'EnvironmentEditorScene',
    'MissionReplayReviewScene'
  ],
  boundaryFlags: {
    usesThreeMissionEditorRenderer: true,
    legacyPhaserEditorWorldReachableInProduction: false,
    phaserOwnsMissionEditorState: false,
    rendererOwnsMissionEditorState: false,
    canonicalEditorDocumentIsAuthority: true,
    changesOfficialBrowserScoring: false,
    usesNewPlanner: false,
    usesWebGPUFluid: false
  }
});

export function productionPhaserRetirementManifest() {
  return JSON.parse(JSON.stringify(PRODUCTION_PHASER_RETIREMENT_MANIFEST));
}

export function productionPhaserRetirementSummary(patch = {}) {
  return {
    ...productionPhaserRetirementManifest(),
    activePhaserSceneKey: patch.activePhaserSceneKey ?? null,
    activeThreeEditorRendererCount: Number(patch.activeThreeEditorRendererCount ?? 0),
    activeLegacyPhaserEditorWorldRendererCount: Number(patch.activeLegacyPhaserEditorWorldRendererCount ?? 0),
    resourceCleanupStatus: patch.resourceCleanupStatus ?? 'UNKNOWN',
    ...patch
  };
}
