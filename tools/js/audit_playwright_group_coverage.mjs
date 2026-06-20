import { printCoverageAudit, runCoverageAudit } from './audit_playwright_group_coverage_lib.mjs';

const audit = await runCoverageAudit();
printCoverageAudit(audit);
process.exit(audit.valid ? 0 : 1);
