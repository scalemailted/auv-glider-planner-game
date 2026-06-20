import assert from 'node:assert/strict';
import net from 'node:net';
import { startStaticServer } from '../../tests/e2e/static-server.mjs';

const port = 9399;
assert.equal(await portAvailable(port), true, 'test port is free before smoke');
const server = await startStaticServer({ port });
assert.equal(await portAvailable(port), false, 'test port is occupied while server is running');
await new Promise((resolve) => server.close(resolve));
assert.equal(await waitForPortFree(port, 2000), true, 'test port is free after server close');
console.log('PASS smoke_e2e_process_cleanup');

function portAvailable(portNumber) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(portNumber, '127.0.0.1');
  });
}

async function waitForPortFree(portNumber, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portAvailable(portNumber)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return portAvailable(portNumber);
}
