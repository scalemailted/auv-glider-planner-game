 const HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE = 'anchor.headless.solver-roundtrip-report';
 const HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE = 'anchor.headless.roundtrip-report';
 const HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES = Object.freeze([
  HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE
]);
 const HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE = 'anchor.headless.solver-roundtrip-bundle';
 const BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE = 'anchor.browser.headless-roundtrip-summary';

 function normalizeHeadlessRoundtripReportType(type) {
  return isHeadlessRoundtripReportType(type) ? HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE : String(type ?? '');
}

 function isHeadlessRoundtripReportType(type) {
  return type === HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE || HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES.includes(type);
}

 function roundtripReportTypeMetadata(type = HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE) {
  return {
    type: normalizeHeadlessRoundtripReportType(type),
    legacyType: HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE,
    aliases: HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES.slice(),
    canonicalType: HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE
  };
}
module.exports = {HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, HEADLESS_LEGACY_ROUNDTRIP_REPORT_TYPE, HEADLESS_SOLVER_ROUNDTRIP_REPORT_ALIASES, HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE, BROWSER_HEADLESS_ROUNDTRIP_SUMMARY_TYPE, normalizeHeadlessRoundtripReportType, isHeadlessRoundtripReportType, roundtripReportTypeMetadata}