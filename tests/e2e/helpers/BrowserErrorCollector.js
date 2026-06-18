export function attachBrowserErrorCollector(page, options = {}) {
  const errors = [];
  const ignoreFavicon = options.ignoreFavicon !== false;
  page.on('pageerror', (error) => {
    errors.push({ type: 'pageerror', message: error.message, stack: error.stack ?? null });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const text = message.text();
    if (ignoreFavicon && /favicon.ico/i.test(text + ' ' + (location?.url ?? ''))) return;
    errors.push({ type: 'console', text, location });
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (ignoreFavicon && /favicon.ico/i.test(url)) return;
    if (!/(\/src\/|\/vendor\/three\/|\.m?js($|\?))/.test(url)) return;
    errors.push({ type: 'requestfailed', url, failure: request.failure()?.errorText ?? null });
  });
  return {
    errors,
    unexpected() { return [...errors]; },
    clear() { errors.length = 0; }
  };
}
