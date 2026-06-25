# CODEC-R1 Model Card

The codec package owns deterministic artifact encoding, decoding, validation, migration, and transport metadata.

Scientific and mission packages own artifact semantics.

The app owns file dialogs, downloads, routing, and visibility policy.

Unknown future versions are rejected rather than guessed.

Digests support reproducibility and corruption detection; they are not cryptographic signatures unless explicitly declared.

Public and oracle artifacts remain explicitly classified.

JSON/JSONL formats are designed for browser, Node, Worker, and Python/Colab interoperability.

No imported artifact is executable code.

## Boundaries

`packages/codecs` records artifact type, version, visibility class, fairness class, digests, validation status, migration steps, and safety failures. It does not decide whether a user may view hidden fields, does not generate environments, does not simulate missions, does not score missions, and does not play replay timelines.

## Supported Compatibility

CODEC-R1 registers only supported legacy migration for `anchor.plan` `1.0` to `2.0`. Unsupported legacy and unknown future versions fail with structured reports.