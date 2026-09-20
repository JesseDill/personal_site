# Rendering and performance audit

Date: 2026-09-20. Local baseline: commit `15cce41`. User-reported deployment: https://jessedill.github.io/personal_site/ . Reported failing device: MacBook Pro M1, macOS, Chrome. User sees black blocks except bright torch tips and the billboard backing.

## Results and limits

A minimal WebGL2 experiment reproduces a black texture using the repository's grass SVG in the Codex Chromium browser (reported Chrome 153). The same SVG with explicit dimensions works, as does a raster canvas derived from that corrected SVG. This is a confirmed local texture-upload defect and a strong explanation for the user's report; the user's actual Chrome installation and deployed build still need the same A/B check. No full gameplay benchmark or cross-browser validation has been completed. The in-app browser rejected pointer lock, preventing normal entry into the local game. Chrome was not available through the browser connector.

The game code and production textures have not been changed. Added `public/texture-diagnostic.html` is a standalone diagnostic, automatically included in a future static export unless removed. It uses only same-origin assets and sends no diagnostic telemetry. Start the existing development server and open http://127.0.0.1:3000/personal_site/texture-diagnostic.html .

Local checks: ESLint passed with an existing hook dependency warning at GameScene.tsx:443. TypeScript validation is recorded in the accompanying task response.

## Issue 2: black blocks

### Evidence

- `public/textures/world/grass-top.svg` and 35 other world SVG files have a viewBox but no explicit root width and height: 36 of 37 SVGs total.
- The exception is `solid-white.svg`, whose root specifies width=16 and height=16. `voxelMaterialPalette.ts` uses this texture for the working billboard backing.
- `TorchBlock.tsx` uses solid colors and emissive color, without a texture map. Bright torch tips are therefore consistent with a texture failure.
- `useVoxelTextures.ts` loads SVGs through Drei/Three TextureLoader. `configurePixelTexture.ts` enables mipmaps and nearest filtering.
- Controlled experiment, same image content and shader:

| Source | Decoded dimensions | Center RGBA | WebGL error | Appearance |
|---|---|---|---|---|
| Original SVG | 150 × 150 | 0, 0, 0, 255 | 1281 / INVALID_VALUE | Black |
| Explicit width/height SVG | 16 × 16 | 124, 159, 80, 255 | 0 | Green grass |
| 16 × 16 raster canvas | 16 × 16 | 124, 159, 80, 255 | 0 | Green grass |

The diagnostic samples the framebuffer and checks accumulated WebGL error after upload, mipmap generation, drawing and readback. It isolates the SVG upload path from Three lighting; it does not attribute the GL error to an individually instrumented GL call. Natural dimensions being nonzero do not prove that an SVG will upload successfully.

An upstream Chrome/macOS report corroborates this class of browser problem: https://github.com/mrdoob/three.js/issues/30899 . It does not establish the exact browser regression range for this website.

### Plan, in order

1. **Small compatibility fix:** specify numeric width/height on every SVG used as a GPU texture, using its intended viewBox dimensions. Audit arm textures and overlays as well as world textures. Do not apply 16 × 16 indiscriminately to nonsquare sprites, logos, or other assets. Keep viewBox and artwork. Use versioned asset URLs when deploying so cached originals cannot obscure the result.
2. **Validation gate:** run the A/B page on the user's M1 Chrome, Safari and Firefox; inspect actual terrain, torch shafts, billboard, arm, leaves, glass, doors, crops and break overlays. Repeat with fresh and warm cache, daytime/nighttime, and after reload. Require nonblack textured geometry and no texture upload/shader errors.
3. **Durable asset pipeline:** preferably retain SVG source artwork but generate fixed-size PNGs at build time for pixel-art GPU textures. Keep vector UI assets where useful. Validate outputs, alpha channels, intended dimensions and palette references. This avoids browser-dependent SVG rasterization for the world. Raster canvas in the experiment supports this approach; exported PNGs still require their own verification.
4. **Texture initialization:** configure color space, filtering and mipmaps once before the first GPU upload, through a controlled loader callback. Drei currently preuploads in an effect, while the custom hook configures textures in a later effect; several consumers share cached textures. Clean this up to avoid redundant uploads, but do not claim it caused this reproduction.
5. **Failure reporting and recovery:** add a debug-only texture/material comparison and a user-copyable diagnostic report with asset URL, actual dimensions, browser version, WebGL capability and shader errors. Catch asset load errors and canvas failures. Provide an obvious classic portfolio link. Successful image decoding alone cannot detect the reproduced failure; a small rendered probe is a stronger diagnostic.
6. **If black surfaces remain after the asset fix:** compare untextured lit material, textured unlit material and textured lit material. If untextured lit geometry fails, inspect shader compile/link errors and light uniforms, then separately disable shadows and point lights. If all material variants fail, investigate context loss/capabilities. Do not globally increase lighting to mask a failed texture.

