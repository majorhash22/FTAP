# FTAP original artwork

## Interactive trophy

The Aegis uses detailed front and back artwork created with the built-in image_gen tool from FTAP's supplied three-view reference. The unchanged transparent PNGs are assets/aegis-front-detailed.png and assets/aegis-back-detailed.png. The complete prompts are preserved in assets/aegis-art-prompts.md.

The front alpha outline is traced into the actual 3D body, with a thin bronze edge, raised central boss and studs, and shallow surface displacement. The artwork supplies the intricate silver relief and bronze filigree. The year, team and player names are painted into the back's color and bump maps at runtime. The older code-drawn assets/trophy-front.svg is retained as a legacy asset and is no longer the live preview.

tools/build-aegis-art.cjs preserves the PNG bytes while producing geometry metadata and embedded copies for direct file opening. HTTP pages load the PNGs normally; the embedded copies are loaded only for file-origin pages. This is a reference-inspired, texture-mapped model, rather than an exact sculpted game asset.

The local Three.js rendering library is MIT-licensed; its license and source notes are preserved in assets/vendor/. See TROPHY.md for interaction details and verification limits.

## Original community artwork

`assets/hero.png` was created with the built-in OpenAI image-generation tool for this website. It is original fantasy art and does not depict actual FTAP members or an actual game screenshot. This original image contains no Dota characters or logos. It remains in the community gallery; the hero now uses FTAP’s supplied gaming background. The original image is 1672 × 941 pixels.

Prompt:

> One professional cinematic fantasy game key art illustration for FTAP, a Discord competitive gaming and social community. A vast ruined stone arena beneath a charcoal storm sky, distant ruins and gray smoke. One small armored knight viewed from behind at center-right, with a tattered red cape, facing a towering ancient stone portal glowing red. High-contrast rim light, sparse amber embers, worn metal, chipped masonry and textured cloth. Dark atmospheric visual gravity inspired by dota2.com, with entirely original subjects. Wide 16:9 composition, quiet very dark left half for native website text. Charcoal #111619, red #c54736, muted stone gold and cool gray. No text, typography, logos, interface or watermark; no recognizable Dota characters or symbols.

The FTAP wordmark uses live text. The favicon is a simple local typographic mark.


## Community-supplied assets

FTAP supplied `gamingbg.png`, `vault.jpg`, `icefrogdota.jpg`, and `smokespammers.png` for this update. They are copied unchanged into `assets/`. The website uses them for the hero, announcement thumbnails, tournament feature, and champion logo as requested. These images are separate from the generated gallery image described above. The supplied artwork, signatures, and marks are preserved.


The Smoke Spammers asset was replaced with FTAP’s follow-up image. The replacement is copied unchanged; the website only scales it to fit the champion slide.

`assets/smokespammers-background.png` is the supplied “Dota 2_ Heroes of the Ashen Battlefield.png”, copied unchanged at 1024 × 1536 pixels. It forms the Smoke Spammers slide's decorative background, using the same image opacity and dark gradient overlays as the Year-End Civil War poster. CSS scales and crops it to cover the slide at each screen size.

## Tournament player cards

`assets/player-man.png` and `assets/player-woman.png` are FTAP's supplied headset-and-jersey portraits, copied unchanged from `men.png` and `women.png`. Both are transparent PNGs at 1086 × 1448 pixels. Bunbun and Kat use the female portrait, and the other 30 tournament players use the male portrait. The portrait panels follow FTAP's supplied team-presentation reference; player names, captain labels, lanes, champion badges, and medals remain native website elements.

`assets/player-locked.svg` and `assets/player-silhouette-woman.svg` are the earlier code-drawn silhouettes, retained as legacy assets. The roster now uses the supplied PNG portraits with the existing responsive card sizing.

The six PNG files in `assets/medals/` are Dota 2 medal artwork by Valve, downloaded unchanged from OpenDota's asset collection. They match the medal styles in the supplied rank reference. Sources: [Crusader](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_3.png), [Archon](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_4.png), [Legend](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_5.png), [Ancient](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_6.png), [Divine](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_7.png), and [Immortal](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_8.png). The site serves local copies and does not request these sources when visitors open it.

Medals follow the supplied roster key and subsequent rank corrections: navy = Crusader, green = Archon, brown = Legend, blue = Ancient, purple = Divine, red = Immortal. JL (JLPQ) and Jing have been updated to Legend. Star divisions and leaderboard positions are not assigned. The population percentages in the reference are not used.
