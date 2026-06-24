# Current Manifest And Artifact Contract

A CurrentFieldManifest is a reproducible recipe/source description. A CurrentField4D artifact is the generated numerical field.

Required artifact conventions:

- `coordinateFrame: localEastNorthDown`
- east/north/depth axes in meters
- depth positive down
- time in canonical seconds
- U eastward m/s
- V northward m/s
- W positive down m/s when supplied
- array order `[time][depth][north][east]`
- explicit wet mask and bottom-depth arrays
- explicit temporal boundary mode
- deterministic digest

The package supports existing nested arrays and structured-clone-compatible artifacts. It does not contain DOM, Phaser, Three.js, or renderer objects.