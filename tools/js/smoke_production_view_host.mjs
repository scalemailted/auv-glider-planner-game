import assert from 'node:assert/strict';
import { createAnchorProductionViewHost } from '../../src/app/production/AnchorProductionViewHost.js';

class ClassList { constructor() { this.values = new Set(); } add(...items) { items.forEach((item) => this.values.add(item)); } remove(...items) { items.forEach((item) => this.values.delete(item)); } contains(item) { return this.values.has(item); } }
class Element {
  constructor(id = '') { this.id = id; this.innerHTML = ''; this.children = []; this.classList = new ClassList(); this.dataset = {}; }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  remove() { this.removed = true; }
  setAttribute(name, value) { this[name] = value; }
  addEventListener() {}
  removeEventListener() {}
}
const documentRef = { activeElement: null, querySelectorAll(selector) { if (selector === '[data-next-shell-route-root]') return this.routeRoot ? [this.routeRoot] : []; if (selector === 'canvas') return []; return []; }, querySelector() { return null; }, getElementById() { return null; } };
const shell = { document: documentRef, regions: { body: new Element('body'), consoleRoot: new Element('mission-console'), rightRoot: new Element('waypoint-timeline'), gameRoot: new Element('game-root'), uiRoot: new Element('ui-root'), missionSummaryHud: new Element(), topHud: new Element(), leftDrawer: new Element(), rightDrawer: new Element(), bottomTimeline: new Element(), agentPerformanceHud: new Element(), modalRoot: new Element() }, applyRouteMetadata() {}, announce() {}, focusRoute() { return true; } };
const host = createAnchorProductionViewHost(shell);
const factory = ({ route, regions }) => { const root = new Element(`root-${route}`); root.dataset.nextShellRouteRoot = 'true'; documentRef.routeRoot = root; regions.gameRoot.appendChild(root); return { root, dispose() { root.remove(); } }; };
host.mountRoute('productHub', factory);
assert.equal(host.summary().mountedViewCount, 1, 'one route mounted');
host.mountRoute('missionSetup', factory);
assert.equal(host.disposedViewCount, 1, 'prior route disposed');
assert.equal(shell.regions.consoleRoot.innerHTML, '', 'left region cleared');
assert.equal(shell.regions.rightRoot.innerHTML, '', 'right region cleared');
console.log('production view host smoke passed');
