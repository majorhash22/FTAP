# FTAP — Full-Time Adulting, Part-Time Gaming

The interactive trophy room is documented in [TROPHY.md](TROPHY.md), including controls, engraving edits, local assets, tests, and verification limits.

## Image optimization

The site serves WebP copies from `assets/optimized/`. The complete optimized image set, including mobile hero and trophy preview variants, is 7.38 MB versus 98.02 MB of original artwork (92.5% fewer image bytes). Originals remain available in `assets/` for future edits. Portraits and backgrounds use high-quality compression; full-resolution trophy textures retain identical pixels and transparent edges.

All 32 supplied player photos, including retained former-roster assets, use WebP at up to 640 pixels wide and quality 82, about 23–70 KB per photo. Default portraits use 600 × 800 WebP at quality 84. These sizes cover the player cards at twice their display resolution. All player cards use lazy loading and asynchronous image decoding. The 28 individual photo files used by the roster total about 1.04 MB. The optimizer applies these settings to future player photos too.

The hero uses a smaller responsive image on phones, with matching preload settings to avoid a duplicate download. Other images decode asynchronously, and images inside closed dialogs load lazily. Full trophy textures and the 3D library load when the trophy approaches the screen or the viewer opens. HTTP pages never download the embedded direct-file texture script.

To regenerate copies after editing original images, install `sharp` in your development tooling and run `node tools/optimize-images.cjs`. An optional second argument accepts the absolute path to that package. This is a maintenance command; the website still needs no installation or build step. If the original trophy artwork changes, run `node tools/build-aegis-art.cjs` before the image optimizer. `assets/optimized/manifest.json` records source hashes, dimensions, and output sizes. Commit the optimized folder and regenerated embedded textures together with any reference changes.

Verification for this update: all nine Node trophy tests passed. Playwright Chromium checks passed at 1440, 390, and 320 pixels, including all six team tabs and their images, event switching, announcement and gallery dialogs, application generation, mobile navigation, and the live WebGL trophy controls. Direct `index.html` opening also initialized the WebGL trophy from embedded WebP textures. Network checks found no missing assets, runtime errors, original PNG/JPEG requests, or full trophy textures during initial loading. Desktop and phone screenshots were inspected. The software GPU produced ReadPixels performance warnings; other browsers, physical touch gestures, and production hosting were not tested. The image-byte reduction does not imply an equivalent reduction in total page load time.

## Open the website

Extract the entire ZIP first. Open `index.html` in a modern browser. No installation, build step, account, or internet connection is needed for the website itself. Keep the files and folders together.

The extracted FTAP-Website folder is the complete website. To put it on static hosting later, upload its website files with `index.html` at the hosting root.

## Make it yours

Open `community.js` in a plain text editor. This is the central content file, with examples next to each setting. Save your changes and refresh the browser. The file is JavaScript: preserve commas and quotation marks. Strings can use double quotes if they contain apostrophes.

- **Discord invite:** set `discordInvite` to your full `https://discord.gg/...` URL. Until then, Join Discord shows an honest invite-pending message.
- **Meet the Tropa:** add real member objects to `members`. Include their display name, bio, favorite games, optional quote, and optional image path. Ask permission before publishing member details or photos. Member cards open full profiles. Initials appear when no image is supplied.
- **Staff:** add objects to `staff`. Names and moderator roles have been left empty until you supply real ones.
- **Events:** add objects to `events` with valid ISO 8601 dates including a timezone offset. Future events appear chronologically in the visitor's local timezone. Event details offer a downloadable calendar file. Past events are omitted. No event dates have been invented.
- **Announcements:** edit the two starter announcements or add more.
- **Gallery:** put images in `assets/gallery/`, then add their relative paths, descriptive alt text, title, category, and caption to `gallery`. The supplied image is clearly labeled as original community artwork, not a photograph of members or a real gameplay screenshot.
- **Rules and FAQs:** review the starter community code and answers before publishing. They are suggested copy for FTAP and can be changed in `community.js`.
- **Applications:** optionally name your Discord introduction/application channel in `applicationChannel`.

