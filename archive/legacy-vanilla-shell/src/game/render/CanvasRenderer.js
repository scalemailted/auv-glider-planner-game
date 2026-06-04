import { clamp } from '../../core/math/MathUtils.js';
import { buildPlanningGuidance } from '../../core/planning/PlanningGuidance.js';
import { getPlanningFrame } from '../../core/sim/ChallengeMode.js';
import { getFrameAtTime } from '../../core/time/MissionTime.js';

export function createRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');

  return {
    canvas,
    ctx,
    state,
    _map: null,

    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#08111f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },

    drawTitleCard(title, subtitle) {
      this.clear();
      ctx.fillStyle = '#eef6ff';
      ctx.font = 'bold 38px system-ui';
      ctx.fillText(title, 60, 110);
      ctx.fillStyle = '#9cb4d8';
      ctx.font = '20px system-ui';
      ctx.fillText(subtitle, 62, 150);
      this.drawLegend([
        ['#54c7ec', 'base/start'],
        ['#ffd166', 'planned path'],
        ['#ffffff', 'actual path'],
        ['#ff6b6b', 'hazard']
      ]);
    },

    drawLevelPreview(level) {
      this.drawMap({ level, mission: state.mission, challengeMode: state.challengeMode, revealTruth: state.ui.revealTruth, showConfidence: state.ui.showConfidence, preview: true });
    },

    drawPlanningMap(gameState) {
      this.drawMap({
        level: gameState.level,
        mission: gameState.mission,
        plan: gameState.plan,
        selectedAgentId: gameState.selectedAgentId,
        surfacedAgents: gameState.surfacedAgents,
        selectedWaypoint: gameState.ui.selectedWaypoint,
        selectedWindow: gameState.selectedWindow,
        hoverCell: gameState.ui.hoverCell,
        guidanceSettings: {
          showGuidance: gameState.ui.showGuidance,
          showDrift: gameState.ui.showDriftCone,
          showReachable: gameState.ui.showReachableArea,
          showSurfacing: gameState.ui.showPredictedSurfacing
        },
        time: gameState.planningTime ?? 0,
        challengeMode: gameState.challengeMode,
        revealTruth: gameState.ui.revealTruth,
        showConfidence: gameState.ui.showConfidence
      });
    },

    drawSimulation(gameState, engine) {
      this.drawMap({
        level: gameState.level,
        mission: gameState.mission,
        plan: gameState.plan,
        engine,
        time: engine?.t ?? 0
      });
    },

    drawDebrief(result) {
      this.clear();
      const summary = result?.summary ?? {};
      ctx.fillStyle = '#eef6ff';
      ctx.font = 'bold 30px system-ui';
      ctx.fillText('Mission Debrief', 60, 90);
      ctx.font = '18px system-ui';
      ctx.fillText(`Final Score: ${summary.finalScore ?? 0}`, 62, 130);
      ctx.fillText(`Sample: ${summary.sampleScore ?? 0}`, 62, 160);
      ctx.fillText(`Energy: ${summary.energyUsed ?? 0}`, 62, 190);
      ctx.fillText(`Hazards: ${summary.hazardsHit ?? 0}`, 62, 220);
      ctx.fillText(`Elapsed: ${summary.elapsedTime ?? 0}s`, 62, 250);
    },

    drawMap({ level, mission = null, plan = null, selectedAgentId = null, surfacedAgents = [], selectedWaypoint = null, selectedWindow = null, hoverCell = null, guidanceSettings = null, challengeMode = 'perfectKnowledge', revealTruth = false, showConfidence = false, engine = null, preview = false, time = 0 }) {
      this.clear();
      if (!level) return;

      const layout = getMapLayout(canvas, level.world.grid);
      const frame = engine
        ? getTruthFrame(level, time)
        : getPlanningFrame(level, time, { challengeMode, revealTruth });
      this._map = layout;

      drawCells(ctx, level, frame, layout);
      if (showConfidence && !engine) drawConfidenceOverlay(ctx, frame, layout);
      drawCurrents(ctx, frame, layout);
      drawBases(ctx, level, layout);
      if (!engine && guidanceSettings?.showGuidance !== false) {
        drawPlanningGuidance(ctx, buildPlanningGuidance({
          level,
          mission,
          plan,
          selectedAgentId,
          selectedWaypoint,
          selectedWindow,
          time,
          challengeMode,
          revealTruth,
          surfacedAgents,
          hoverCell,
          settings: guidanceSettings
        }), layout);
      }
      drawAgentStarts(ctx, mission, selectedAgentId, layout, surfacedAgents);
      drawPlan(ctx, plan, selectedAgentId, selectedWaypoint, selectedWindow, layout);
      drawSampledCells(ctx, engine, layout);
      drawEnginePaths(ctx, engine, layout);
      drawMapLabels(ctx, level, preview, layout);
      drawChallengeModeLabel(ctx, challengeMode, frame?.source ?? 'truth', revealTruth, layout);
      this.drawLegend([
        ['#2f405c', 'low ROI'],
        ['#ffd166', 'waypoint'],
        ['#63e6be', 'active/sampled'],
        ['#54c7ec', 'glider start'],
        ['#ff6b6b', 'hazard']
      ]);
    },

    drawLegend(items) {
      const x = 28;
      let y = canvas.height - items.length * 24 - 18;
      ctx.font = '13px system-ui';
      for (const [color, label] of items) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 11, 14, 14);
        ctx.fillStyle = '#c8d8ee';
        ctx.fillText(label, x + 22, y);
        y += 24;
      }
    },

    canvasEventToCell(event, level) {
      if (!this._map || !level) {
        this.drawMap({ level, mission: state.mission, plan: state.plan });
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (event.clientX - rect.left) * scaleX;
      const py = (event.clientY - rect.top) * scaleY;
      const { ox, oy, cell, width, height } = this._map;
      const x = Math.floor((px - ox) / cell);
      const y = Math.floor((py - oy) / cell);

      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return { x, y };
    }
  };
}

