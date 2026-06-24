import assert from 'node:assert/strict';
import net from 'node:net';
import { DEFAULT_READY_PROBES, probeStaticServer, startStaticServer } from '../../tests/e2e/static-server.mjs';

const port = 9474;
assert.equal(await portOpen(port), false, 'smoke port starts closed');
const server = await startStaticServer({ port, root: process.cwd() });
try {
  const results = await probeStaticServer({ port, probePaths: DEFAULT_READY_PROBES });
  assert.equal(results.length, DEFAULT_READY_PROBES.length, 'all default readiness probes ran');
  for (const required of ['/','/auv-glider-planner-game/','/src/game/main.js','/vendor/phaser.min.js','/vendor/three/build/three.module.js','/packages/contracts/src/index.js','/packages/bathymetry/src/index.js','/packages/currents/src/index.js']) {
    assert.equal(results.some((row) => row.path === required && row.ok), true, `${required} probe passed`);
  }
  assert.equal(server.anchorStaticServerDebug.version, 'flow-pkg-r1-1-static-server-readiness', 'server exposes readiness debug');
} finally {
  await closeServer(server);
}
assert.equal(await waitForClosed(port), true, 'static server releases port after close');
console.log('PASS smoke_static_server_readiness_probe');

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(250);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}
async function waitForClosed(port) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (!await portOpen(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}