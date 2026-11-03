# The trophy room

The separate Trophy section sits between the tournament roster and Community Gallery. The header navigation links directly to it.

Select the trophy or **Inspect the trophy** to open a viewer covering the browser viewport. Drag to turn it in any direction, use the mouse wheel or a two-finger pinch to zoom, and choose **Engraving** to see the back. Front and Reset view return to the opening angle. The minus/plus buttons provide an alternative to gestures. Arrow keys rotate the trophy; plus/minus zoom; Home or 0 resets it. The close button and native dialog Escape behavior return to the page.

The Aegis follows the supplied three-view reference with detailed silver relief panels, a bronze filigree frame, woven dark backing, and a polished back plate. The two transparent surface images were created with the built-in image generation tool; their prompts are saved in [assets/aegis-art-prompts.md](assets/aegis-art-prompts.md).

The physical body follows the front image's traced alpha outline, including its concave side cut-outs and narrow lower base. A thin bronze edge, raised central boss and stud caps, and fine surface displacement provide depth. Cooler lighting and small bevels retain the aged metal appearance. The champion names are added to the back plate's color and bump maps to look engraved. This remains a reference-inspired, texture-mapped 3D model.

## Engraving

The year, team name, and names are taken from the existing champion article in index.html:

- Year: the text of .champions-year.
- Team: the heading in .champions-copy.
- Players: the list items in .champions-roster.

The current engraving reads **2025 / Smoke Spammers / Bryan / Jayries / Jhim / Lloyd / Den**. Editing those champion fields updates the rendered engraving, trophy section labels, accessible description, and the image-view back.

## Files and loading

- [trophy.js](trophy.js): model, textures, lighting, pointer and keyboard controls, loading and fallback.
- [trophy.css](trophy.css): responsive section and viewer layout.
- [assets/aegis-front-detailed.png](assets/aegis-front-detailed.png) and [assets/aegis-back-detailed.png](assets/aegis-back-detailed.png): transparent front and back artwork.
- [assets/aegis-shape.js](assets/aegis-shape.js): alpha-traced silhouette and texture alignment.
- [tools/build-aegis-art.cjs](tools/build-aegis-art.cjs): rebuilds geometry metadata and direct-file texture copies after changing the artwork.
- [assets/vendor/](assets/vendor/): the local Three.js 0.187.0 bundle, license, and source notes.
- [tests/trophy.test.cjs](tests/trophy.test.cjs): integration checks requiring only Node.

The local library, shape metadata and artwork load when the trophy approaches the viewport or the viewer is opened. Hosted pages use the two PNG files. Direct file opening uses assets/aegis-local-textures.js, which embeds the same image bytes to avoid file-origin WebGL image restrictions. That larger embedded file is not loaded by HTTP sites. No fonts, model downloads or runtime CDN connections are required. The same renderer moves between preview and viewer and renders on changes rather than spinning continuously. Reduced-motion settings disable the front/back transition.

If 3D cannot initialize, the viewer explains that it is in image view. It still shows the detailed artwork and engraving, with Front, Engraving, zoom and close controls. Without JavaScript, the detailed PNG preview and champion information remain readable.

## Checks and practical limits

Run on Node 24:

~~~powershell
node --test --test-isolation=none tests/trophy.test.cjs
~~~

Seven checks passed, covering camera fit; finite geometry and normals; thin overall profile; detailed transparent artwork on the model; year, team and all five engraved names; local PNG loading and identical direct-file image bytes; rotation, selecting the back while artwork loads, view selection, zoom limits, reset, closing and renderer reuse; simulated pinch, pointer cancellation, wheel and keyboard handling; and image fallback. The default camera fit was checked at 320×400, 390×540, 844×250 and 1440×700 stage sizes. JavaScript syntax, unique HTML IDs, local asset paths and Git whitespace checks also passed.

The tests use the actual Three.js geometry with a simulated DOM and renderer. They do not validate final GPU shader output or browser layout. The connected browser failed before page navigation in this session, so live WebGL rendering, screenshots, physical touch gestures and native dialog interaction could not be verified. Inspect the local page in a browser before publishing.