## Applications work without a server

The introduction/application form creates a formatted message in the browser. Members can copy it or download a text file, then share it in Discord themselves. The site does not send applications, collect them, authenticate Discord members, or store form data on a server. No submission is claimed until the member actually shares their message in Discord.

## Design and animation

The site uses original fantasy artwork, a text-based FTAP wordmark, dark stone-inspired surfaces, dramatic serif headings, and restrained red accents. Dota 2's official website is a visual reference only: https://www.dota2.com/home. This is an independent community website.

Motion includes a cinematic hero entrance, a short image push-in, staggered section reveals, menu and button transitions, and an interactive gallery. Operating-system reduced-motion preferences remove animation. The artwork settles after its opening movement; it does not run an endless background animation.

All interface text is native HTML. Fonts use built-in system fallbacks, so there are no external font requests. Images, CSS, scripts, and favicon are local. Core reading, anchor navigation, and the community code remain available if JavaScript is disabled.

## Files

```
FTAP-Website/
  index.html       Website structure and accessible dialogs
  styles.css       Layout, colors, typography, animation, mobile styles
  app.js           Content rendering, dialogs, profiles, gallery, applications
  community.js     Your editable content and Discord invite
  trophy.js        Procedural 3D trophy, engraving and viewer controls
  trophy.css       Trophy room and full-screen viewer layout
  assets/
    hero.png       Original cinematic FTAP artwork
    favicon.svg    Small FTAP favicon
README.md          These instructions
ARTWORK.md         Artwork origin and generation prompt
```

## Custom colors

The first block of `styles.css` contains the shared palette, spacing, and font settings. The design works best when accents stay consistent across the page.

## Optional local server

Double-clicking `index.html` is sufficient. If you already have Python, you can also serve the FTAP-Website folder with `python -m http.server 8000` and open `http://localhost:8000`. This is optional.

## Quality checks

The working site was checked in the Codex in-app browser through a local HTTP preview. Desktop and phone screenshots were inspected. Layout checks covered 320, 390, 768, 1024, 1280, and 1536 pixels; there was no horizontal page overflow at those widths. This is browser testing of representative sizes, not a guarantee for every browser or device.

| Check | Result |
| --- | --- |
| Page title, meaningful content, JavaScript syntax | Passed |
| Local artwork and script loading | Passed |
| Browser warnings and errors | No relevant errors or warnings |
| Mobile menu opens, navigates, and closes | Passed |
| Announcement detail and invite-pending dialogs | Passed |
| Application generation, copy, and edit | Passed |
| Gallery lightbox and next/previous navigation | Passed |
| FAQ expansion | Passed |
| Sample member profiles, staff, future event details | Passed in a separate QA fixture |
| Invalid and past sample events | Correctly omitted |
| Event calendar download action | Exercised in the QA fixture |
| ZIP integrity and relative asset references | Validated before delivery |

The in-app browser's security policy prevents direct `file://` navigation. The package is designed for direct local opening, using relative paths, classic scripts, and no fetch requests or external dependencies, but direct file opening was not verified inside that browser. The application provides a manual-copy fallback when clipboard access is unavailable. Downloaded calendar files were not imported into a calendar application.

Reduced-motion styles and the preference listener were reviewed in source. The operating system's motion preference was not changed during testing. Backend collection, live Discord data, and Discord authentication are outside this static ZIP.

### Design verification

Fresh desktop concepts were created for the hero/notice board, about/community, events/gallery, and community guide. The implementation and reference images were inspected at the 1536 × 1024 design size and compared for five concrete details: headline and navigation copy, open/split section layouts, serif/sans type hierarchy, charcoal/ivory/red colors, and rectangular button geometry and spacing. Mobile continuation was inspected at 390 pixels.

The visual review corrected the opening headline scale and notice-board position, and the image review corrected the gallery height. The hero introduces no extra badge or eyebrow. The requested FTAP name, tagline, primary navigation, and hero actions are preserved.

