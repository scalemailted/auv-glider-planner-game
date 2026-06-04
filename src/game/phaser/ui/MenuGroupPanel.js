import { PhaserButton } from './Button.js';

export class MenuGroupPanel {
  constructor(scene, { x, y, label, width = 124, items = [] }) {
    this.scene = scene;
    this.items = items;
    this.open = false;
    this.objects = [];
    this.button = new PhaserButton(scene, {
      x,
      y,
      width,
      height: 34,
      label,
      onClick: () => this.toggle()
    });
    this.button.container.setDepth(42);
    this.x = x;
    this.y = y;
    this.width = width;
  }

  toggle() {
    this.open ? this.close() : this.show();
  }

  show() {
    this.close();
    this.open = true;
    const itemHeight = 32;
    const height = this.items.length * itemHeight + 12;
    const panel = this.scene.add.rectangle(this.x - this.width / 2, this.y + 24, this.width + 28, height, 0x0c1728, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x6d86aa, 0.52)
      .setDepth(43);
    this.objects.push(panel);
    this.items.forEach((item, index) => {
      const button = new PhaserButton(this.scene, {
        x: this.x,
        y: this.y + 42 + index * itemHeight,
        width: this.width + 10,
        height: 26,
        label: item.label,
        onClick: () => {
          this.close();
          item.onClick?.();
        }
      });
      button.container.setDepth(44);
      if (item.disabled?.()) button.setDisabled(true);
      this.objects.push(button);
    });
  }

  close() {
    this.open = false;
    this.objects.forEach((object) => object.destroy?.());
    this.objects = [];
  }

  destroy() {
    this.close();
    this.button.destroy();
  }
}
