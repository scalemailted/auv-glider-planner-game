export class PhaserButton {
  constructor(scene, { x, y, width = 120, height = 34, label, onClick, style = {} }) {
    this.scene = scene;
    this.onClick = onClick;
    this.style = {
      fill: style.fill ?? 0x16243b,
      hoverFill: style.hoverFill ?? 0x223756,
      stroke: style.stroke ?? 0x6d86aa,
      text: style.text ?? 0xeef6ff,
      disabledFill: style.disabledFill ?? 0x273142,
      disabledText: style.disabledText ?? 0x8390a6
    };
    this.container = scene.add.container(x, y);
    this.background = scene.add.rectangle(0, 0, width, height, this.style.fill, 0.92)
      .setStrokeStyle(1, this.style.stroke, 0.65);
    this.text = scene.add.text(0, 0, label, {
      fontFamily: 'system-ui',
      fontSize: '13px',
      fontStyle: '700',
      color: toCss(this.style.text),
      align: 'center'
    }).setOrigin(0.5);
    this.container.add([this.background, this.text]);
    this.container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    this.container.on('pointerdown', () => {
      scene.suppressNextPointerUp = true;
      scene.uiPointerActive = true;
    });
    this.container.on('pointerover', () => {
      if (!this.disabled) this.background.setFillStyle(this.style.hoverFill, 0.96);
    });
    this.container.on('pointerout', () => {
      if (!this.disabled) this.background.setFillStyle(this.style.fill, 0.92);
    });
    this.container.on('pointerup', () => {
      scene.uiPointerActive = false;
      if (!this.disabled) this.onClick?.();
    });
  }

  setLabel(label) {
    this.text.setText(label);
    return this;
  }

  setDisabled(disabled) {
    this.disabled = Boolean(disabled);
    this.background.setFillStyle(this.disabled ? this.style.disabledFill : this.style.fill, 0.92);
    this.text.setColor(toCss(this.disabled ? this.style.disabledText : this.style.text));
    return this;
  }

  destroy() {
    this.container.destroy();
  }
}

export function toCss(color) {
  return `#${Number(color).toString(16).padStart(6, '0')}`;
}