Intentional differences from generated concepts: built-in Georgia and Segoe UI/Arial keep the package offline; a separate original production artwork is used; unrequested navigation and decorative copy invented in supporting concepts are omitted; the gallery includes explicitly labeled FTAP artwork until real community images are supplied. Supporting sections use more vertical space and an expanded gallery as part of one continuous page; decorative background art is concentrated in the hero and gallery. Member spotlights, staff names, and community member counts remain unset. FTAP has supplied the tournament dates, team lineups, and previous champions. These are deliberate content and portability choices.

## Community copy update

The navigation stays fixed at the top on desktop and phones. Section navigation leaves enough space beneath it. The FTAP wordmark uses white FT and red AP; the small label below the header logo has been removed. The tagline is “Clock-out. Login. G!”. The about, values, events, and first two FAQs use the supplied community copy, preserving its spelling. All earlier application, gallery, and roster functionality remains available.

This update was checked at 1280, 390, and 320 pixels. The fixed navigation, anchor spacing, mobile menu, long headings, and updated FAQ answers passed. No horizontal page overflow or browser warnings/errors were observed.


## Year-End Civil War and supplied images

The Gaming Events section contains a two-slide carousel: the annual Year-End Civil War Dota 2 tournament on December 26–27, 2026, followed by the 2025 champions, Smoke Spammers. The champion lineup is Bryan, Jayries, Jhim, Lloyd, and Den. The current tournament year is 2026, following the supplied 2025 championship year. Match times, prizes, and registration details remain unspecified.

Use the arrows or dots to switch slides. Left/right arrow keys also work while the carousel or its controls have focus. Touch swipes are supported. Slides change with a brief animation, which is disabled when reduced motion is requested. The carousel does not rotate automatically. With JavaScript disabled, both spotlights remain visible as stacked articles.

Edit the two articles inside `#event-carousel` in `index.html` to change the tournament or champion copy. Edit the six articles inside `#tournament-teams` to change tournament rosters, captains, roles, ranks, or substitutes. Dates also appear in the events introduction, the community quick link, and the team section date display. Edit `announcements[].image` and `imagePosition` in `community.js` to change the announcement pictures or crops. Dated future events can still be added to `events` in `community.js`; they appear below the carousel. The Discord invite remains ready for you to fill in later.

The hero uses `assets/gamingbg.png`. The welcome announcement uses `assets/vault.jpg`; the community hub announcement and the Year-End Civil War event use `assets/civilwar-banner.png`. The champion slide uses `assets/smokespammers.png`. The earlier generated `assets/hero.png` remains in the gallery.

This carousel update was checked in the in-app browser at 1536 × 1024, 390 × 844, and 320 × 760 through a local HTTP preview. Image loading, hero and announcement crops, fixed header and anchor spacing, mobile menu navigation, arrow/dot/keyboard slide switching, equal slide heights, champion names, announcement opening, and the updated FAQs passed. No horizontal page overflow, content clipping within either slide, or browser warnings/errors were observed. Physical touch swiping, direct file opening, and reduced-motion system settings were not exercised in this update.


## Championship spotlight update

Smoke Spammers now has a larger serif team headline, muted gold championship framing, a red-accented “The title is theirs. The bardagulan is forever.” callout, and a prominent roll call for Bryan, Jayries, Jhim, Lloyd, and Den. The team logo and names have brief entrance animations when this slide is selected; reduced-motion styles disable those animations. Both slides share the same height at each layout size.

`assets/smokespammers.png` is now the replacement image supplied in the follow-up. It is included unchanged, with its correct native dimensions. Other supplied pictures and community copy remain in place.

The champion presentation was checked at 1536, 1024, 390, and 320 pixels in the in-app browser. The replacement image loaded at 1007 × 938, slide switching worked by arrows, dots, and keyboard, both slides kept equal heights, all five names remained visible with spacing, and no horizontal page overflow or browser warnings/errors were observed. Reduced-motion handling was reviewed in CSS.


