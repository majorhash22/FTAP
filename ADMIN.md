# FTAP match administration

The site includes a Node.js service, a persistent SQLite database, and /admin/. The existing public website and team banners remain in place.

## Start locally

Use Node.js 24 or newer. There are no npm dependencies to install.

~~~powershell
npm run setup:admin
npm start
~~~

Setup prompts for an admin username and a password of at least 14 characters. Password input is hidden. Only a salted scrypt hash is saved in .env; neither .env nor the database is committed to Git.

Open http://127.0.0.1:3000/admin/ and sign in. Public matches are at http://127.0.0.1:3000/matches/.

Use the same hostname and port as PUBLIC_ORIGIN. The default is 127.0.0.1, rather than localhost, so session and request-origin validation are predictable.

## Import and publish

1. In **Roster account IDs**, optionally save each player's numeric Dota Friend ID, Steam64 ID, or numeric steamcommunity.com/profiles/ URL. Vanity URLs need a numeric ID instead.
2. Enter a completed Dota match ID and select **Fetch match**.
3. When at least three known players on each side identify different roster teams, the portal selects their fixture and sides automatically. Otherwise, select the fixture and the team that played Radiant; Dire is its opponent.
4. Review the API-reported winner, suggested MVP, heroes, final inventory, backpack, neutral item, and player statistics.
5. Select **Publish result**. The public page loads the saved result on its next visit or refresh. Subsequent results require no code edit or Git push.

Each existing round-robin fixture represents **one completed 5v5 game**. Multi-game BO2/BO3 aggregation is not included; this follows the current one-game fixture model.

A Dota match ID can be published against only one fixture. Replacing a fixture result requires the **Replace** checkbox. **Unpublish** returns a fixture to pending; the same ID can be imported again. Publishing, replacement and unpublishing are recorded in the database audit table.

Published results include winner and MVP panels, start time, duration, side scores, heroes, K/D/A, levels, GPM/XPM, net worth, last hits/denies, hero damage, tower damage, healing and final item slots. Wide scoreboards scroll inside their own region on phones.

## MVP definition

The automatic award is labeled **FTAP calculated MVP**. It is not Valve's in-game MVP or a STRATZ award.

Candidates are the five players on the winning side. Each metric is normalized within that side using its minimum and maximum. Equal values receive 0.5. The weighted score uses:

| Metric | Weight |
| --- | --- |
| Kills + assists | 35% |
| Hero damage | 20% |
| Tower damage | 15% |
| Healing + 100 × observer/sentry wards placed | 15% |
| Gold per minute | 10% |
| Fewer deaths | 5% |

Unavailable metrics do not provide a relative advantage; missing public statistics are displayed as —. Equal final scores are resolved by player slot. This is an explicit tournament scoring heuristic, not a claim of role-neutral or official performance measurement.

The admin can select any of the ten participants instead. That award is labeled **Admin-selected MVP**. The match winner always comes from the imported data after side mapping; the browser cannot submit a fabricated winner or scoreboard.

## OpenDota availability

The backend calls the official [OpenDota API](https://docs.opendota.com/) for matches and hero/item constants. No API key is required to begin testing; the optional OPENDOTA_API_KEY belongs only in server secrets. Provider limits and data availability apply.

Basic completed-game data can be available before replay analysis finishes. Missing data is not filled with invented values. **Request detailed analysis** asks OpenDota to parse an available replay; fetch the same match again afterward. Processing may take several minutes. Unavailable or expired replays cannot be recovered by this app. Test recent custom-lobby IDs from the actual tournament setup before relying on imports.

Anonymous or hidden account IDs prevent automatic roster identification. The admin can still map Radiant and Dire manually when match statistics are available.

Published snapshots are stored locally; public visits never refetch each game from OpenDota. Match fetches are cached for one minute and hero/item constants for one day. Only signed-in admins can import matches or request parsing.

## Production hosting

**A Git push alone does not start the backend.** Static-only hosting such as GitHub Pages cannot run Node.js or persist the database.

Use a Node.js 24+ host or the included Dockerfile, with:

- NODE_ENV=production
- HOST=0.0.0.0
- PORT supplied by the host, or 3000
- PUBLIC_ORIGIN set to the backend's HTTPS origin, with TLS terminated by the hosting platform or reverse proxy
- ADMIN_USERNAME and ADMIN_PASSWORD_HASH from local setup, entered into the host's secret settings
- DATABASE_PATH on a **persistent volume**, such as /app/.data/ftap.sqlite
- Optional OPENDOTA_API_KEY in secret settings

Use one service instance with its SQLite volume. Ephemeral serverless filesystems and multiple independent database copies are unsuitable. The service serves the website, API and /admin/ together. Its health endpoint is /api/health.

The Docker image runs as the non-root node user. Git metadata, environment files and local databases are excluded. Mount a persistent volume at /app/.data and supply the production variables above.

To keep a separate static frontend, set matchApiBaseUrl in community.js to the backend's HTTPS origin. Public results permit cross-origin reads. **Admin sign-in** then links to the backend, where login and writes run on its own origin. Never put passwords or API keys in community.js.

The server exposes an explicit list of public files. Environment files, server source, tooling, Git metadata and database paths are not served.

## Sessions and maintenance

Session tokens are random and stored as hashes in SQLite. Cookies are HttpOnly and SameSite=Strict, with Secure enabled for HTTPS. Writes require the correct origin and session CSRF token. Sign-in and import operations are rate-limited. Sessions expire after 12 hours; restarting the server revokes them.

Run npm run setup:admin again to rotate local credentials, then restart. On managed production hosting, update the secret settings and restart. Do not send the password or hash through chat or commit them.

Back up the persistent database with the host's snapshot feature, or stop the service cleanly before copying ftap.sqlite. Preserve the volume across deployments. The default local path is .data/ftap.sqlite.

## Verification

~~~powershell
npm test
~~~

Match tests cover authentication, CSRF/origin checks, session expiry, login throttling, invalid/incomplete matches, account mapping, auto-matching, MVP selection, duplicate IDs, explicit replacement, unpublishing, persistence, protected files, provider caching/failures and safe rendering.

The deterministic tests use a mocked provider. A live HTTP check also signed in, imported a recent public OpenDota game, published its winner/MVP/items, read the public result, unpublished it and signed out, using only an isolated temporary QA database. Interactive credential setup was verified in a separate temporary folder. The browser preview tool failed before navigation, so live browser layout and physical touch interaction remain unverified. Custom-lobby coverage and production deployment require the owner's hosting configuration and representative match IDs.