Three r171 uses WebGL2; legacy WebGL1 non-power-of-two restrictions are not a sufficient explanation. Do not switch off all mipmaps or downgrade Three as the primary fix. See https://threejs.org/docs/pages/WebGLRenderer.html .

## Issue 1: performance

These are confirmed code costs, ranked by likely benefit. Rankings and speedups must be verified on representative devices.

| Priority | Evidence | Proposed change |
|---|---|---|
| High | `InteractionRaycast.tsx` recursively intersects all scene children every frame, then filters by distance. `raycastTerrain.ts` repeats this pattern for mining/placement/doors. | Register pickable objects; set raycaster.far before intersection; reuse vectors/results. Share compatible center-ray results within a frame. Use occupancy-grid DDA for full cubes, with explicit geometric intersection for partial fixtures. Preserve occlusion and interaction semantics. |
| High | `Canvas` leaves DPR and antialiasing at Fiber defaults: DPR [1,2], antialias=true. | Add Auto/Low/Medium/High quality. Start Low at DPR 1, shadows off, restricted lights; adapt resolution using sustained frame-time windows with hysteresis. Antialias changes require renderer recreation, not a mutable toggle. |
| High | Every `TorchBlock` creates a point light; nine decorative torches exist in the world data, and placement can add more. | Keep all visible emissive flames, but use a fixed pool of nearest real lights (initial proposal: 0–2 Low, 4 Medium, 8 High). Update selection at low frequency and avoid changing shader light counts as the player moves. Light distance attenuates illumination; it does not remove each light from the shader globally. |
| High | `InstancedVoxelBlocks.tsx` explicitly disables frustum culling and groups globally by material. | Partition rendering into spatial chunks, with maintained bounds and frustum/distance culling. Benchmark chunk sizes rather than assuming smaller always wins: more chunks can increase draw calls. |
| Medium/high | 3,944 full cubes: 23,664 cube faces / 47,328 triangles before other scene passes. | Generate exposed faces per chunk; later greedily merge compatible faces. An occupancy-only count finds 4,744 faces adjacent to empty cells, around 80% fewer. This is an opportunity estimate, not an achievable universal reduction: glass/leaves/partial blocks need special visibility rules. Keep buried blocks in the authoritative game model. |
| Medium | Six separate material groups per terrain box, even for uniform-face blocks; 12 populated material batches. | Uniform-face blocks can use one material. Multi-face blocks can use an atlas with padded mip-safe UVs or texture arrays with face indices. Current opaque terrain is roughly 72 group draws per main pass; this is a source-derived estimate, not measured total scene draw calls. |
| Medium | `AnimatedGifPlane.tsx` redraws and uploads two 512 × 512 canvas textures every frame, even when not viewed. | Cache contexts, update at media cadence, suspend offscreen/distant/hidden updates; use static posters in Low. Evaluate video/sprite-sheet playback for reliable animation. Two RGBA uploads are about 2 MiB per frame, or 120 MiB/s at 60 FPS, before mipmap/driver overhead. |
| Medium | Terrain edit changes the combined blocks array, regrouping global batches and rewriting instance matrices; instance capacity follows count. | Maintain per-chunk dirty flags and stable capacity. Rebuild edited chunk and boundary neighbors only. Keep the occupancy/collision model authoritative. |
| Lower, profile first | Water ticks every 300 ms, sky allocates colors/vectors per frame, particle pools scan inactive slots, some mining state is set during frames. | Use a water active frontier, reuse scratch objects, track active particles, and send React only actual UI changes. Do not rewrite the existing indexed collision system without evidence. |