## Announcement copy and developer credit

The welcome and community hub announcement summaries now use the supplied follow-up wording. Both the JavaScript settings and HTML fallback were updated. The footer credits “Developed by WA Origin” with a link to `https://waorigin.ca`, visible on desktop and phones. The link opens in a new tab. This package also retains the latest championship presentation and replacement Smoke Spammers image.

The new copy and footer were checked in the in-app browser at 1280, 390, and 320 pixels. Both announcement summaries matched the supplied text, the WA Origin link had the correct destination, and the credit stayed visible without horizontal page overflow. The welcome announcement still opened its details dialog. No browser warnings or errors were observed. The external WA Origin page was not opened.

## 2025 champions and 2026 tournament teams

The champion spotlight now displays 2025 prominently, with stronger victory copy and gold accents that retain the site's charcoal, ivory, red, and serif styling. The tournament date is December 26–27, 2026. No start time or timezone is assumed, and the date does not depend on the visitor's timezone.

The larger team section sits between Gaming Events and Community Gallery. It contains six teams, including six captains, player roles and ranks, and Team Baddiengan's sixth man Pardun. Team Wraith's confirmed roster is Kobe (captain, Mid Lane, Immortal), Pookie (Safe Lane, Legend), Ivan (Offlane, Immortal), Bunbun (Hard Support, Archon), and Desync (Soft Support, Ancient), in that order. The five supplied Wraith jersey portraits are served as 640 × 640 WebPs totaling 166,018 bytes versus 11,187,641 bytes of originals (98.5% fewer image bytes). The previous Wraith starters and reserve are no longer displayed. Other teams retain their existing rosters pending further updates, and the section omits an overall player total during the roster changes. Den and Yeeeeez have gold names and visible “2025 Champ” badges. A legend explains the badges. Quick links below the hero actions and the Meet the Tropa roster lead to the section; the tournament slide links there as well. The lineups use native HTML, so they remain readable without JavaScript.

Wraith roster verification passed in Playwright Chromium at 1440, 390, and 320 pixels wide on the local HTTP server. The roster quick link, Scourge-to-Wraith tab switching, exact player order, captain label, image decoding, and text/page overflow checks passed. Screenshots were inspected at desktop and phone sizes. No missing assets, JavaScript errors, or original PNG/JPEG requests were observed. The existing trophy produced software-GPU ReadPixels performance warnings during scrolling; production hosting and other browsers were not tested.

Kneegrow's confirmed lineup is Den, Jaja, Bosh, Hitori, and Jing, in that order. Bosh replaces Ivan and retains his Divine rank and Offlane role. Den remains captain and a returning 2025 champion; the other players retain their existing ranks and roles. Den, Jaja, Bosh, and Jing use the four supplied Kneegrow jersey photos, preserved as original PNGs and compressed to 640 × 640 WebPs totaling 96,084 bytes versus 8,078,988 source bytes (98.8% fewer image bytes). Hitori retains the default male portrait until a photo is supplied.

Kneegrow verification passed in local Playwright Chromium at 1440, 390, and 320 pixels wide: roster order, four photo loads, Hitori's placeholder, Den's captain and champion badges, Bosh's Divine rank, Wraith-to-Kneegrow tab switching, and text/page overflow checks. Desktop and phone screenshots were inspected. The other five team articles match the preceding version, and all 57 image-manifest entries match their source hashes and file sizes. No missing assets, JavaScript errors, or original PNG/JPEG requests were observed; the existing trophy's software-GPU ReadPixels warnings remain. Other browsers and production hosting were not tested.

