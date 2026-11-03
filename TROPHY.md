# The trophy room

The separate Trophy section sits between the tournament roster and Community Gallery. The header navigation links directly to it.

Select the trophy or **Inspect the trophy** to open a viewer covering the browser viewport. Drag to turn it in any direction, use the mouse wheel or a two-finger pinch to zoom, and choose **Engraving** to see the back. Front and Reset view return to the opening angle. The minus/plus buttons provide an alternative to gestures. Arrow keys rotate the trophy; plus/minus zoom; Home or 0 resets it. The close button and native dialog Escape behavior return to the page.

The model is a simplified, original bronze-and-silver shield inspired by the supplied front, back, and engraving references. It has actual dimensional geometry, raised silver swirls, rim ornaments, metal surfaces, and a silver back ring. The year, team name, and five players are rendered into the back ring's color and bump textures to look recessed in the metal. This is an interactive approximation of the references, rather than an exact reproduction of the original sculpted trophy.

## Engraving

The year, team name, and names are taken from the existing champion article in index.html:

- Year: the text of .champions-year.
- Team: the heading in .champions-copy.
- Players: the list items in .champions-roster.

The current engraving reads **2025 / Smoke Spammers / Bryan / Jayries / Jhim / Lloyd / Den**. Editing those champion fields updates the rendered engraving, trophy section labels, accessible description, and the simplified back image.

## Files and loading

- [trophy.js](trophy.js): model, textures, lighting, pointer and keyboard controls, loading and fallback.
- [trophy.css](trophy.css): responsive section and viewer layout.
- [assets/trophy-front.svg](assets/trophy-front.svg): native vector front preview.
- [assets/vendor/](assets/vendor/): the local Three.js 0.187.0 bundle, license, and source notes.
- [tests/trophy.test.cjs](tests/trophy.test.cjs): integration checks requiring only Node.

The Three.js bundle is loaded as a classic local script only when the trophy approaches the viewport or the viewer is opened. No fonts, textures, model files, or runtime CDN connections are required. All texture painting happens in the visitor's browser. The same renderer moves between preview and viewer, and renders on changes rather than spinning continuously. Reduced-motion settings disable the front/back transition.

If 3D cannot initialize, the viewer explains that it is in image view. Front, Engraving, zoom, and close controls remain available. Without JavaScript, the native vector preview and champion information remain readable.

## Checks and practical limits

Run on Node 24:

~~~powershell
node --test --test-isolation=none tests/trophy.test.cjs
~~~

Five checks passed: dimensional geometry and finite normals/positions; year, team and all five names painted in the engraving; opening, free rotation, view selection, zoom limits, reset, closing and renderer reuse; simulated pinch, pointer cancellation, wheel and keyboard handling; and graceful image fallback. The default camera fit was checked at 320×400, 390×540, 844×250 and 1440×700 stage sizes. HTML IDs and local asset paths, SVG parsing, JavaScript syntax, and Git whitespace checks also passed.

The tests use the actual Three.js geometry with a simulated DOM and renderer. They do not validate final GPU shader output or browser layout. The connected browser failed before page navigation in this session, so live WebGL rendering, screenshots, physical touch gestures and native dialog interaction could not be verified. Inspect the local page in a browser before publishing.
