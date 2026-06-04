import { createPanel } from './Panel.js';

export class LegendPanel {
  constructor(scene, { x = 18, y = 260, width = 210 } = {}) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(29);
    this.panel = createPanel(scene, { x, y, width, height: 268, title: 'Map Legend', alpha: 0.86 });
    this.container.add(this.panel.container);
    this.items = [];
    this.drawItems(x, y);
  }

  drawItems(x, y) {
    const entries = [
      ['water', 'Water / transit cell'],
      ['land', 'Land / blocked'],
      ['shallow', 'Shallow / depth tint'],
      ['roi', 'ROI hotspot'],
      ['hazard', 'Hazard'],
      ['mobile', 'Mobile hazard'],
      ['base', 'Deploy/base zone'],
      ['current', 'Current vector'],
      ['waypoint', 'Waypoint'],
      ['glider', 'Selected glider'],
      ['planned', 'Planned path'],
      ['actual', 'Actual path / drift']
    ];
    entries.forEach(([kind, label], index) => this.addItem(kind, label, x + 16, y + 38 + index * 18));
  }

  addItem(kind, label, x, y) {
    const g = this.scene.add.graphics().setDepth(30);
    drawSwatch(g, kind, x, y);
    const text = this.scene.add.text(x + 24, y - 7, label, {
      fontFamily: 'system-ui',
      fontSize: '11px',
      color: '#cfe0f4'
    }).setDepth(30);
    this.items.push(g, text);
  }

  destroy() {
    this.items.forEach((item) => item.destroy?.());
    this.container.destroy();
  }
}

function drawSwatch(g, kind, x, y) {
  if (kind === 'water') {
    g.fillStyle(0x1f7ea8, 0.9);
    g.fillRect(x, y - 7, 15, 14);
  } else if (kind === 'land') {
    g.fillStyle(0x536b43, 1);
    g.fillRect(x, y - 7, 15, 14);
  } else if (kind === 'shallow') {
    g.fillStyle(0x66d0c7, 0.7);
    g.fillRect(x, y - 7, 15, 14);
  } else if (kind === 'roi') {
    g.fillStyle(0xffd166, 0.85);
    g.fillCircle(x + 7, y, 7);
  } else if (kind === 'hazard') {
    g.lineStyle(2, 0xff6b6b, 0.95);
    g.strokeCircle(x + 7, y, 7);
  } else if (kind === 'mobile') {
    g.fillStyle(0xff4e5a, 0.2);
    g.fillCircle(x + 7, y, 8);
    g.lineStyle(2, 0xff9aa2, 0.9);
    g.strokeCircle(x + 7, y, 8);
  } else if (kind === 'base') {
    g.lineStyle(2, 0x54c7ec, 1);
    g.strokeCircle(x + 7, y, 7);
  } else if (kind === 'current') {
    g.lineStyle(2, 0xbef6ff, 0.9);
    g.beginPath();
    g.moveTo(x, y + 4);
    g.lineTo(x + 15, y - 4);
    g.strokePath();
    g.fillStyle(0xbef6ff, 0.9);
    g.fillCircle(x + 15, y - 4, 3);
  } else if (kind === 'waypoint') {
    g.fillStyle(0xffd166, 1);
    g.fillCircle(x + 7, y, 6);
  } else if (kind === 'glider') {
    g.fillStyle(0x54c7ec, 1);
    g.fillTriangle(x + 7, y - 8, x + 14, y + 7, x, y + 7);
  } else if (kind === 'planned') {
    g.lineStyle(4, 0xffd166, 0.95);
    g.lineBetween(x, y, x + 16, y);
  } else {
    g.lineStyle(3, 0xffffff, 0.82);
    g.lineBetween(x, y, x + 16, y);
  }
}
