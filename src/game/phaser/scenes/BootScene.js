const PhaserScene = globalThis.Phaser?.Scene ?? class {};

export class BootScene extends PhaserScene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.sys.game.anchorApp ??= globalThis.__anchorPhaserApp;
    this.sys.game.anchorApp.setSceneLabel('Boot');
    this.scene.start('MainMenuScene');
  }
}
