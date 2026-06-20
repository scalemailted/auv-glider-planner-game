import { printCoverageAudit, runCoverageAudit } from './audit_playwright_group_coverage_lib.mjs';

const audit = await runCoverageAudit();
printCoverageAudit(audit);
if (!audit.valid) process.exit(1);
