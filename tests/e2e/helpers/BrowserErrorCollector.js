export function attachBrowserErrorCollector(page, options = {}) {
  const errors = [];
  const ignoreFavicon = options.ignoreFavicon === true;
  page.on('pageerror', (error) => {
    const location = sourceLocationFromStack(error.stack ?? '');
    errors.push({
      type: 'pageerror',
      message: error.message,
      sourceUrl: location.sourceUrl,
      lineNumber: location.lineNumber,
      columnNumber: location.columnNumber,
      stack: error.stack ?? null
    });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const text = message.text();
    if (ignoreFavicon && /favicon.ico/i.test(text + ' ' + (location?.url ?? ''))) return;
    errors.push({
      type: 'console',
      message: text,
      sourceUrl: location?.url ?? null,
      lineNumber: location?.lineNumber ?? location?.line ?? null,
      columnNumber: location?.columnNumber ?? location?.column ?? null
    });
  });
  page.on('requestfailed', (request) => {
    const requestUrl = request.url();
    if (ignoreFavicon && /favicon.ico/i.test(requestUrl)) return;
    if (!/(\/src\/|\/vendor\/three\/|\.m?js($|\?)|favicon\.ico|favicon\.svg)/.test(requestUrl)) return;
    errors.push({
      type: 'requestfailed',
      message: request.failure()?.errorText ?? 'request failed',
      requestUrl,
      sourceUrl: requestUrl,
      lineNumber: null,
      columnNumber: null
    });
  });
  return {
    errors,
    unexpected() { return [...errors]; },
    assertClean({ disallow = [] } = {}) {
      const disallowed = errors.filter((entry) => disallow.some((pattern) => pattern.test(entry.message ?? entry.requestUrl ?? '')));
      if (errors.length || disallowed.length) {
        throw new Error(`Unexpected browser errors:\n${JSON.stringify({ errors, disallowed }, null, 2)}`);
      }
    },
    clear() { errors.length = 0; }
  };
}

function sourceLocationFromStack(stack) {
  const match = String(stack).match(/\((https?:\/\/[^:]+:[^:]+):(\d+):(\d+)\)|@(https?:\/\/[^:]+:[^:]+):(\d+):(\d+)/);
  if (!match) return { sourceUrl: null, lineNumber: null, columnNumber: null };
  return {
    sourceUrl: match[1] ?? match[4] ?? null,
    lineNumber: Number(match[2] ?? match[5] ?? null) || null,
    columnNumber: Number(match[3] ?? match[6] ?? null) || null
  };
}