# @anchor/validation

`packages/validation` owns generic scientific evidence contracts for ANCHOR: claim definitions, evidence records, validation reports, validation manifests, references, suitability decisions, and deterministic report digests.

The package is pure and depends only on `packages/contracts`. Component packages own their scientific models and diagnostics. Browser routes, downloads, file pickers, report presentation, and visibility policy stay in the app layer.

SCI-VALID-R2A uses this package to build checked-in Pre-Alpha validation reports under `validation/`. These reports distinguish software verification, numerical verification, physical plausibility, external comparison, operational validation, and not-yet-evaluated claims.