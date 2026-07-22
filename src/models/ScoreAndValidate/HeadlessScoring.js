// Compatibility forwarding module.
// Canonical headless score-report compatibility implementation lives in packages/scoring.

const HeadlessScoreReport = require('./scoring/src/HeadlessScoreReport.js');

module.exports = {...HeadlessScoreReport}