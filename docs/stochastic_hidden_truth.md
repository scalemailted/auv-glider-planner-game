# Stochastic Hidden Truth

Browser-only hidden truth cannot be perfectly protected. If the client can simulate a stochastic challenge, determined users can inspect code, memory, downloaded assets, or generation seeds.

ANCHOR uses a practical separation:

- Public challenge exports omit plain hidden truth and include forecast/belief fields plus a hidden-truth checksum. For game reload convenience, they may include an opaque browser-obfuscation bundle with an explicit not-secure warning.
- Solver packets for stochastic planning include allowed forecast/belief information, not hidden truth.
- Oracle dataset exports include hidden truth plainly and are labeled for research only.

The project does not claim that client-side encryption would provide real security. Any future opaque bundle should be treated as casual anti-cheat only and must keep the warning: cheat-resistant only; not secure against determined users.

For fair competitions, use public `anchor.challenge` plus ordinary `anchor.solverPacket`. For training, benchmarking, or reproducibility, use `anchor.oracleDataset` or an oracle solver packet.

Imported plans carry planner visibility flags. If `usesTruth` or `usesOracle` is true, the import summary warns that the plan is oracle-assisted. Such attempts are marked in result and leaderboard exports and are not treated as fair leaderboard entries by default.
