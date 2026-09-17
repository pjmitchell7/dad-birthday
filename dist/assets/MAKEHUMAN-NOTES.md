# Continuous dad asset — technical prototype, visual approval pending

Entry point: `../avatar-v2.js`. Copy it together with the complete `runtime/` directory at the same relative location, including `dad-human.bin`. The public call is `const dad = await createDad()`, returning `{ group, setOutfit(mode), animate(seconds, state) }`. The optional `data`, `buffer` and `skipTextures` arguments exist for CPU validation only. The assembled character is returned only after required geometry and textures load; the lower body is removed below clothing, and pants/shoes are always present.

Modes are `default`, `movie`, `gym`, `drive`; animation states are `idle`, `wave`, `selected`, `walk`, `driving`. The character faces +Z, feet are grounded near y=0, and the enlarged-head human is approximately 2.43 units tall; the grounded selected bounds including sneakers are about 2.454, or 2.49 with the fedora. No site checkout was modified.

For a seated driver, call `setOutfit('drive')` and continuously `animate(seconds,'driving')`. Hips and knees bend, both hands extend toward a wheel, and the head stays neutral. The group receives no automatic seat translation. The group-local hip midpoint is `[0,1.307146,-0.004381]`, exposed in `group.userData.drivingHipOffset`. To align hips to a car, set group position to the desired world hip point minus this offset transformed by the group's scale/rotation. At scale 1, translating group y by `-0.504227` puts the seated shoes on the ground and leaves hips around y=0.803; that translation is also `group.userData.drivingGroundingYOffset`. Steering-wheel placement still requires a rendered car review.

## Actual source and license

The source is MakeHuman Community's hm08 base mesh, blended with its African male young/older and muscular body targets. The latest closed smile uses source mouth-corner-puller (0.90), mouth-upward-retraction (0.28), mouth-compression (0.08), and left/right eyebrow-up (0.10 each) targets; there is no mouth-open target or teeth mesh. The continuous UV-mapped face/body and source skin weights replace the previous ellipsoid construction. The skin is the system middle-age African male material. A scalp-only shader replaces its painted short hair with a forehead-matched skin color and softer roughness; facial texture remains intact.

Eyes, eyebrows, pants, sleeved shirts, sneakers and fedora come from the official system asset pack. The latest tank is an original structured front/back pattern projected onto the continuous human body, with a deep U-neckline, narrow shoulder bridges and open armholes. Its 4,864 triangles use body-barycentric skin weights. It replaces the earlier cut T-shirt entirely. Pants and sleeved shirts use source fitted proxy vertex interpolation; all garments share the human skeleton. An additional proportional reshape broadens the torso and upper arms. Pants have more volume, smooth raised hems and no denim normal map. Shoes05 supplies real sneaker geometry.

Official primary sources checked on 2026-09-16:

- https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md — section C explicitly identifies base meshes, targets, textures, clothes and poses as CC0.
- https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md — full CC0 legal text, downloaded alongside these notes.
- https://static.makehumancommunity.org/oldsite/faq/what_changed_regarding_the_license_in_2020.html — clarifies that base mesh and morph targets are independently CC0, not restricted to GUI exports.
- https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html — individually lists included system assets as CC0, including middleage_african_male, high-poly eyes, eyebrow002, male_casualsuit03/04, shoes05 and fedora01.
- https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip — source asset archive downloaded here. This 267 MB archive is a source/reference download, not a deployment dependency.

`base.obj` contains 19,158 source vertices, including helpers. Its renderable `body` group contains 13,380 distinct vertices and 13,378 polygon faces. The source rig has 163 bones. Skin weights are explicitly marked CC0 in `default_weights.mhw`. Source helpers are used to fit clothes and then excluded from rendering.

## What was verified

- Node syntax check of `avatar-v2.js`.
- All 20 outfit/state combinations constructed and advanced through 120 frames.
- Every visible skinned vertex transformed to finite coordinates.
- Skin weights sum to one within 0.00002.
- Posed bounds remain plausible in every tested state; detailed results are in `skinning-validation.json`.
- Numerical wrist/palm target errors for solved poses are recorded in `pose-report.json` (maximum about 0.023 units). Seated leg targets have up to 0.064 units of residual error and require rendered review.
- Packed binary geometry decoding was exercised in the same 20-state skinning test.
- The first packed build exposed a real browser GPU-binding error because Three.js does not automatically wrap typed-array indices. It was corrected with an explicit `BufferAttribute`; every index and attribute across all 97 meshes is now checked for valid `.array`, `.itemSize` and `.isBufferAttribute` fields.

Visible character-only costs:

| Mode | Meshes | Triangles |
| --- | ---: | ---: |
| Default | 11 | 30,881 |
| Movie | 78 | 46,025 |
| Gym | 27 | 32,607 |
| Drive | 21 | 32,093 |

## Limits — do not treat as a passed visual quality gate

The parent agent rendered the first version and provided `avatar-first-review.png`, which was inspected. This revealed jagged garment edges, overly slim anatomy, dress shoes, a hand obscuring the mouth, and pale eyes. The eye root cause was confirmed: cornea UVs sample a source texture region with zero alpha, but the material had been opaque. `avatar-third-review.png` was also inspected after fixes; the major first-pass defects were resolved and the parent identified the human as a much stronger foundation. Final requested polish increases the head by 10% with all facial parts tracking, strengthens the baked closed-mouth smile, narrows the lower legs by 12%, and adds skinned ankle cuffs. That last polish awaits rendered review in every outfit and animation. Direct computer-use discovery in this asset worker returned no available browsers/apps. The CPU tests establish geometry and transform integrity only, and do not verify garment intersections or artistic quality.

Movie-mode review subsequently found shoulder skin poking through the tank and a poorly visible remote. The larger upright remote was confirmed visible in the parent's integrated `scene-movie-closeup.png`, but the cut shirt still read as padded shoulders with a tiny neckline. That prompted the complete structured tank replacement described above. The current tank fitting ray-tests and suppresses 2,161 covered body triangles. The latest tank, bald-scalp shader, strengthened smile and seated pose await rendered confirmation.

This is not verified as Sims 2 quality, Fortnite quality, or a finished art asset. It is a generic human base adjusted toward the requested description, not a modeled likeness. The fitted tank is programmatically tailored rather than artist-sculpted; its shoulder bridges, props and wrist grips still need artistic review. Gait and driving are procedural rather than authored animation or motion capture. The current runtime payload is 4,388,645 bytes (about 4.19 MiB), reduced from 31 MB. Skin is 1024 pixels, clothing/shoes/hat textures 512, and eyes/brows 256; the face mesh itself has not been decimated. No phone hardware performance test has been completed.

## Reproduce and review

Run `node v2/build-human.mjs`, then `node v2/solve-poses.mjs`, then `node v2/pack-human.mjs`, then the PowerShell script `v2/optimize-textures.ps1` from the birthday-assets folder to regenerate deployable assets. Run `node v2/validate-human.mjs` for packed-data and posed-geometry checks. `dad-human-debug.json` is an unpacked development copy outside the runtime directory. Run `node v2/preview-server.mjs` to serve the isolated review page at http://127.0.0.1:8947/v2/preview.html. This page is explicitly labeled work in progress, has outfit/state buttons, and supports orbit/zoom. The preview process was started for review; it is independent of Sites.