function getMapLayout(canvas, grid) {
  const pad = 44;
  const cell = Math.floor(Math.min((canvas.width - pad * 2) / grid.width, (canvas.height - pad * 2) / grid.height));
  const ox = Math.floor((canvas.width - cell * grid.width) / 2);
  const oy = Math.floor((canvas.height - cell * grid.height) / 2);
  return { ox, oy, cell, width: grid.width, height: grid.height };
}

function getTruthFrame(level, time) {
  const frames = level.layers.truth.frames ?? [];
  const dt = level.world.time.dt || 1;
  const frame = getFrameAtTime(frames, time, dt);
  return frame ? { ...frame, source: 'truth' } : null;
}

function drawCells(ctx, level, frame, layout) {
  drawWaterBackground(ctx, layout);
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const terrain = level.layers.terrain?.[y]?.[x] ?? 0;
      const hazard = level.layers.hazards?.[y]?.[x] ?? 0;
      const roi = frame?.roi?.[y]?.[x] ?? 0;
      const px = layout.ox + x * layout.cell;
      const py = layout.oy + y * layout.cell;

      if (terrain) drawLandCell(ctx, px, py, layout.cell, x, y);
      else drawWaterCell(ctx, px, py, layout.cell, roi, x, y);

      if (hazard > 0) {
        drawHazardCell(ctx, px, py, layout.cell);
      }

      ctx.strokeStyle = 'rgba(220,245,255,0.08)';
      ctx.strokeRect(px, py, layout.cell, layout.cell);
    }
  }
}

function drawCurrents(ctx, frame, layout) {
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const vector = frame?.current?.[y]?.[x] ?? [0, 0];
      const magnitude = Math.min(1.4, Math.hypot(vector[0], vector[1]));
      ctx.strokeStyle = `rgba(210,245,255,${0.18 + magnitude * 0.36})`;
      ctx.fillStyle = `rgba(210,245,255,${0.18 + magnitude * 0.36})`;
      ctx.lineWidth = 1 + magnitude * 1.5;
      const cx = layout.ox + (x + 0.5) * layout.cell;
      const cy = layout.oy + (y + 0.5) * layout.cell;
      drawCurrentStroke(ctx, cx, cy, vector, layout.cell);
    }
  }
  ctx.lineWidth = 1;
}

