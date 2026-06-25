import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, get } from 'node:http';
import { extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ipynb': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

export const DEFAULT_READY_PROBES = Object.freeze([
  { path: '/', status: 200, type: 'text/html' },
  { path: '/auv-glider-planner-game/', status: 200, type: 'text/html' },
  { path: '/src/game/main.js', status: 200, type: 'text/javascript' },
  { path: '/vendor/phaser.min.js', status: 200, type: 'text/javascript' },
  { path: '/vendor/three/build/three.module.js', status: 200, type: 'text/javascript' },
  { path: '/packages/contracts/src/index.js', status: 200, type: 'text/javascript' },
  { path: '/packages/bathymetry/src/index.js', status: 200, type: 'text/javascript' },
  { path: '/packages/currents/src/index.js', status: 200, type: 'text/javascript' }
]);

export function startStaticServer({ port = 9321, root = process.cwd(), probePaths = DEFAULT_READY_PROBES } = {}) {
  const rootResolved = resolve(root);
  const startedAtMs = Date.now();
  const requests = [];
  const server = createServer((request, response) => {
    const requestStartedAtMs = Date.now();
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    const pagesPrefix = '/auv-glider-planner-game';
    const pathname = url.pathname === pagesPrefix || url.pathname.startsWith(`${pagesPrefix}/`) ? url.pathname.slice(pagesPrefix.length) || '/' : url.pathname;
    const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
    const filePath = resolve(rootResolved, `.${normalize(requested)}`);

    if (!filePath.startsWith(rootResolved) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      requests.push({ path: url.pathname, status: 404, startedAtMs: requestStartedAtMs, endedAtMs: Date.now() });
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' });
      response.end('Not found');
      return;
    }

    const contentType = mimeTypes[extname(filePath)] ?? 'application/octet-stream';
    requests.push({ path: url.pathname, status: 200, contentType, startedAtMs: requestStartedAtMs, endedAtMs: Date.now() });
    response.writeHead(200, { 'Content-Type': contentType, Connection: 'close' });
    createReadStream(filePath).pipe(response);
  });
  const close = server.close.bind(server);
  server.close = (callback) => {
    server.closeAllConnections?.();
    return close(callback);
  };

  return new Promise((resolveServer, rejectServer) => {
    server.once('error', (error) => {
      rejectServer(new Error(`Static test server could not bind http://127.0.0.1:${port}: ${error.message}`));
    });
    server.listen(port, '127.0.0.1', async () => {
      try {
        const probeResults = await probeStaticServer({ port, probePaths });
        server.anchorStaticServerDebug = {
          version: 'flow-pkg-r1-1-static-server-readiness',
          port,
          root: rootResolved,
          startedAtMs,
          readyAtMs: Date.now(),
          readinessDurationMs: Date.now() - startedAtMs,
          probeResults,
          requests
        };
        console.log(`Static test server running at http://127.0.0.1:${port} ready=${server.anchorStaticServerDebug.readinessDurationMs}ms`);
        resolveServer(server);
      } catch (error) {
        server.close(() => rejectServer(error));
      }
    });
  });
}

export async function probeStaticServer({ port = 9321, probePaths = DEFAULT_READY_PROBES } = {}) {
  const results = [];
  for (const probe of probePaths) {
    const result = await httpProbe({ port, path: probe.path });
    const expectedType = probe.type;
    const contentType = String(result.headers['content-type'] ?? '');
    const ok = result.statusCode === probe.status && (!expectedType || contentType.includes(expectedType));
    results.push({ path: probe.path, statusCode: result.statusCode, contentType, ok, durationMs: result.durationMs });
    if (!ok) {
      throw new Error(`Static server readiness probe failed for ${probe.path}: status=${result.statusCode}, content-type=${contentType}`);
    }
  }
  return results;
}

function httpProbe({ port, path }) {
  const started = Date.now();
  return new Promise((resolveProbe, rejectProbe) => {
    const request = get({ hostname: '127.0.0.1', port, path, headers: { Connection: 'close' } }, (response) => {
      response.resume();
      response.on('end', () => resolveProbe({ statusCode: response.statusCode, headers: response.headers, durationMs: Date.now() - started }));
    });
    request.setTimeout(15000, () => {
      request.destroy(new Error(`Static server readiness probe timed out for ${path}`));
    });
    request.on('error', rejectProbe);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.argv[2] ?? 9321);
  const server = await startStaticServer({ port });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}