Scourge's confirmed starting lineup is majorhash (captain, Soft Support), Zoro (Safe Lane), Tree (Mid Lane), natnat (Hard Support), and Shi (Offlane), in that order. Four supplied starting-player photos are served as WebPs totaling 94,240 bytes; Tree uses the default silhouette. Lowell is the sixth man, shown separately on the bench as Hard Support with a Crusader medal and the supplied Scourge jersey portrait. His photo is compressed from 1,914,288 bytes to a 24,070-byte, 620 × 854 WebP (98.7% fewer image bytes), with the original PNG retained. Existing player ranks and Zoro's 2025 champion badge are preserved. Tree has no rank medal until his rank is supplied. Pookie and Desync no longer appear in Scourge's lineup. Playwright Chromium checks passed at 1440, 390, and 320 pixels: the unchanged starting five, Lowell's sixth-man label, Hard Support role, Crusader medal, compressed photo decoding, tab switching, and text/page overflow. Desktop and phone screenshots were inspected. All 60 manifest entries match their source hashes and output sizes. No missing assets, JavaScript errors, or original PNG/JPEG requests were observed; the existing trophy's software-GPU ReadPixels warnings remain. Other browsers and production hosting were not tested.

Chrome browser checks covered rendered widths of 320, 390, approximately 768 and 1024, and 1440 pixels. The team grid switched between one, two, and three columns without horizontal overflow or content overflow. The champion slide fit at phone and desktop sizes; carousel dots, arrows, and keyboard switching worked. All six roster counts (5, 5, 5, 5, 6, 6), the three champion labels, and the hero quick-link target were checked. JavaScript syntax and Git whitespace checks passed; no browser warnings or errors were observed. Screenshot capture failed in the connected browser, so this update was verified through rendered DOM content and element measurements rather than a completed visual screenshot review.

## Team portrait carousel and medal update

The tournament team section shows one team at a time. Select a team with its named button, previous/next arrows, left/right arrow keys, or Home/End keys. The status label includes the selected team's name. Touch-swipe handling is included. The carousel does not advance automatically. Without JavaScript, all six team presentations remain stacked and readable.

Apex (Team 4, formerly Restarted Noobs) uses its supplied logo and jersey portraits for all five players: Haru, Zen (formerly Yeeet), RueQiea, choongiii, and Suneyo. The logo and five photos total about 307 KB in WebP, down from 10.44 MB of source artwork. Haru uses the supplied `haru2.png`, compressed from 2.13 MB to about 38 KB, with the browser URL versioned to refresh existing caches. Zen's replacement portrait is about 34 KB. choongiii's supplied portrait is compressed to about 34 KB. Suneyo's portrait comes from the supplied JPEG and is compressed to about 30 KB. Apex uses primary `#00E5F5`, secondary `#E4EAF2`, and background `#050E15`. Team Wraith uses primary `#B89B72`, secondary `#00D9FF`, and background `#080D11`, with the primary gold for tab hover.

Each lineup uses five angled portrait panels with a supplied photo or default silhouette, the player's name and lane, and a local Dota 2 rank medal. “Captain” is a separate role label on the portrait. Den and Yeeeeez retain gold names and “2025 Champ” badges. Pardun appears as a separate sixth-man card beneath Team Baddiengan's starting lineup. The medals follow the supplied roster's color key; see `ARTWORK.md` for asset sources. To edit the lineup, update the relevant `.team-slide` article in `index.html`, including its names, roles, medal filenames, and rank labels.

The requested introductory paragraph has been removed. Dates in the annual tournament feature are larger and bold, and the team section's date numerals are bold as well. The Smoke Spammers image now keeps its natural 1007:938 aspect ratio. The champion layout uses content-sized rows and explicit spacing above the winning-five divider, so the artwork and copy cannot overlap that line.

Browser checks covered 320, 390, 600, approximately 768 and 1024, and 1440 CSS pixels. Portrait layouts used two, three, or five columns as space allowed, with no horizontal overflow or clipped player text. The sixth-man layout also passed at phone and desktop sizes. Team selection, all six lineups, wraparound arrows, keyboard switching, date font weight, medal loading, image aspect ratio, and separation above the champion divider were checked. A fresh page load produced no browser warnings or errors. JavaScript syntax and Git whitespace checks passed. Physical touch swiping was not exercised. Screenshot capture returned an incomplete view, so complete visual screenshot verification remains unavailable; content and sizing were checked through the rendered DOM.
