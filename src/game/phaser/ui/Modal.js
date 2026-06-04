import { PhaserButton } from './Button.js';

export class Modal {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);
    this.backdrop = scene.add.rectangle(0, 0, 1, 1, 0x06101d, 0.72).setOrigin(0, 0);
    this.backdrop.setInteractive();
    this.card = scene.add.rectangle(0, 0, 620, 360, 0x101b2e, 0.96)
      .setStrokeStyle(2, 0x6d86aa, 0.48);
    this.title = scene.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '22px',
      fontStyle: '700',
      color: '#eef6ff',
      wordWrap: { width: 560 }
    });
    this.body = scene.add.text(0, 0, '', {
      fontFamily: 'system-ui',
      fontSize: '15px',
      color: '#b9c7dc',
      lineSpacing: 6,
      wordWrap: { width: 560 }
    });
    this.container.add([this.backdrop, this.card, this.title, this.body]);
  }

  show({ title, body, buttons = [{ label: 'Close', onClick: () => this.hide() }] }) {
    this.clearButtons();
    const layout = this.layout();
    this.title.setText(title);
    this.body.setText(body);
    this.backdrop.setSize(layout.width, layout.height);
    this.card.setPosition(layout.cardX, layout.cardY).setSize(layout.cardWidth, layout.cardHeight);
    this.title
      .setPosition(layout.cardLeft + 30, layout.cardTop + 28)
      .setWordWrapWidth(layout.textWidth);
    this.body
      .setPosition(layout.cardLeft + 30, layout.cardTop + 76)
      .setWordWrapWidth(layout.textWidth);
    buttons.forEach((button, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = layout.cardLeft + 95 + column * 145;
      const y = layout.cardTop + layout.cardHeight - 56 + row * 46;
      const item = new PhaserButton(this.scene, {
        x,
        y,
        width: 132,
        label: button.label,
        onClick: () => {
          button.onClick?.();
          if (button.close !== false) this.hide();
        }
      });
      item.container.setDepth(1002);
      this.container.add(item.container);
      this.buttons.push(item);
    });
    this.container.setDepth(1000).setVisible(true);
    this.container.setAlpha(0);
    this.container.moveToTop?.(this.backdrop);
    this.scene.children.bringToTop(this.container);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 120 });
  }

  hide() {
    this.container.setVisible(false);
  }

  isVisible() {
    return Boolean(this.container?.visible);
  }

  clearButtons() {
    for (const button of this.buttons ?? []) button.destroy();
    this.buttons = [];
  }

  destroy() {
    this.clearButtons();
    this.container.destroy();
  }

  layout() {
    const width = Math.max(1, Number(this.scene.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scene.scale?.height ?? 820));
    const margin = Math.max(18, Math.min(42, width * 0.04));
    const cardWidth = Math.min(620, Math.max(280, width - margin * 2));
    const cardHeight = Math.min(360, Math.max(260, height - margin * 2));
    const cardX = width / 2;
    const cardY = height / 2;
    const cardLeft = cardX - cardWidth / 2;
    const cardTop = cardY - cardHeight / 2;
    return {
      width,
      height,
      cardWidth,
      cardHeight,
      cardX,
      cardY,
      cardLeft,
      cardTop,
      textWidth: Math.max(220, cardWidth - 60)
    };
  }
}
