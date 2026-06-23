# Current Magnitude and Calm Regions

Current glyph length is a display of physical current speed in m/s. It does not alter glider physics, scoring, field digests, or route execution.

Canonical samples expose:

- `uEastMetersPerSecond`
- `vNorthMetersPerSecond`
- `magnitudeMetersPerSecond`
- `bearingDegrees`

Display samples additionally expose:

- `displayMagnitudeNormalized`
- `displayGlyphLengthWorld`
- `calm`

Calm regions use `calmThresholdMetersPerSecond`. A calm or near-zero vector is still a valid canonical sample, but it does not receive an arbitrary directional arrow. The current renderer omits directional instances for calm samples and reports `calmVectorCount` separately.
