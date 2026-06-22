import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

export function startStaticServer({ port = 9321, root = process.cwd() } = {}) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    const pagesPrefix = '/auv-glider-planner-game';
    const pathname = url.pathname === pagesPrefix || url.pathname.startsWith(`${pagesPrefix}/`) ? url.pathname.slice(pagesPrefix.length) || '/' : url.pathname;
    const requested = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
    const filePath = resolve(root, `.${normalize(requested)}`);

    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      'Connection': 'close'
    });
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
    server.listen(port, '127.0.0.1', () => {
      console.log(`Static test server running at http://127.0.0.1:${port}`);
      resolveServer(server);
    });
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
