import assert from 'node:assert/strict';
import net from 'node:net';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const port = 9475;
assert.equal(await portOpen(port), false, 'cleanup smoke port starts closed');
const first = await startStaticServer({ port, root: process.cwd() });
assert.equal(await portOpen(port), true, 'first server opens port');
await closeServer(first);
assert.equal(await waitForClosed(port), true, 'first server closes cleanly');
const second = await startStaticServer({ port, root: process.cwd() });
assert.equal(await portOpen(port), true, 'second server reuses released port');
await closeServer(second);
assert.equal(await waitForClosed(port), true, 'second server closes cleanly');
console.log('PASS smoke_repeated_boot_cleanup');

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