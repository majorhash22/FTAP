# The trophy room

The separate Trophy section sits between the tournament roster and Community Gallery. The header navigation links directly to it.

Select the trophy or **Inspect the trophy** to open a viewer covering the browser viewport. Drag to turn it in any direction, use the mouse wheel or a two-finger pinch to zoom, and choose **Engraving** to see the back. Select **Move** to drag across the trophy after zooming in; shift-drag and two-finger movement also pan. Front and Engraving recenter the trophy, and Reset view restores the opening angle, position, zoom and rotation mode. The minus/plus buttons provide an alternative to gestures. Arrow keys rotate the trophy or pan in Move mode; plus/minus zoom; Home or 0 resets it. The close button and native dialog Escape behavior return to the page.

The Aegis follows the supplied three-view reference with detailed silver relief panels, a bronze filigree frame, woven dark backing, and a polished back plate. The two transparent surface images were created with the built-in image generation tool; their prompts are saved in [assets/aegis-art-prompts.md](assets/aegis-art-prompts.md).

The physical body follows the front image's traced alpha outline, including its concave side cut-outs and narrow lower base. A thin bronze edge, raised central boss and stud caps, and fine surface displacement provide depth. Cooler lighting and small bevels retain the aged metal appearance. The champion names are added to the back plate's color and bump maps to look engraved. This remains a reference-inspired, texture-mapped 3D model.

## Engraving

The year, team name, and names are taken from the existing champion article in index.html:

- Year: the text of .champions-year.
- Team: the heading in .champions-copy.
- Players: the list items in .champions-roster.

The current engraving reads **2025 / Smoke Spammers / Bryan / Jayries / Jhim / Lloyd / Den**. These occupy seven stacked serif rows in one panel at the top of the silver ring, framed by two fine radial dividers with forked ends. Light and dark cuts in the color map and a matching bump map give the text an etched finish. The remaining ring stays blank for future winning teams. Editing those champion fields updates the rendered engraving, trophy section labels, accessible description, and the image-view back.

## Files and loading

- [trophy.js](trophy.js): model, textures, lighting, pointer and keyboard controls, loading and fallback.
- [trophy.css](trophy.css): responsive section and viewer layout.
- [assets/aegis-front-detailed.png](assets/aegis-front-detailed.png) and [assets/aegis-back-detailed.png](assets/aegis-back-detailed.png): transparent front and back artwork.
- [assets/aegis-shape.js](assets/aegis-shape.js): alpha-traced silhouette and texture alignment.
- [tools/build-aegis-art.cjs](tools/build-aegis-art.cjs): rebuilds geometry metadata after changing the source artwork. Run the image optimizer afterward to refresh the hosted and embedded WebP copies.
- [tools/optimize-images.cjs](tools/optimize-images.cjs): builds the optimized images, lightweight trophy preview, and lossless direct-file textures. Requires the development-only `sharp` package.
- [assets/vendor/](assets/vendor/): the local Three.js 0.187.0 bundle, license, and source notes.
- [tests/trophy.test.cjs](tests/trophy.test.cjs): integration checks requiring only Node.

The section starts with a small WebP preview. The local library, shape metadata and full artwork load when the trophy approaches the viewport or the viewer is opened. Hosted pages use the two lossless WebP files in `assets/optimized/`. Direct file opening uses assets/aegis-local-textures.js, which embeds those same WebP bytes to avoid file-origin WebGL image restrictions. That larger embedded file is not loaded by HTTP sites. Closed viewer images are lazy-loaded. No fonts, model downloads or runtime CDN connections are required. The same renderer moves between preview and viewer and renders on changes rather than spinning continuously. Reduced-motion settings disable the front/back transition.

The viewer also has a CSS 3D image version with separate front and engraved back faces. It is interactive immediately while the WebGL model loads and remains available if WebGL cannot initialize. Dragging turns both faces; mouse, touch, keyboard, zoom, reset and close controls work in this mode too. Turns made while loading carry into the WebGL model. Native image dragging is disabled, the viewer captures the pointer until release, and cancelled gestures stop rotating. The image version has a shallow two-face profile rather than the WebGL model's sculpted relief. Without JavaScript, the WebP preview and champion information remain readable.

## Checks and practical limits

Run on Node 22 or later:

~~~powershell
node --test tests/trophy.test.cjs
~~~

Nine integration checks cover camera fit; finite geometry and normals; thin overall profile; detailed transparent artwork; all seven engraving rows confined to one panel of the silver ring; blank future champion space; local lossless WebP loading and identical direct-file image bytes; native drag prevention; rotation during loading; view selection, zoom limits, reset, closing and renderer reuse; simulated pinch, pointer cancellation, wheel and keyboard handling; mouse/touch rotation without WebGL; and panning with Move, shift-drag and two fingers in both rendering modes. The default camera fit is checked at 320×400, 390×540, 844×250 and 1440×700 stage sizes, and the image fallback is checked at a 320-pixel stage width.

The integration tests use the actual Three.js geometry with a simulated DOM and renderer. The image optimization update was also checked in Playwright Chromium through local HTTP and direct `file://` opening. Live WebGL initialization, the engraved back, zoom, Move mode, reset, and native dialog Escape handling passed. Desktop screenshots of the engraving were inspected; layout checks included 1440-, 390-, and 320-pixel widths. There were no runtime errors or failed asset requests. The software GPU emitted ReadPixels performance warnings. Physical touch gestures, Safari, Firefox, and production hosting were not tested in this update.
