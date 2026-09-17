# Brief moonwalk cameo

`moonwalk-cameo.js` exports asynchronous `createMoonwalkCameo()`, returning `{ group, update(seconds) }`. Keep the module beside the existing `runtime/` directory. It uses `dad-human.json`, `dad-human.bin`, `eyes.png` and `brows.png`; no new downloads or paid assets are needed.

The parent controls group position, rotation, scale, visibility, garage entry and the trash-can hide. The asset faces local +Z, is approximately 2.48 units tall at scale 1, and its update function does not overwrite the parent transforms. The parent can use a smaller background scale. Motion alternates a flat sliding foot with a raised-heel recovery, with two-link leg posing and restrained torso/arm movement. The loop is 1.38 seconds. A right-to-left backward glide should face +world X (`rotation.y = Math.PI / 2`).

The costume is an original small stylized interpretation of Michael Jackson's familiar black-and-white stage look: slimmer continuous body, light-complexion stylized face, swept dark curls, black fedora, sequin-like black open jacket, white V-neck undershirt, cropped black trousers, one white glove, white socks and black shoes. It is not a scanned likeness or a claim of photoreal fidelity. No music or performance recording is included.

## Attribution and license

The underlying continuous mesh, morph-derived geometry, skeleton, skin weights, shirt/pants/fedora/shoe system assets and eye/brow textures are the same MakeHuman Community assets already installed for Dad. They are covered by CC0-1.0; see the existing `LICENSE.ASSETS.md` and `ASSET-NOTES.md` for the checked sources and full license. The costume modifications, hair curves and motion code are original to this project.

Primary provenance: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md and https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md . No third-party MJ character mesh, photograph, image texture or recording is included.

Visual review is required in the actual garage scene. Successful geometry/animation checks alone do not constitute appearance approval.
