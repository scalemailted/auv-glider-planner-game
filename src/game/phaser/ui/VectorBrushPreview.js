import { cellToWorld } from '../PhaserCoreAdapter.js';

export class VectorBrushPreview {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.labels = [];
    this.active = false;
  }

  show({ layout, startCell, endCell, radius = 1, intensity = 0.4, scope = 'current', tool = 'directional' }) {
    this.clear();
    if (!layout || !startCell || !endCell) return;
    this.active = true;
    const start = cellToWorld(layout, startCell.x, startCell.y);
    const end = cellToWorld(layout, endCell.x, endCell.y);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distanceCells = Math.hypot(endCell.x - startCell.x, endCell.y - startCell.y);
    const magnitude = Math.min(2, Math.max(0, distanceCells * Number(intensity)));
    const color = tool === 'calm' ? 0x9cb4d8 : tool === 'vortex' ? 0xffd166 : 0x63e6be;

    this.graphics.fillStyle(0x54c7ec, 0.08);
    this.graphics.lineStyle(2, 0x54c7ec, 0.34);
    for (let y = startCell.y - radius; y <= startCell.y + radius; y += 1) {
      for (let x = startCell.x - radius; x <= startCell.x + radius; x += 1) {
        if (x < 0 || y < 0 || x >= layout.width || y >= layout.height) continue;
        if (Math.hypot(x - startCell.x, y - startCell.y) > radius) continue;
        this.graphics.fillRect(layout.ox + x * layout.cell + 3, layout.oy + y * layout.cell + 3, layout.cell - 6, layout.cell - 6);
      }
    }

    this.graphics.lineStyle(4, color, 0.92);
    this.graphics.beginPath();
    this.graphics.moveTo(start.x, start.y);
    this.graphics.lineTo(end.x, end.y);
    this.graphics.strokePath();
    drawArrowHead(this.graphics, start.x, start.y, end.x, end.y, color);
    this.graphics.lineStyle(3, color, 0.64);
    this.graphics.strokeCircle(start.x, start.y, Math.max(layout.cell * 0.5, radius * layout.cell));

    this.labels.push(this.scene.add.text(end.x + 12, end.y - 28, `${magnitude.toFixed(2)} | ${scope}`, {
      fontFamily: 'system-ui',
      fontSize: '14px',
      fontStyle: '700',
      color: '#eef6ff',
      backgroundColor: 'rgba(7,16,29,0.82)',
      padding: { left: 6, right: 6, top: 3, bottom: 3 }
    }));
    this.labels.push(this.scene.add.text(start.x + 12, start.y + 12, labelForTool(tool), {
      fontFamily: 'system-ui',
      fontSize: '12px',
      color: '#b9c7dc',
      backgroundColor: 'rgba(7,16,29,0.72)',
      padding: { left: 5, right: 5, top: 2, bottom: 2 }
    }));
  }

  clear() {
    this.graphics.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    this.active = false;
  }

  destroy() {
    this.clear();
    this.graphics.destroy();
  }
}

function drawArrowHead(graphics, sx, sy, ex, ey, color) {
  const angle = Math.atan2(ey - sy, ex - sx);
  const size = 14;
  const a = angle + Math.PI * 0.82;
  const b = angle - Math.PI * 0.82;
  graphics.fillStyle(color, 0.92);
  graphics.beginPath();
  graphics.moveTo(ex, ey);
  graphics.lineTo(ex + Math.cos(a) * size, ey + Math.sin(a) * size);
  graphics.lineTo(ex + Math.cos(b) * size, ey + Math.sin(b) * size);
  graphics.closePath();
  graphics.fillPath();
}

function labelForTool(tool) {
  if (tool === 'vortex') return 'Vortex / eddy';
  if (tool === 'corridor') return 'Current corridor';
  if (tool === 'calm') return 'Calm / clear';
  return 'Directional flow';
}
