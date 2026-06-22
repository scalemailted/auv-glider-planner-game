# Regional World Activation

Phase: WORLD-R1.1

WORLD-R1.1 exposes the WORLD-R1 regional foundations through normal scenario setup and generated Challenge Mode.

## Operational Domain Choices

The setup UI now presents a first-class `Operational Domain` choice:

- Compact Training Area -> `tutorialCompact`
- Coastal Mission Area -> `coastalStandard`
- Regional Fleet Area -> `regionalFleet`

Tutorial and compact simulation defaults remain compact. Full generated Challenge Mode defaults to Regional Fleet Area through the Challenge setup path. Imported missions preserve their declared profile unless the user explicitly changes the operational domain in setup.

## Regional Fixture

`levels/regional_fleet_survey.json` is a checked-in `anchor.challenge` fixture generated through the same browser-side generation/export path. It is labeled `Synthetic Regional Shelf and Basin` and carries the disclaimer:

```text
Synthetic educational operating area. Not real Gulf of Mexico bathymetry or forecast data.
```

The fixture includes three gliders, separated deployment zones, signed terrain authority, regional fields, water-column configuration, and continuous coordinate metadata.

## Resolution Relationship

For the regional profile:

```text
terrain source resolution > scalar/science source resolution > current source resolution > current glyph display budget
```

The 2D planning lattice is inspection and routing metadata. It is not the terrain mesh, source-field resolution, or display glyph count.

## Debug Surfaces

`globalThis.ANCHOR_OPERATIONAL_DOMAIN_DEBUG` includes terrain authority mode/digests, legacy land-tile flags, continuous-route flags, terrain/render counts, and field/glyph counts. `globalThis.ANCHOR_PLANNING_GUIDE_DEBUG` reports candidate preview lifecycle counters.