export const HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE = 'anchor.headless.solver-roundtrip-report';
export const HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE = 'anchor.headless.roundtrip-report';
export const HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES = Object.freeze([
  HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE
]);
export const HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE = 'anchor.headless.solver-roundtrip-bundle';
export const BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE = 'anchor.browser.headless-roundtrip-summary';

export function normalizeHeadlessRoundtripReportType(type) {
  return isHeadlessRoundtripReportType(type) ? HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE : String(type ?? '');
}

export function isHeadlessRoundtripReportType(type) {
  return type === HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE || HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES.includes(type);
}

export function roundtripReportTypeMetadata(type = HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE) {
  return {
    type: normalizeHeadlessRoundtripReportType(type),
    legacyType: HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE,
    aliases: HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES.slice(),
    canonicalType: HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE
  };
}