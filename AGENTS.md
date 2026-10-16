# AGENTS.md

Guidance for AI agents and contributors working on the **Interactive Election Map**.

## Purpose

An interactive map that helps voters understand **what's on their ballot**, from federal down to county offices. Click into a state or county to see each office, who currently holds it, and who is running, with links to campaign sites and fundraising data (OpenSecrets).

The goal is to make getting informed about state and *local* races easy. Local races tend to get the least coverage and have the biggest information gap.

- **Live site:** https://votermap.vercel.app (Vercel)
- **Repo:** https://github.com/EMFCOLLEGE/InteractiveElectionMap
- **Next milestone:** the **November 3, 2026 general election**. Texas early voting runs about Oct 19–30, 2026.
- **Target scope for Nov 3:** the most competitive 2026 states, starting with **Texas, Georgia, and Michigan**, then **North Carolina, Arizona, Wisconsin, Pennsylvania, Nevada, Maine, New Hampshire, and Ohio** as time allows. Today only Texas works, and other states show an alert.
- **Address/ZIP lookup ("what's on my ballot") is in scope** for Nov 3.

## Working rules

These rules apply to every change in this repo, whether made by a human or an agent.

1. **One PR per feature or fix.** Each roadmap item gets its own branch off `main` and its own PR. Don't bundle unrelated changes. Name branches `fix/<slug>`, `feat/<slug>`, `chore/<slug>`, or `docs/<slug>`.
2. **Small, frequent commits.** Each commit does one thing and leaves the app building. Write messages in imperative mood (`Move population CSV into public/`).
3. **The human contributor is the sole commit author.** Don't add `Co-Authored-By` trailers for AI agents. If an agent helped, say so in the **PR description** instead.
4. **Check before opening a PR:** `npm run build` passes, `npm run lint` passes (once configured), and you've clicked through the affected flow in `npm run dev` or `npm run preview`.
5. **PR descriptions** cover what changed, why, how it was tested, and the roadmap item it closes. Tick the roadmap checkbox in the same PR only if no other open PR also edits that line; otherwise tick it in a follow-up docs PR.
6. **Don't merge to `main` without review.** Use the Vercel preview deploy on each PR to check the change.
7. **Data accuracy is the product.** Every candidate and office must trace back to an official or reputable source. Cite it in the data file or PR, and never invent or guess candidates, incumbents, or district lines.
8. **No secrets in the client.** API keys (Google Civic, FEC, and so on) go in Vercel environment variables and are reached through serverless functions in `api/`, never through `VITE_*` variables.

## Tech stack

- **Vite 5 + React 18**, plain JavaScript/JSX (no TypeScript, no router, no state library)
- **react-leaflet / Leaflet** for the 2D map (CARTO light basemap)
- **deck.gl** (`GeoJsonLayer`, extruded) for the optional 3D population heatmap of Texas
- No backend. Everything is fetched client-side from static URLs.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # serve the built dist/ locally
```

Vercel deploys with the default Vite preset (`npm run build`, output `dist/`).

## Project layout

```
index.html                 Vite entry
public/
  2024_txpopest_county.csv TX county population estimates (Texas Demographic Center), used by the 3D heatmap
  data/<state>.json        Generated election data (see docs/data-schema.md). Don't hand-edit
scripts/
  fetch-<state>.mjs        Pulls official data for one state and writes public/data/<state>.json
  lib/normalize.mjs        Shared helpers (title casing, website cleanup, race sorting, file writing)
docs/
  data-schema.md           The normalized election data format
src/
  main.jsx                 React root
  App.jsx                  Landing page + top-level view state (federal -> state -> county), 3D toggle
  MapDisplay.jsx           2D Leaflet map: US states layer, TX counties layer, zoom/fly handling
  MapDisplay3D.jsx         3D deck.gl heatmap of TX counties by population (parses the CSV)
  sidebar.jsx              Sidebar: office list, candidate cards, party/year/type filters
  useCandidates.js         Fetches + normalizes candidate data into { positionId: { current, candidates } }
  data.js                  Hardcoded federal/state office definitions
  App.css                  All styling (CSS variables in :root)
