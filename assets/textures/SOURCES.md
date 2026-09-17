# Birthday scene texture assets

Downloaded 2026-09-16. Every selected surface was visually inspected. Sources are CC0 1.0; raw files can be shipped with the scene. Full exact download URLs, sizes and checksums are in `asset-manifest.json`.

## Recommended material set

| Surface | Diffuse/color | OpenGL normal | Roughness | Source |
|---|---|---|---|---|
| Red-brown suburban brick, pale mortar | `red_brick_03_diff_1k.jpg` | `red_brick_03_nor_gl_1k.jpg` | `red_brick_03_rough_1k.jpg` | https://polyhaven.com/a/red_brick_03 |
| Gray roof, overlapping flat slate/shingle appearance | `roof_slates_03_diff_1k.jpg` | `roof_slates_03_nor_gl_1k.jpg` | `roof_slates_03_rough_1k.jpg` | https://polyhaven.com/a/roof_slates_03 |
| Clean short lawn | `Grass005/Grass005_1K-JPG_Color.jpg` | `Grass005/Grass005_1K-JPG_NormalGL.jpg` | `Grass005/Grass005_1K-JPG_Roughness.jpg` | https://ambientcg.com/a/Grass005 |
| Fine brushed driveway concrete | `brushed_concrete_03_diff_1k.jpg` | `brushed_concrete_03_nor_gl_1k.jpg` | `brushed_concrete_03_rough_1k.jpg` | https://polyhaven.com/a/brushed_concrete_03 |

All recommended maps are 1024 x 1024 JPG. Use sRGB for color maps and linear/no color space for normal/roughness. Enable repeat wrapping. Bricks must be tiled at real brick scale (around 0.20 m long), not stretched one tile across the whole house. The gray roof asset is slate, not asphalt roofing; it gives a suitable flat overlapping pattern. Concrete is moderately dark; scene lighting and exposure should be checked before multiplying by a material tint. The grass is vivid green, so a modest material color tint can reduce saturation if necessary.

## Additional alternatives

- `red_bricks_04_*_1k.jpg`: smaller, more weathered orange-red bricks; full three-map set. https://polyhaven.com/a/red_bricks_04
- `roof_slates_02_*_1k.jpg`: gray-brown narrow weathered shingles; full three-map set. https://polyhaven.com/a/roof_slates_02
- `leafy_grass_diff_1k.jpg`: natural patchy lawn with leaves; color only. https://polyhaven.com/a/leafy_grass
- `concrete_floor_01_diff_1k.jpg`: exposed aggregate concrete; color only. https://polyhaven.com/a/concrete_floor_01

## Licenses and provenance

- Poly Haven assets: https://polyhaven.com/license — CC0. https://creativecommons.org/publicdomain/zero/1.0/
- ambientCG assets: https://docs.ambientcg.com/license/ — CC0 1.0 Universal.
- Grass original download: https://ambientcg.com/get?file=Grass005_1K-JPG.zip . The extracted directory also contains alternate maps and material formats supplied by ambientCG; the scene only needs the selected JPGs above.

No leaf/branch alpha cards collected. No Site project files were edited.
