import assert from 'node:assert/strict';
import net from 'node:net';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const port = 9473;
async function portOpen() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.setTimeout(250);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}
function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
async function waitForClosed() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!await portOpen()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

assert.equal(await portOpen(), false, 'smoke port starts closed');
let server = await startStaticServer({ port, root: process.cwd() });
assert.equal(await portOpen(), true, 'server opens the configured port');
const response = await fetch(`http://127.0.0.1:${port}/index.html`);
assert.equal(response.status, 200, 'server responds to index.html');
await closeServer(server);
assert.equal(await waitForClosed(), true, 'server close releases port');
server = await startStaticServer({ port, root: process.cwd() });
assert.equal(await portOpen(), true, 'second server starts after first closes');
await closeServer(server);
assert.equal(await waitForClosed(), true, 'second close releases port');
console.log(JSON.stringify({ ok: true, port }));
