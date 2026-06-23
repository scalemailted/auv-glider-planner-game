# Ocean Model Fixture Pipeline

Future real-data fixtures should be produced offline and checked in as compact attributed artifacts. No network requests should be made from the browser.

The future pipeline must document:

- NetCDF input source and attribution
- eastward and northward velocity variable names
- time axis and units
- depth or immersion axis and units
- latitude/longitude or projected coordinates
- fill and missing values
- wet mask and bathymetry
- unit normalization
- axis ordering
- spatial and temporal subset
- license metadata
- deterministic compact fixture output

No real-data fixture should be claimed unless a real source file, attribution, and license metadata are added later. HYCOM or Marine Copernicus names must not be used for synthetic fields except to say they are not real HYCOM or Marine Copernicus data.

Boundary: No network requests in the browser. Dataset downloads and conversion belong to the future offline fixture pipeline.
