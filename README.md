# Dad's Day

A personal birthday adventure built as a portable static website, using local Three.js modules, a rigged MakeHuman character, and custom environment and car models.

## Experience

- Dad comes out of the front door, waves, and thinks about the choices.
- Movie night: glasses, popcorn and remote; enter a room with eggshell walls/carpet, two tall TV windows, the red leather futon, brown sofa, and tan coffee table with a white shelf. Dad sits on the red sofa while the TV turns on and plays the supplied Marvel intro. The simple completion message waits until the video ends.
- Gym: black shirt, navy sweatpants, gray sneakers and gym bag; take the silver coupe to a 29-second barbell routine with a launch, shrug, ten push-ups, flip, watch glance and catch.
- Drive: vacation shirt, fedora and sunglasses; take the blue convertible onto a moving highway with an overhead view and brief exhaust flames.
- Celebrate unlocks after all three activities have been selected. A rainbow icon starts the supplied Bee Gees track, a garage disco reveal, Dad's party hat/dance/confetti cannon, falling confetti and a brief Billie Jean-inspired moonwalk cameo. The cameo physically crouches behind the bin, stands, emerges, moonwalks both ways and returns to crouch. Sound can be muted; returning home stops playback and restores the scene. Activity progress stays on the device.
- The Songs wheel offers the five supplied tracks by Bee Gees, Tommy Richman, Michael Jackson, Run-D.M.C. and Stevie Wonder. It preserves mute when changing songs. Dad fires the confetti cannon once, stows it and switches to a side-step dance. Seven seconds after Michael finishes crouching behind the bin, the bin occasionally rattles; tap it for another cycle. There is no visible bin prompt. Each encore leaves Dad's dance and music running.
- Touch-friendly portrait layout, landscape layout, keyboard-accessible choices, fullscreen where supported, and reduced-motion handling.

## Local preview

Run `npm run serve`, then open `http://localhost:4173`. No build step or API key is needed. All required 3D assets are included; the optional web fonts fall back to system fonts offline.

## Current scope

The character uses a continuous CC0 MakeHuman mesh and skeleton, with fitted clothing and animated outfits. The cars are stylized procedural likenesses. The scene includes grass blades over a sloping left lawn, layered trees, mapped brickwork and soft contact shadows. These are short animated birthday vignettes, not full game levels. Portrait works without requiring device orientation lock. No reference photos, addresses or license plates are included in the published assets.

The static output is in `dist`. Third-party licenses and provenance are in `dist/assets`. The private preview requires its owner's access; recipient sharing must be configured separately. The local preview is available independently of the hosting deployment.

The five music files and Marvel video were supplied by the user for this birthday project. They are included unchanged; they are separate from the CC0 model assets and are not covered by their license.