function drawBases(ctx, level, layout) {
  for (const base of level.layers.bases ?? []) {
    ctx.strokeStyle = '#54c7ec';
    ctx.fillStyle = 'rgba(84,199,236,0.12)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cellX(layout, base.x), cellY(layout, base.y), layout.cell * (base.radius ?? 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#eef6ff';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('BASE', cellX(layout, base.x) + 8, cellY(layout, base.y) - 8);
  }
  ctx.lineWidth = 1;
}

function drawAgentStarts(ctx, mission, selectedAgentId, layout, surfacedAgents = []) {
  for (const agent of mission?.agents ?? []) {
    const surfaced = surfacedAgents.find((candidate) => candidate.id === agent.id);
    const selected = agent.id === selectedAgentId;
    const x = cellX(layout, surfaced?.x ?? agent.start?.x ?? 0);
    const y = cellY(layout, surfaced?.y ?? agent.start?.y ?? 0);

    drawGliderIcon(ctx, x, y, layout.cell, { selected, surfaced: Boolean(surfaced), heading: -Math.PI / 2 });
    if (surfaced) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, layout.cell * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
}

function drawPlan(ctx, plan, selectedAgentId, selectedWaypoint, selectedWindow, layout) {
  (plan?.agentPlans ?? []).forEach((agentPlan, agentIndex) => {
    const selected = !selectedAgentId || agentPlan.agentId === selectedAgentId;
    const color = selected ? '#ffd166' : agentPlanColor(agentIndex, 0.28);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = selected ? 1 : 0.42;
    ctx.lineWidth = selected ? 5 : 2;
    ctx.beginPath();

    agentPlan.waypoints.forEach((wp, index) => {
      const px = cellX(layout, wp.x);
      const py = cellY(layout, wp.y);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    agentPlan.waypoints.forEach((wp, index) => {
      const px = cellX(layout, wp.x);
      const py = cellY(layout, wp.y);
      const activeWindow = selectedWindow !== null && wp.window === selectedWindow;
      const activeWaypoint = selectedWaypoint?.agentId === agentPlan.agentId && selectedWaypoint?.index === index;
      const windowAlpha = selectedWindow === null || activeWindow || activeWaypoint ? 1 : 0.42;

      if (activeWindow || activeWaypoint) {
        ctx.strokeStyle = activeWaypoint ? '#ffffff' : '#63e6be';
        ctx.lineWidth = activeWaypoint ? 5 : selected ? 4 : 3;
        ctx.beginPath();
        ctx.arc(px, py, layout.cell * (activeWaypoint ? 0.34 : 0.28), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = (selected ? 1 : 0.36) * windowAlpha;
      ctx.fillStyle = activeWindow || activeWaypoint ? color : dimColor(color);
      ctx.beginPath();
      ctx.arc(px, py, layout.cell * (activeWaypoint ? 0.22 : 0.18), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#08111f';
      ctx.font = 'bold 12px system-ui';
      ctx.fillText(String(index + 1), px - 4, py + 4);
      ctx.fillStyle = '#c8d8ee';
      ctx.font = '10px system-ui';
      ctx.fillText(`W${wp.window}`, px + 8, py - 8);
    });
  });
  ctx.lineWidth = 1;
}

function drawPlanningGuidance(ctx, guidance, layout) {
  if (!guidance) return;
  if (guidance.showReachable) drawReachableCells(ctx, guidance.reachableCells, layout);
  if (guidance.showDrift) drawDriftCone(ctx, guidance.driftCone, layout);
  if (guidance.previewPath?.length > 1) drawPreviewPath(ctx, guidance.previewPath, layout);
  if (guidance.showSurfacing && guidance.predictedSurface) drawPredictedSurface(ctx, guidance.predictedSurface, layout);
  drawGuidanceOrigin(ctx, guidance.origin, layout);
}

function drawReachableCells(ctx, cells = [], layout) {
  ctx.save();
  for (const cell of cells) {
    const px = layout.ox + cell.x * layout.cell;
    const py = layout.oy + cell.y * layout.cell;
    ctx.fillStyle = `rgba(84, 199, 236, ${0.045 + (cell.strength ?? 0) * 0.075})`;
    ctx.fillRect(px + 2, py + 2, layout.cell - 4, layout.cell - 4);
    ctx.strokeStyle = 'rgba(84, 199, 236, 0.12)';
    ctx.strokeRect(px + 4, py + 4, layout.cell - 8, layout.cell - 8);
  }
  ctx.restore();
}

function drawDriftCone(ctx, cone, layout) {
  if (!cone) return;
  const ox = cellX(layout, cone.origin.x);
  const oy = cellY(layout, cone.origin.y);
  const tx = cellX(layout, cone.tip.x);
  const ty = cellY(layout, cone.tip.y);
  const angle = Math.atan2(ty - oy, tx - ox);
  const distance = Math.max(layout.cell * 0.55, Math.hypot(tx - ox, ty - oy));
  const width = layout.cell * (cone.width ?? 1);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(angle);
  const gradient = ctx.createLinearGradient(0, 0, distance, 0);
  gradient.addColorStop(0, 'rgba(84, 199, 236, 0.24)');
  gradient.addColorStop(1, 'rgba(84, 199, 236, 0.02)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(distance * 0.48, -width, distance, 0);
  ctx.quadraticCurveTo(distance * 0.48, width, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(84, 199, 236, 0.42)';
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(distance, 0);
  ctx.stroke();
  ctx.restore();
}

function drawPreviewPath(ctx, path, layout) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  path.forEach((point, index) => {
    const px = cellX(layout, point.x);
    const py = cellY(layout, point.y);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
}

function drawPredictedSurface(ctx, point, layout) {
  const x = cellX(layout, point.x);
  const y = cellY(layout, point.y);
  ctx.save();
  ctx.strokeStyle = '#63e6be';
  ctx.fillStyle = 'rgba(99, 230, 190, 0.22)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, layout.cell * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#eef6ff';
  ctx.font = 'bold 11px system-ui';
  ctx.fillText('SURF', x + 10, y - 10);
  ctx.restore();
}

function drawGuidanceOrigin(ctx, origin, layout) {
  const x = cellX(layout, origin.x);
  const y = cellY(layout, origin.y);
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, layout.cell * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function agentPlanColor(index, alpha = 1) {
  const palette = [
    [255, 209, 102],
    [84, 199, 236],
    [99, 230, 190],
    [255, 107, 107]
  ];
  const [r, g, b] = palette[index % palette.length];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function dimColor(color) {
  if (color.startsWith('rgba')) return color.replace(/,\s*[\d.]+\)$/, ', 0.25)');
  return 'rgba(255, 209, 102, 0.35)';
}

function drawEnginePaths(ctx, engine, layout) {
  if (!engine) return;
  for (const agent of engine.agents) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    agent.history.forEach((p, index) => {
      const px = cellX(layout, p.x);
      const py = cellY(layout, p.y);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    if (agent.activeWaypoint) {
      ctx.strokeStyle = '#63e6be';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cellX(layout, agent.activeWaypoint.x), cellY(layout, agent.activeWaypoint.y), layout.cell * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }

    const comms = agent.commsState ?? 'submerged';
    if (comms === 'surfaced') {
      ctx.strokeStyle = '#63e6be';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cellX(layout, agent.x), cellY(layout, agent.y), layout.cell * 0.36, 0, Math.PI * 2);
      ctx.stroke();
    } else if (comms === 'surfacing') {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cellX(layout, agent.x), cellY(layout, agent.y), layout.cell * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawGliderIcon(ctx, cellX(layout, agent.x), cellY(layout, agent.y), layout.cell, {
      selected: false,
      surfaced: comms === 'surfaced',
      surfacing: comms === 'surfacing',
      submerged: comms === 'submerged',
      heading: agent.heading
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px system-ui';
    ctx.fillText(`${comms[0]?.toUpperCase() ?? 'S'} B${agent.battery.toFixed(0)}`, cellX(layout, agent.x) + 10, cellY(layout, agent.y) - 10);
  }
  ctx.lineWidth = 1;
}

function drawWaterBackground(ctx, layout) {
  const gradient = ctx.createLinearGradient(layout.ox, layout.oy, layout.ox, layout.oy + layout.height * layout.cell);
  gradient.addColorStop(0, '#0b3451');
  gradient.addColorStop(1, '#08243f');
  ctx.fillStyle = gradient;
  ctx.fillRect(layout.ox, layout.oy, layout.width * layout.cell, layout.height * layout.cell);
}

function drawWaterCell(ctx, px, py, cell, roi, x, y) {
  const shimmer = ((x * 17 + y * 29) % 11) / 11;
  ctx.fillStyle = `rgba(55, 148, 180, ${0.04 + shimmer * 0.035})`;
  ctx.fillRect(px, py, cell, cell);
  if (roi > 0) {
    const gradient = ctx.createRadialGradient(px + cell * 0.5, py + cell * 0.5, cell * 0.08, px + cell * 0.5, py + cell * 0.5, cell * 0.7);
    gradient.addColorStop(0, `rgba(255, 214, 102, ${0.18 + roi * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 214, 102, ${roi * 0.05})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, cell, cell);
    if (roi > 0.55) {
      ctx.strokeStyle = `rgba(255, 241, 166, ${0.18 + roi * 0.22})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + cell * 0.5, py + cell * 0.5, cell * (0.18 + roi * 0.18), 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  ctx.strokeStyle = 'rgba(160,220,240,0.05)';
  ctx.beginPath();
  ctx.moveTo(px + cell * 0.12, py + cell * (0.35 + shimmer * 0.2));
  ctx.quadraticCurveTo(px + cell * 0.5, py + cell * 0.25, px + cell * 0.88, py + cell * (0.38 + shimmer * 0.12));
  ctx.stroke();
}

function drawLandCell(ctx, px, py, cell, x, y) {
  const noise = ((x * 31 + y * 13) % 9) / 9;
  ctx.fillStyle = `rgb(${58 + noise * 18}, ${86 + noise * 16}, ${58 + noise * 10})`;
  ctx.fillRect(px, py, cell, cell);
  ctx.strokeStyle = 'rgba(190, 220, 150, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 2, py + cell * 0.3);
  ctx.quadraticCurveTo(px + cell * 0.35, py + 2, px + cell - 2, py + cell * 0.2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawHazardCell(ctx, px, py, cell) {
  ctx.fillStyle = 'rgba(255, 78, 90, 0.28)';
  ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
  ctx.strokeStyle = 'rgba(255, 110, 120, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + cell * 0.5, py + cell * 0.5, cell * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 230, 230, 0.9)';
  ctx.font = `bold ${Math.max(10, Math.floor(cell * 0.26))}px system-ui`;
  ctx.fillText('!', px + cell * 0.44, py + cell * 0.58);
  ctx.lineWidth = 1;
}

function drawCurrentStroke(ctx, cx, cy, vector, cell) {
  const [vx, vy] = vector;
  const magnitude = Math.hypot(vx, vy);
  if (magnitude < 0.02) return;
  const sx = cx - vx * cell * 0.16;
  const sy = cy - vy * cell * 0.16;
  const ex = cx + vx * cell * 0.34;
  const ey = cy + vy * cell * 0.34;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(cx - vy * cell * 0.08, cy + vx * cell * 0.08, ex, ey);
  ctx.stroke();
  drawArrowHead(ctx, sx, sy, ex, ey);
}

function drawGliderIcon(ctx, x, y, cell, { selected = false, surfaced = false, surfacing = false, submerged = false, heading = -Math.PI / 2 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.globalAlpha = submerged ? 0.62 : 1;
  ctx.fillStyle = surfaced ? '#63e6be' : surfacing ? '#ffd166' : selected ? '#54c7ec' : '#dcecff';
  ctx.strokeStyle = selected || surfaced ? '#ffffff' : 'rgba(255,255,255,0.75)';
  ctx.lineWidth = selected || surfaced ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(0, -cell * 0.24);
  ctx.lineTo(cell * 0.17, cell * 0.18);
  ctx.lineTo(0, cell * 0.09);
  ctx.lineTo(-cell * 0.17, cell * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (surfaced) {
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.24);
    ctx.lineTo(0, -cell * 0.38);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSampledCells(ctx, engine, layout) {
  if (!engine?.missionState?.sampled) return;
  ctx.fillStyle = 'rgba(99, 230, 190, 0.38)';
  ctx.strokeStyle = '#63e6be';
  ctx.lineWidth = 2;
  for (const key of engine.missionState.sampled) {
    const [x, y] = key.split(',').map(Number);
    const px = layout.ox + x * layout.cell;
    const py = layout.oy + y * layout.cell;
    ctx.fillRect(px + layout.cell * 0.22, py + layout.cell * 0.22, layout.cell * 0.56, layout.cell * 0.56);
    ctx.strokeRect(px + layout.cell * 0.22, py + layout.cell * 0.22, layout.cell * 0.56, layout.cell * 0.56);
  }
  ctx.lineWidth = 1;
}

function drawMapLabels(ctx, level, preview, layout) {
  ctx.fillStyle = '#eef6ff';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText(level.meta?.name ?? 'Level', layout.ox, layout.oy - 16);
  if (preview) {
    ctx.fillStyle = '#9cb4d8';
    ctx.font = '14px system-ui';
    ctx.fillText('Preview', layout.ox + 4, layout.oy + layout.height * layout.cell + 24);
  }
}

function drawConfidenceOverlay(ctx, frame, layout) {
  if (!frame?.confidence) return;
  for (let y = 0; y < layout.height; y += 1) {
    for (let x = 0; x < layout.width; x += 1) {
      const confidence = clamp(frame.confidence[y]?.[x] ?? 1, 0, 1);
      ctx.fillStyle = `rgba(255, 255, 255, ${(1 - confidence) * 0.28})`;
      ctx.fillRect(layout.ox + x * layout.cell, layout.oy + y * layout.cell, layout.cell, layout.cell);
    }
  }
}

function drawChallengeModeLabel(ctx, challengeMode, source, revealTruth, layout) {
  ctx.fillStyle = source === 'forecast' ? '#ffd166' : revealTruth ? '#ff6b6b' : '#9cb4d8';
  ctx.font = '13px system-ui';
  const label = revealTruth && challengeMode === 'forecast' ? 'DEBUG revealed truth' : source;
  ctx.fillText(`Planning View: ${label} (${challengeMode})`, layout.ox, layout.oy + layout.height * layout.cell + 22);
}

function cellX(layout, x) {
  return layout.ox + (x + 0.5) * layout.cell;
}

function cellY(layout, y) {
  return layout.oy + (y + 0.5) * layout.cell;
}

function roiColor(value) {
  const v = clamp(value, 0, 1);
  const r = Math.round(30 + v * 225);
  const g = Math.round(50 + v * 160);
  const b = Math.round(110 - v * 70);
  return `rgb(${r},${g},${b})`;
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;

  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 5 * Math.cos(angle - 0.6), y2 - 5 * Math.sin(angle - 0.6));
  ctx.lineTo(x2 - 5 * Math.cos(angle + 0.6), y2 - 5 * Math.sin(angle + 0.6));
  ctx.closePath();
  ctx.fill();
}

function drawArrowHead(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 5 * Math.cos(angle - 0.6), y2 - 5 * Math.sin(angle - 0.6));
  ctx.lineTo(x2 - 5 * Math.cos(angle + 0.6), y2 - 5 * Math.sin(angle + 0.6));
  ctx.closePath();
  ctx.fill();
}
