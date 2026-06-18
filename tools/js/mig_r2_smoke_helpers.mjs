import fs from 'node:fs';
import path from 'node:path';
import { ensureLevelIdentity } from '../../src/core/identity/GameInstanceId.js';
import { applyTutorialMissionConfig } from '../../src/core/campaign/CampaignLevels.js';
import { createEmptyPlan, addWaypoint } from '../../src/core/planning/WaypointPlan.js';
import { getDeploymentZones, setSelectedStart, normalizeDeploymentState } from '../../src/core/deployment/DeploymentZones.js';

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), 'utf8'));
}

export function makeTutorialSession() {
  const level = ensureLevelIdentity(readJson('levels/tutorial_01_currents.json'));
  const mission = applyTutorialMissionConfig(readJson('missions/tutorial_sampling.json'), 'tutorial_01_first_deployment');
  normalizeDeploymentState(level, mission, null);
  const plan = createEmptyPlan(level, mission);
  const agentId = mission.agents?.[0]?.id;
  const zone = getDeploymentZones(level)[0];
  const start = zone?.cells?.[0] ?? mission.agents?.[0]?.start ?? { x: 1, y: 1 };
  setSelectedStart(level, mission, plan, agentId, start);
  const waypoint = findWaterCell(level, start);
  addWaypoint(plan, agentId, { ...waypoint, t: 8, action: 'sample', kind: 'navigation' });
  return { level, mission, plan, agentId, start, waypoint };
}

export function findWaterCell(level, start = { x: 1, y: 1 }) {
  const grid = level.world?.grid ?? { width: 10, height: 10 };
  for (let radius = 2; radius < Math.max(grid.width, grid.height); radius += 1) {
    const x = Math.min(grid.width - 1, Math.max(0, Math.round(Number(start.x ?? 1) + radius)));
    const y = Math.min(grid.height - 1, Math.max(0, Math.round(Number(start.y ?? 1))));
    if (!level.layers?.terrain?.[y]?.[x]) return { x, y };
  }
  return { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
}

export function createFakeDocument() {
  const byId = new Map();
  const documentRef = {
    body: fakeElement('body'),
    head: fakeElement('head'),
    createElement(tag) {
      return fakeElement(tag);
    },
    getElementById(id) {
      if (!byId.has(id)) {
        const el = fakeElement('div');
        el.id = id;
        byId.set(id, el);
      }
      return byId.get(id);
    },
    querySelector() {
      return null;
    }
  };
  return documentRef;
}

export function fakeElement(tagName = 'div') {
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attributes: {},
    dataset: {},
    style: {},
    hidden: false,
    innerHTML: '',
    textContent: '',
    clientWidth: 960,
    clientHeight: 640,
    className: '',
    classList: {
      values: new Set(),
      add(...names) { names.forEach((name) => this.values.add(name)); },
      remove(...names) { names.forEach((name) => this.values.delete(name)); },
      toggle(name, force) { if (force === false) this.values.delete(name); else this.values.add(name); }
    },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    remove() { this.removed = true; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; },
    addEventListener() {},
    removeEventListener() {}
  };
  return element;
}

export function createFakeRenderer() {
  return {
    disposed: false,
    viewModel: null,
    container: fakeElement('div')
  };
}

export function fakeRendererFactory(container) {
  return { ...createFakeRenderer(), container };
}

export function fakeSimulationControllerFactory({ onFrame }) {
  return {
    created: false,
    createEngine() { this.created = true; return {}; },
    buildViewModel() { return { type: 'anchor.rendering.simulation-world', grid: { width: 1, height: 1 }, boundaryFlags: {}, simulationStatus: { status: 'paused' } }; },
    play() {},
    pause() {},
    stepOnce() {},
    runToEnd() {},
    dispose() {},
    getDebugState() { return { created: this.created, usesPhaserUpdate: false }; }
  };
}
