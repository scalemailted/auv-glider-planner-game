export class NumericStepper {
  constructor(scene, {
    x,
    y,
    label,
    value,
    min = 0,
    max = 1,
    step = 1,
    precision = 0,
    onChange,
    enabled = true
  }) {
    this.scene = scene;
    this.min = Number(min);
    this.max = Number(max);
    this.step = Number(step);
    this.precision = Number(precision);
    this.onChange = onChange;
    this.enabled = Boolean(enabled);
    this.value = this.clamp(value);
    this.container = scene.add.container(x, y);
    this.objects = [];

    this.labelText = scene.add.text(0, 0, label, {
      fontFamily: 'system-ui',
      fontSize: '12px',
      fontStyle: '700',
      color: '#dcecff'
    }).setOrigin(0, 0.5);
    this.minus = this.makeButton(116, '-', () => this.adjust(-this.step));
    this.valueBox = scene.add.rectangle(154, 0, 52, 24, 0x101d31, 0.95)
      .setStrokeStyle(1, 0x6d86aa, 0.55);
    this.valueText = scene.add.text(154, 0, this.formatValue(), {
      fontFamily: 'system-ui',
      fontSize: '12px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0.5);
    this.plus = this.makeButton(192, '+', () => this.adjust(this.step));
    this.container.add([this.labelText, this.minus.background, this.minus.text, this.valueBox, this.valueText, this.plus.background, this.plus.text]);
    this.setEnabled(this.enabled);
  }

  makeButton(x, label, onClick) {
    const background = this.scene.add.rectangle(x, 0, 28, 24, 0x16243b, 0.95)
      .setStrokeStyle(1, 0x6d86aa, 0.62)
      .setInteractive();
    const text = this.scene.add.text(x, 0, label, {
      fontFamily: 'system-ui',
      fontSize: '15px',
      fontStyle: '700',
      color: '#eef6ff'
    }).setOrigin(0.5);
    background.on('pointerdown', () => {
      this.scene.suppressNextPointerUp = true;
      this.scene.uiPointerActive = true;
    });
    background.on('pointerover', () => {
      if (this.enabled) background.setFillStyle(0x223756, 0.98);
    });
    background.on('pointerout', () => {
      if (this.enabled) background.setFillStyle(0x16243b, 0.95);
    });
    background.on('pointerup', () => {
      this.scene.uiPointerActive = false;
      if (this.enabled) onClick();
    });
    return { background, text };
  }

  adjust(delta) {
    this.setValue(this.value + delta);
  }

  setValue(value, { silent = false } = {}) {
    this.value = this.clamp(value);
    this.valueText.setText(this.formatValue());
    if (!silent) this.onChange?.(this.value);
    return this;
  }

  getValue() {
    return this.value;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    const alpha = this.enabled ? 1 : 0.45;
    this.container.setAlpha(alpha);
    this.minus.background.setFillStyle(this.enabled ? 0x16243b : 0x273142, 0.95);
    this.plus.background.setFillStyle(this.enabled ? 0x16243b : 0x273142, 0.95);
    return this;
  }

  destroy() {
    this.container.destroy();
  }

  clamp(value) {
    const number = Number(value);
    const safe = Number.isFinite(number) ? number : this.min;
    const stepped = this.step > 0 ? Math.round(safe / this.step) * this.step : safe;
    return Number(Math.max(this.min, Math.min(this.max, stepped)).toFixed(this.precision + 2));
  }

  formatValue() {
    return Number(this.value).toFixed(this.precision);
  }
}
