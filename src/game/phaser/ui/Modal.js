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
    this.bodyHitArea = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0);
    this.bodyMaskGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    this.bodyMask = this.bodyMaskGraphics.createGeometryMask();
    this.body.setMask(this.bodyMask);
    this.scrollbarTrack = scene.add.rectangle(0, 0, 4, 1, 0x223756, 0.72).setOrigin(0.5, 0);
    this.scrollbarThumb = scene.add.rectangle(0, 0, 4, 1, 0x8bdcf2, 0.82).setOrigin(0.5, 0);
    this.container.add([this.backdrop, this.card, this.title, this.body, this.bodyHitArea, this.scrollbarTrack, this.scrollbarThumb]);
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.bodyViewport = { x: 0, y: 0, width: 1, height: 1 };
    this.onWheel = (pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.isVisible() || this.maxScrollY <= 0) return;
      if (!pointInRect(pointer, this.bodyViewport)) return;
      this.setScrollY(this.scrollY + Number(deltaY ?? 0) * 0.65);
    };
    scene.input?.on?.('wheel', this.onWheel);
  }

  show({ title, body, buttons = [{ label: 'Close', onClick: () => this.hide() }] }) {
    this.clearButtons();
    this.pendingButtonCount = buttons.length || 1;
    this.scrollY = 0;
    this.title.setText(title);
    this.body.setText(body);
    const layout = this.layout();
    this.backdrop.setSize(layout.width, layout.height);
    this.card.setPosition(layout.cardX, layout.cardY).setSize(layout.cardWidth, layout.cardHeight);
    this.title
      .setPosition(layout.cardLeft + layout.padding, layout.cardTop + layout.padding)
      .setWordWrapWidth(layout.textWidth);
    this.body
      .setPosition(layout.bodyLeft, layout.bodyTop)
      .setWordWrapWidth(layout.bodyTextWidth);
    this.bodyHitArea
      .setPosition(layout.bodyLeft, layout.bodyTop)
      .setSize(layout.bodyWidth, layout.bodyHeight)
      .setInteractive();
    this.bodyViewport = {
      x: layout.bodyLeft,
      y: layout.bodyTop,
      width: layout.bodyWidth,
      height: layout.bodyHeight
    };
    this.bodyMaskGraphics.clear();
    this.bodyMaskGraphics.fillStyle(0xffffff, 1);
    this.bodyMaskGraphics.fillRect(layout.bodyLeft, layout.bodyTop, layout.bodyWidth, layout.bodyHeight);
    this.maxScrollY = Math.max(0, this.body.height - layout.bodyHeight);
    this.updateScrollbar(layout);
    buttons.forEach((button, index) => {
      const column = index % layout.buttonColumns;
      const row = Math.floor(index / layout.buttonColumns);
      const x = layout.footerLeft + layout.buttonWidth / 2 + column * (layout.buttonWidth + layout.buttonGap);
      const y = layout.footerTop + 18 + row * (layout.buttonHeight + layout.buttonGap);
      const item = new PhaserButton(this.scene, {
        x,
        y,
        width: layout.buttonWidth,
        height: layout.buttonHeight,
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
    this.scene.input?.off?.('wheel', this.onWheel);
    this.body.clearMask?.();
    this.bodyMaskGraphics.destroy();
    this.container.destroy();
  }

  layout() {
    const width = Math.max(1, Number(this.scene.scale?.width ?? 1280));
    const height = Math.max(1, Number(this.scene.scale?.height ?? 820));
    const margin = Math.max(18, Math.min(42, Math.min(width, height) * 0.04));
    const cardWidth = Math.min(720, Math.max(300, width - margin * 2));
    const cardHeight = Math.min(720, Math.max(280, Math.min(height - margin * 2, height * 0.86)));
    const cardX = width / 2;
    const cardY = height / 2;
    const cardLeft = cardX - cardWidth / 2;
    const cardTop = cardY - cardHeight / 2;
    const padding = Math.max(20, Math.min(30, cardWidth * 0.045));
    const titleHeight = Math.max(34, this.title.height || 34);
    const buttonGap = 10;
    const buttonHeight = 34;
    const minButtonWidth = 132;
    const maxButtonWidth = 172;
    const buttonColumns = Math.max(1, Math.min(3, Math.floor((cardWidth - padding * 2 + buttonGap) / (minButtonWidth + buttonGap))));
    const buttonWidth = Math.min(maxButtonWidth, Math.max(minButtonWidth, (cardWidth - padding * 2 - buttonGap * (buttonColumns - 1)) / buttonColumns));
    const buttonRows = Math.max(1, Math.ceil((this.pendingButtonCount ?? 1) / buttonColumns));
    const footerHeight = buttonRows * buttonHeight + (buttonRows - 1) * buttonGap + 12;
    const headerBottom = cardTop + padding + titleHeight + 12;
    const footerTop = cardTop + cardHeight - padding - footerHeight;
    const bodyTop = headerBottom;
    const bodyHeight = Math.max(72, footerTop - bodyTop - 14);
    const bodyWidth = Math.max(180, cardWidth - padding * 2);
    return {
      width,
      height,
      cardWidth,
      cardHeight,
      cardX,
      cardY,
      cardLeft,
      cardTop,
      padding,
      textWidth: Math.max(220, cardWidth - padding * 2),
      bodyLeft: cardLeft + padding,
      bodyTop,
      bodyWidth,
      bodyHeight,
      bodyTextWidth: Math.max(180, bodyWidth - 10),
      footerLeft: cardLeft + padding,
      footerTop,
      footerHeight,
      buttonColumns,
      buttonWidth,
      buttonHeight,
      buttonGap
    };
  }

  setScrollY(value) {
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, Number(value) || 0));
    this.body.setY(this.bodyViewport.y - this.scrollY);
    this.updateScrollbar();
  }

  updateScrollbar(layout = null) {
    const viewport = layout
      ? { x: layout.bodyLeft, y: layout.bodyTop, width: layout.bodyWidth, height: layout.bodyHeight }
      : this.bodyViewport;
    const visible = this.maxScrollY > 1;
    this.scrollbarTrack.setVisible(visible);
    this.scrollbarThumb.setVisible(visible);
    if (!visible) return;
    const trackX = viewport.x + viewport.width - 3;
    const trackHeight = viewport.height;
    const thumbHeight = Math.max(24, trackHeight * (trackHeight / Math.max(trackHeight, this.body.height)));
    const travel = Math.max(1, trackHeight - thumbHeight);
    const progress = this.maxScrollY > 0 ? this.scrollY / this.maxScrollY : 0;
    this.scrollbarTrack
      .setPosition(trackX, viewport.y)
      .setSize(4, trackHeight);
    this.scrollbarThumb
      .setPosition(trackX, viewport.y + progress * travel)
      .setSize(4, thumbHeight);
  }
}

function pointInRect(point, rect) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  return Number.isFinite(x) && Number.isFinite(y)
    && x >= rect.x
    && x <= rect.x + rect.width
    && y >= rect.y
    && y <= rect.y + rect.height;
}
