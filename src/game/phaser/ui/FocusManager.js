export class FocusManager {
  constructor(scene) {
    this.scene = scene;
    this.actions = [];
    this.index = 0;
    this.keys = scene.input.keyboard?.addKeys('TAB,ENTER,SPACE,ESC');
  }

  setActions(actions) {
    this.actions = actions;
  }

  update() {
    const Phaser = globalThis.Phaser;
    if (!Phaser || !this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.TAB)) {
      this.index = (this.index + 1) % Math.max(1, this.actions.length);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.actions[this.index]?.();
    }
  }
}