Instancing already exists and is worth preserving; “add instancing” alone is not a solution. Likewise, setting raycaster.far helps but does not eliminate the per-instance loop of a globally batched terrain mesh.

### Measurement and delivery sequence

1. **Baseline instrumentation:** add an opt-in overlay/report recording frame-time median/p95, frames over 50 ms, renderer draw calls/triangles/textures, DPR, viewport, visible chunks, point lights, and timed CPU work for picking, water and terrain edits. Use Chrome performance traces; collect GPU timings only where supported. Measure a production export, not development mode, with identical viewport, route, day phase and quality.
2. **Texture compatibility change first:** ship and validate independently so a graphics rewrite cannot obscure whether the original defect is solved.
3. **Low-cost performance work:** quality settings, bounded lights, restricted/shared picking, media throttling. Compare changes one at a time against baseline. Provisional goals: normal machines near 60 FPS (16.7 ms), older integrated graphics with a usable Low mode near 30 FPS (33.3 ms), p95 comfortably close to the selected budget and no routine >100 ms edit stalls. Final supported hardware and acceptance thresholds require user agreement.
4. **Chunk rendering and edits:** add culling and local rebuilding. Verify mining exposes buried blocks, chunk-border edits update both sides, fixtures keep correct collision, and picking/placement still resolves block coordinates.
5. **Surface meshing if still needed:** exposed-face meshing before greedy merging. Preserve texture orientation/repetition, leaves cutouts, glass, water and partial fixture geometry. Regression tests should target these behaviors, not duplicate implementation details.
6. **Fallback and lifecycle:** reuse the existing classic portfolio in `app/page.tsx`. Lazy-mount the game only when requested, and unmount/pause it when classic mode is chosen. The current Mobile link scrolls to #fallback; it does not itself unmount the Canvas. Handle unsupported WebGL2, asset failure and unrecoverable context loss. Pause hidden-page simulation/media; demand rendering is appropriate only if ongoing sky/game animation is suspended or explicitly invalidated.

Suggested device matrix: reported M1 Chrome first; same Mac Safari/Firefox; Windows Intel/AMD integrated GPU with Chrome/Edge; one older supported laptop. Check Retina/native DPR and DPR 1, cold/warm load, spawn, moving/turning, mining/placing, many torches, transparent materials, resized window, tab hide/resume, and a 10-minute session. Emulation/CPU throttling is useful but does not replace real GPU/browser tests.

Relevant primary guidance: https://r3f.docs.pmnd.rs/advanced/scaling-performance , https://r3f.docs.pmnd.rs/advanced/pitfalls , https://r3f.docs.pmnd.rs/api/canvas .

## Information still useful

Exact Chrome and macOS versions, whether Safari/Firefox on the same M1 reproduce the problem, and the weakest computer that should remain playable. A screenshot plus console errors from the affected browser would help identify any additional lighting problem after the SVG fix. No further clarification is needed to prepare the dimension fix and initial performance instrumentation.

## Implementation follow-up

Implemented explicit viewBox-matched dimensions for 47 world, player and sky SVG textures. Existing artwork and aspect ratios are unchanged. The diagnostic now compares the actual repository asset against an intentionally unsized control and a raster canvas. Browser verification: repository grass texture is 16 × 16, center RGBA [124,159,80,255], GL error 0; unsized control still renders black with error 1281. This supersedes the earlier statement that production texture files are unchanged. Changes are local and not deployed.
