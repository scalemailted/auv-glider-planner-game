import { printCoverageAudit, runCoverageAudit } from './audit_playwright_group_coverage_lib.mjs';

const audit = await runCoverageAudit();
printCoverageAudit(audit);
process.exit(audit.valid && (audit.capabilities?.valid ?? true) ? 0 : 1);
