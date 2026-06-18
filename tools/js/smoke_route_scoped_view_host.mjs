import assert from 'node:assert/strict';
import { createRouteScopedViewHost, mountRouteScopedView, routeScopedViewHostSummary, unmountRouteScopedView } from '../../src/app/runtime/RouteScopedViewHost.js';
import { createFakeDocument } from './mig_r2_smoke_helpers.mjs';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const shell = createAnchorAppShell({ documentRef });
const host = createRouteScopedViewHost(shell);
const view = { contract: { id: 'mainMenu' }, mount({ documentRef: doc }) { const node = doc.createElement('main'); node.dataset.testid = 'fake-route'; return node; }, unmount() { this.unmounted = true; } };
mountRouteScopedView(host, view, { routeId: 'mainMenu' });
assert.equal(host.activeRouteId, 'mainMenu');
assert.equal(routeScopedViewHostSummary(host).activeRouteId, 'mainMenu');
unmountRouteScopedView(host);
assert.equal(host.activeRouteId, null);
console.log('smoke_route_scoped_view_host: ok');
