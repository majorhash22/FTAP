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

`assets/player-man.png` and `assets/player-woman.png` are FTAP's supplied default headset-and-jersey portraits, copied unchanged from `men.png` and `women.png`. Both are transparent PNGs at 1086 × 1448 pixels. Players without individual photos retain these defaults. The portrait panels follow FTAP's supplied team-presentation reference; player names, captain labels, lanes, champion badges, and medals remain native website elements.

`assets/teams/kat-and-friends/` contains the supplied Kat and Friends logo at 1402 × 1122 pixels and unchanged 1254 × 1254 jersey portraits for Makoy, Dream, Kat, Hanamichi, and Yokai. The original player filenames were matched to the uploaded images by SHA-256 hashes. All five starting players use their supplied jersey photos. The team's presentation uses the supplied pink `#FD81AF`, lavender `#D499FC`, and off-white `#FEFBFC` palette.

`assets/teams/scourge/` contains the supplied Scourge logo and jersey portraits for majorhash, Pookie, Shi, and Desync, copied unchanged at 1254 × 1254 pixels with their original filenames. Lowell retains the default male silhouette. The team's presentation uses the supplied near-black `#020102`, green `#03D549`, and ivory `#F0EDE3` palette.

`assets/teams/kneegrow/` contains the supplied dog logo at 533 × 576 pixels and jersey portraits for Den, Ivan, and Jing at 1254 × 1254 pixels, copied unchanged with their original filenames. Jaja and Hitori have no supplied photos and retain the default male silhouettes. The logo follows the shared team-logo size limit. The team's presentation uses the supplied charcoal `#33323C`, brown `#A57B6E`, and light gray `#E3E5E3` palette; the team tab stays neutral until selected.

`assets/teams/team-wraith/` contains the supplied helmet logo at 1086 × 1448 pixels and jersey portraits for kobedanigga (`kobe.png`), Zoro, Bosh, and Bunbun at 1254 × 1254 pixels, copied unchanged. Sixth man Natnat's supplied portrait is 1448 × 1086 pixels, also copied unchanged; Tree retains the default male portrait. The mistakenly supplied Hanamichi photo is excluded from this team. The presentation uses the requested gold primary `#B89B72`, cyan secondary `#00D9FF`, and background `#080D11`, with ivory `#EDE6D9` text. The tab uses primary gold on hover. Browser assets use optimized WebP copies in `assets/optimized/teams/team-wraith/`.

`assets/teams/apex/` contains the supplied Apex logo (`apex.png`) and jersey portraits for Haru, RueQiea, Suneyo, and Zen, copied unchanged at 1254 × 1254 pixels. Haru and Zen use the supplied replacement PNGs, compressed to 34,684-byte and 34,358-byte WebPs respectively. Suneyo's source is `suneyo.jpg`; its 71,013 bytes are compressed to a 30,326-byte WebP. Apex replaces the Restarted Noobs team name; Yeeet's card is now named Zen, and choongiii retains the default male portrait. The presentation uses primary `#00E5F5`, secondary `#E4EAF2`, and background `#050E15`. The logo uses a 420 × 420 lossless WebP and each portrait uses a 640 × 640 WebP at quality 82. All five optimized assets total 268,610 bytes versus 8,338,700 bytes of originals (96.8% fewer image bytes).

`assets/player-locked.svg` and `assets/player-silhouette-woman.svg` are the earlier code-drawn silhouettes, retained as legacy assets. The roster now uses the supplied PNG portraits with the existing responsive card sizing.

The six PNG files in `assets/medals/` are Dota 2 medal artwork by Valve, downloaded unchanged from OpenDota's asset collection. They match the medal styles in the supplied rank reference. Sources: [Crusader](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_3.png), [Archon](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_4.png), [Legend](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_5.png), [Ancient](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_6.png), [Divine](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_7.png), and [Immortal](https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_8.png). The site serves local copies and does not request these sources when visitors open it.

Medals follow the supplied roster key and subsequent rank corrections: navy = Crusader, green = Archon, brown = Legend, blue = Ancient, purple = Divine, red = Immortal. JL (JLPQ) and Jing have been updated to Legend. Star divisions and leaderboard positions are not assigned. The population percentages in the reference are not used.

## Optimized browser copies

The original PNG and JPEG files described above remain unchanged as source artwork. The website serves smaller WebP copies from `assets/optimized/`, generated by `tools/optimize-images.cjs`. Its `manifest.json` records the original SHA-256 hashes, source and output dimensions, file sizes, and lossless settings. The 49 source images total 85,285,982 bytes; their optimized copies plus two preview variants total 7,207,222 bytes, a reduction of 91.5% for the complete image set. This measures image bytes, not page load time.

Both full-resolution trophy faces are lossless and decode to exactly the original RGBA pixels. Logos, medals, and the Smoke Spammers logo use lossless encoding after resizing for their display size; portraits and backgrounds use high-quality lossy encoding with transparency retained. Player photos fit within 640 × 854 pixels at WebP quality 82, and default portraits use 600 × 800 pixels at quality 84. The 26 supplied player photos total 986,000 bytes, about 23–70 KB each. The hero has a 960-pixel variant for smaller screens, and the trophy has a lightweight 512-pixel preview. Artwork sources and ownership are unchanged.