```

### Data flow

1. `App.jsx` holds `viewLevel` (`federal` | `state` | `county`), `selectedState`, `selectedCounty`, and `is3DMode`.
2. Map components call `onSelectState` / `onSelectCounty` when a feature is clicked.
3. `Sidebar` calls `useCandidates()`, which fetches candidate JSON from the companion repo
   [`EMFCOLLEGE/Texas-Election-API`](https://github.com/EMFCOLLEGE/Texas-Election-API)
   (`DemCandidates2026.json`, `RepCandidates2026.json`). These look like exports of Texas Secretary of State primary filing data. **We don't maintain this feed, and its origin is unknown.** Treat it as legacy and plan to replace it (see Roadmap Phase 1).
4. Rows are normalized:
   - Statewide rows are matched to a position through `officeMapping` in `useCandidates.js`. **Only 4 offices are mapped**: Governor, Lt. Governor, AG, and U.S. Senator.
   - County-level rows are grouped dynamically into `dynamicCountyPositions[countyName]`.
   - `year` and `type` (Primary / General / Runoff) are parsed from `txElectionName`.
5. Incumbents ("Current Holder") are **hardcoded** in `useCandidates.js`.

### External data sources

| Data | Source |
|---|---|
| US state shapes | `PublicaMundi/MappingAPI` us-states.json (raw GitHub) |
| TX county shapes | `Cincome/tx.geojson` tx_counties.geojson (raw GitHub) |
| Candidates (legacy, still used by the UI) | `EMFCOLLEGE/Texas-Election-API` (raw GitHub), a Feb 2026 snapshot of TX primary filings |
| Candidates (TX, new) | Texas SOS candidate API at `goelect.txelections.civixapps.com/api-ivis-cbp/api/cbp` (`getElectionsByYear/<year>`, `POST findQualifiedCandidates`), pulled by `npm run data:tx` |
| County population | `public/2024_txpopest_county.csv` |
| Candidate photos | Mostly `ui-avatars.com` placeholders; one Wikimedia image |

## Election data pipeline

- Run `npm run data:<state>` (e.g. `npm run data:tx`) to regenerate `public/data/<state>.json`, then commit the script change and the data change as **separate commits**.
- Data is curated to **federal, statewide, and state legislative races** in every target state. Texas also includes county and judicial races because the SOS feed has them for free.
- Only accepted filings are included. Candidates are ordered by the state's ballot party order, never by anything else.
- Incumbency comes from the source (`incumbent: true`). A race with no incumbent is an open seat. **Don't hardcode officeholders.**
- Address lookup (Phase 2) will use the **Census Geocoder** (free, no key) to turn an address into congressional and state legislative districts, which match on `category` + `district`. It will also use **Google Civic `voterInfoQuery`** (free, key stored as a Vercel env var and called only from `api/`) for full local ballots and polling places.

## Conventions and gotchas

- County names are normalized to Title Case with " County" removed. That string is the join key between GeoJSON, CSV, and candidate data, so keep the normalization consistent everywhere.
- Party is stored as `'Rep' | 'Dem' | 'Other'`. Party colors are `#bf0a30` (Rep), `#002868` (Dem), and `#888` (other).
- Styling is a mix of `App.css` classes and inline `style={{}}` objects. Prefer CSS classes for new work.
- The file is `src/sidebar.jsx` (lowercase) and is imported as `./sidebar`. Vercel builds on a case-sensitive filesystem, so file names and imports must match exactly.
- There is no test suite and no ESLint config yet (`npm run lint` is defined but won't work).
- Be politically neutral. Present every candidate with equal visual weight, sort alphabetically or by ballot order, and keep summaries free of editorializing.

## Known issues (as of Oct 16, 2026)

- **3D heatmap is broken in production.** The CSV sits at the repo root, and Vite only ships files from `public/`. `https://votermap.vercel.app/2024_txpopest_county.csv` returns 404, so every county falls back to a 50,000 placeholder.
- **Primary data only.** The candidate feed contains only `2026 DEMOCRATIC/REPUBLICAN PRIMARY ELECTION` rows. The sidebar defaults to the `Primary` filter, so voters see primary fields, not general election nominees.
- **About 1,350 candidates are silently dropped.** Statewide and district races that aren't in `officeMapping` never render. That includes U.S. House, state Senate and House, Comptroller, Land Commissioner, Ag Commissioner, Railroad Commissioner, Supreme Court, Court of Criminal Appeals, courts of appeals, SBOE, and district judges.
- **Federal view shows only "President"**, which isn't on the 2026 ballot.
- **Hardcoded incumbents** need checking for accuracy.
- The "Website" link is actually a `mailto:` from the filing email.
- `puppeteer` is listed as a runtime dependency but isn't used. It slows installs and Vercel builds.
- Alaska and Hawaii buttons are clipped by the map's `maxBounds`, and non-Texas states only show `alert()`.
- `.gitignore` covers only `node_modules/`. `dist/` and `.env*` should be added.
- `index.html` references a missing `/vite.svg` favicon, and the page title is the generic "Voting Map".
- The fetches have no error UI. If GitHub raw is slow or down, the sidebar either skeleton-loads forever or shows an empty state.

---

## Roadmap

Ordered by what matters most before **Nov 3, 2026**. Phase 0–1 items are launch blockers. Phase 4 is post-election.

### Phase 0: Production health (do first, small)
- [ ] Move `2024_txpopest_county.csv` into `public/` so the 3D heatmap works on Vercel
- [ ] Remove `puppeteer` from `dependencies` (or move it to devDependencies if a scraper needs it)
- [ ] Add `dist/`, `.env*`, and `.vercel` to `.gitignore`
- [ ] Add a favicon, a real `<title>`, a meta description, and Open Graph tags for link sharing
- [ ] Add a minimal ESLint config so `npm run lint` works
- [ ] Sort out Vercel: decide which project owns `votermap.vercel.app`, connect it to this GitHub repo for auto-deploys from `main` and preview deploys on PRs, and redeploy (the live site is from Feb 2026 and predates the landing page)

### Phase 1: Own the data and support multiple states (launch blocker)
- [x] Define a **normalized, state-agnostic data schema** (`docs/data-schema.md`) stored under `public/data/<state>.json`
- [x] Build a small script (`scripts/`) per source that writes the normalized JSON, so data is reproducible and reviewable in PRs
- [x] Texas general election data from the official SOS API (`npm run data:tx`): 3,179 races and 3,922 candidates, including the two Nov 3 special elections
- [ ] Sources for the other states' Nov 3 ballots: each state's Secretary of State certified candidate list (federal, statewide, legislative), with the FEC API as a cross-check for U.S. Senate and House
- [ ] Switch the UI from `Texas-Election-API` to `public/data/tx.json`, and remove `useCandidates.js`'s hardcoded incumbents and office mapping
- [ ] Make the map, sidebar, and CSV joins state-generic: no `'TX'` or `'Texas'` hardcoding, and per-state county GeoJSON and bounds
- [ ] Add states in priority order: **GA → MI → NC → AZ → WI → PA → NV → ME → NH → OH**
- [ ] Highlight supported states on the national map and show an inline "Coming soon" for the rest
- [ ] Default the sidebar filter to `General` / `2026` and drop or hide the primary-only view
- [ ] Map **all** statewide offices, not just 4: Comptroller, Land Commissioner, Ag Commissioner, Railroad Commissioner, Supreme Court, Court of Criminal Appeals
- [ ] Replace the President-only federal list with what's actually on the ballot: U.S. Senate and U.S. House
- [ ] Verify the hardcoded incumbents and move them into the data repo instead of code
- [ ] Include third-party, independent, and write-in candidates (Libertarian, Green, and so on), not just D/R
- [ ] Add a "Data last updated" timestamp and a source citation in the UI

### Phase 2: "What's on *my* ballot" (core value)
- [ ] **District overlays:** U.S. House (38), state Senate (31), state House (150), and SBOE (15) GeoJSON layers, plus a district picker
- [ ] **Address or ZIP lookup (in scope for Nov 3).** This is the main way real users will find their races: use the Census geocoder for lat/lng, then point-in-polygon against district layers, and/or Google Civic `voterInfoQuery` through an `api/` serverless proxy
- [ ] County view lists every race a county's voters see: federal, statewide, district, and county
- [ ] **Printable ballot cheat sheet** (from the README wishlist): pick candidates, then print or save as PDF
- [ ] Voting logistics links: registration check, early voting dates, polling place lookup (VoteTexas.gov), and required ID

### Phase 3: Polish, trust, accessibility
- [ ] Mobile-responsive layout. The sidebar is fixed at 400px, so it needs a bottom sheet or drawer on phones
- [ ] Accessibility: keyboard navigation for map and cards, ARIA labels, color contrast, and a non-map list fallback
- [ ] Candidate details: real photos where licensing allows, occupation (already in the feed as `txOccupation`), and real campaign website instead of mailto
- [ ] Better OpenSecrets/FEC links (FEC candidate IDs for federal races, TEC filings for state races)
- [ ] Error and empty states for failed fetches. Self-host GeoJSON in `public/` instead of relying on third-party raw GitHub URLs
- [ ] Replace `alert()` for non-Texas states with an inline "Coming soon" message, and fix the AK/HI insets
- [ ] Vercel Web Analytics (privacy-friendly) to see usage
- [ ] Neutrality and accuracy review pass before promoting the site

### Phase 4: Post-election and expansion
- [ ] Election results overlay (county-level results after Nov 3)
- [ ] Historical results and voting trends by election
- [ ] Expand to all 50 states
- [ ] Candidate bios and issue positions (sourced, neutral)
- [ ] Automated data refresh (GitHub Action that re-pulls TX SOS data on a schedule)
- [ ] Tests for data normalization (`useCandidates`) and county-name joins
