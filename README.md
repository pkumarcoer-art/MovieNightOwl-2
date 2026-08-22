# Handoff: NightOwl — Gamified Movie Watchlist

## Live on this deployment: Supabase auth + persistence
This repo's `NightOwl.dc.html` has been wired to a real Supabase backend
(auth, watchlists, and ratings), on top of the design/support-file pair
described below. Browsing, search, and the quiz all still work with no
account — a login/signup modal only appears the moment someone tries to
**save** something (add a movie to a list, or rate one). See
[`supabase/schema.sql`](supabase/schema.sql) for the tables (`dc_lists`,
`dc_list_items`, `dc_ratings`) and Row Level Security policies, and
[`config.js`](config.js) for the project URL/anon key. `webapp/` is a
separate, simpler standalone app kept from an earlier iteration; it isn't
the primary deployment.

## Overview
NightOwl is a movie watchlist app built around one core loop: **search a movie, save it to a personal list, rate it after watching.** A light gamification layer (XP, streaks, badges, an "owl type" persona) sits on top to encourage returning. The prototype covers the full experience: marketing landing page, onboarding quiz, discover/search, list management, a watched log with a 0–5 half-star rating system, social/stat screens, and CSV import of viewing history.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes that demonstrate the intended look, layout, and behavior. They are not production code to lift directly.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, React Native, SwiftUI, native — whatever the project uses), following its established component library, styling approach, routing, and data layer. If no codebase exists yet, choose the framework most appropriate for the product (a React + TypeScript SPA is a natural fit for this design) and implement there.

Two specific notes:
- The prototype is a single self-contained component with all screens in one file and all state in one class. Production should split this into routed screens/pages with a proper state layer.
- The prototype calls the TMDB API directly from the client with a hardcoded key. **Do not ship that.** Proxy TMDB through your own backend and keep the key server-side.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, animation timings, and copy are final and intended to be matched closely. All values are documented below and are readable inline in the HTML. Recreate the UI faithfully using the codebase's existing primitives; the design tokens section is the source of truth for values.

## Screens / Views

The app has three top-level phases — `landing`, `quiz`, `app` — plus a movie detail drawer that can open over any app screen. Within `app`, one of eleven screens renders at a time, selected by a `screen` key. Every screen root carries a `data-screen-label` attribute naming it in the source.

### 1. Landing (`phase: 'landing'`)
- **Purpose:** Marketing entry. Explain the product, start onboarding.
- **Layout:** Full-viewport dark hero. Content column max-width 620px, left-aligned, vertically centered, generous padding (56px block / 24–44px inline). Logo + wordmark row at top left. Below it: headline, tagline, body paragraph, two buttons in a flex row with gap, then a monospace footer strip of three short claims separated by dividers. An owl illustration card sits at the right on wide viewports and is dropped on phones.
- **Headline:** "Every Movie Deserves / Your *Opinion*..." — Space Grotesk 700, 90px desktop / 68px tablet / 48px phone (currently 72/56/40 after a size reduction), line-height .92–.94, letter-spacing -.045em. The word "Opinion" is set in Instrument Serif italic 400 in amber `#FFC862`, with a 28px amber glow (`text-shadow: 0 0 28px rgba(240,180,75,.45)`) and an inset amber underline (`box-shadow: inset 0 -.09em 0 rgba(240,180,75,.35)`).
- **Tagline under headline:** "So search, save and seal the deal" — JetBrains Mono, 16px, uppercase, letter-spacing .14em, color `#ADB2C8`.
- **Buttons:** primary amber CTA starting the quiz; secondary ghost button ("Look around first") skipping straight into the app.
- **Animated background** (all behind content, `pointer-events: none`, absolutely positioned within the hero):
  - **Star field:** 34 dots, 1.4–3.6px, deterministic pseudo-random positions (seeded LCG, seed 7). Every 4th star amber `#F0B44B` with an 8px amber glow; the rest `#EDEAF4` with a 6px glow. Each twinkles via `owlTwinkle` (opacity .18→1, scale .85→1.25) over 2.6–7.6s with a random delay. The whole field drifts via `owlDrift` (translate 28px/-22px) over 42s.
  - **Aurora glows:** three blurred radial ellipses — indigo `rgba(52,74,168,.5)` 620×460 top-left; amber `rgba(240,180,75,.16)` 480×380 mid-right; violet `rgba(96,60,150,.28)` 520×420 lower-left. Each animates `owlAurora` (opacity .25→.6, scale 1→1.14, slight translate) over 26–34s. `filter: blur(14px)`.
  - **Shooting stars:** two 130×1.4px gradient streaks (transparent → white → amber → transparent) rotated 22°, animating `owlShoot` (300px/140px travel, visible for ~20% of the cycle) over 13s and 17s with 4s/10s delays. Clipped to a container covering the right half only, so they never cross the copy.
  - **Projector cone:** a conic-gradient wedge from the top center (168°, amber and white at very low alpha), `filter: blur(18px)`, flickering via `owlFlicker` (opacity .55→.95→.7) over 7s.
  - **Photo layer:** `assets/movie-bg.jpg` (film reels, clapperboard, lens on black) in the **right 38%** only, `background-size: 560% auto`, `background-position: 26% 52%` — deliberately cropped tight onto the metal reel cluster so none of the source image's placeholder template text is in frame. Opacity .5, drifting via `owlKen` (scale 1.04→1.12) over 52s, with a left-edge mask fade (`linear-gradient(90deg, transparent 0%, #000 26%)`) so it never reaches the text column, plus a top scrim. Two full-hero scrims sit above it: horizontal `rgba(8,11,20,.9)→.38` left-to-right, and vertical `.55 → transparent → .7`.
  - **Implementation note:** these layers are built in JS with `React.createElement` and memoized on first build so animation state survives re-renders. Rotation and the drift animation are on separate nested elements — putting a static `transform` and a transform-animating `animation` on the same node makes the keyframes win and silently discard the static transform.

### 2. Onboarding / Mood Quiz (`phase: 'quiz'`)
- **Purpose:** Three-question taste quiz that assigns an "owl type" persona and seeds recommendations.
- **Layout:** Centered single column, max-width 720px, radial gradient background. Logo row at top, progress indicator, question, and a grid of selectable option cards. Advances a `quizStep`; picks accumulate in `picks[]`. Result assigns `owl` (e.g. `arthouse`).

### 3. Home / Discover (`screen: 'home'`)
- **Purpose:** Default landed screen. Trending movies plus personalized nudges.
- **Layout:** Optional late-night banner (amber-tinted, 1px `#3A2E12` border, 16px radius) when the late-night condition is met; an "Owl Sense" recommendation block with a CTA; a streak module; then a responsive poster grid of trending titles with a load-more. Skeleton placeholders (12) render while loading.

### 4. Search Results (`searching === true`, overrides the current screen)
- **Purpose:** Find a movie to add. The core entry to the main loop.
- **Layout:** Bodoni Moda 34px heading with result count, then the poster grid. Debounced query against TMDB; `sState` tracks idle/loading/empty/error. Clearing the query returns to the underlying screen.

### 5. Lists (`screen: 'lists'`)
- **Purpose:** Manage saved watchlists.
- **Layout:** Heading row, horizontally scrolling list-tab chips (name + item count, active chip highlighted), filter chips (watch status, rating) and a sort control, then the poster grid for the open list. Includes create-new-list flow via a modal (`pickFor: 'new'`). Seed lists ship with the prototype; default open list is `nest`.

### 6. Watched (`screen: 'watched'`)
- **Purpose:** The rating log — everything seen, with its half-star score.
- **Layout:** Heading row with count, then cards/grid of watched entries showing poster, title, rating stars, optional note, and date. Entries carry `{ id, rating, note, date, src }`.

### 7. Watch-Together Match (`screen: 'match'`)
- **Purpose:** Pick something to watch with someone else.
- **Layout:** Centered column, max-width 900px, centered intro block, then the match interface.

### 8. The Roost (`screen: 'roost'`)
- **Purpose:** Group/social space.
- **Layout:** Header row with title block left and actions right (flex, `align-items: flex-end`, wrapping, 30px bottom margin), then content.

### 9. Nightwatch (`screen: 'feed'`)
- **Purpose:** Activity feed of what other users rated and watched.
- **Layout:** Bodoni Moda 34px heading, subhead "What the others were up to after dark." in `#8A90AC` 14px, then a feed list.

### 10. Perch (`screen: 'perch'`)
- **Purpose:** Profile — owl type, XP, badges.
- **Layout:** Avatar block (92×92, `border-radius: 50% 50% 42% 42%` giving an egg/owl silhouette, gradient `#242E5C → #131832`, 1px `#3A4576` border) beside identity text in a wrapping flex row with 26px gap; then XP progress and an earned-badge collection. Badge ids in the seed state: `first, ten, genre5, dec4, nest, sixnights, roost1`. Seed XP 640.

### 11. Sky (`screen: 'sky'`)
- **Purpose:** Stats / visualization of viewing history.
- **Layout:** Header row with title block and controls, 22px bottom margin, then the chart area.

### 12. Monthly Hoot Recap (`screen: 'recap'`)
- **Purpose:** Periodic wrap-up of the month's watching.
- **Layout:** Header row with title block left, meta right, 26px bottom margin, then recap content.

### 13. Import from CSV (`screen: 'import'`)
- **Purpose:** Bring viewing history in from another service (Letterboxd-style export).
- **Layout:** Single column, max-width 860px. Heading "Bring your history in" (Bodoni Moda 34px). Three stages tracked by `importStage`:
  - `upload` — file drop / picker, plus a "load sample" affordance.
  - `preview` — parsed rows table. Each row `{ key, title, year, rating, date, status, tmdbId, matched }` with status `matching → matched | manual`. Unmatched rows offer a "fix" action that jumps to Search prefilled with the row title.
  - `done` — confirmation. Confirming appends matched rows to `watched` (deduped by TMDB id, sorted by date descending) and awards **5 XP per imported row**.
- **CSV parsing:** header row sniffed for columns containing "title", "year", "rating", "date". Ratings above 5 are treated as a 10-point scale and halved, then rounded to the nearest 0.5 and clamped to 0–5.

### 14. Movie Detail (drawer, `detailOpen`)
- **Purpose:** Full record for one movie — add to list, mark watched, rate.
- **Layout:** Fixed overlay `rgba(4,6,12,.72)` with `backdrop-filter: blur(3px)`, fading in over .2s; a side drawer (`<aside>`) above it at `z-index: 60`. Backdrop image header with a 44×44 circular close button at top right (`rgba(8,11,20,.7)` fill, 1px `#2C3459` border) — note this meets the 44px minimum hit target. Clicking the scrim closes.
- **Required attribution inside the drawer** (10px JetBrains Mono, `#4E5471`): "This product uses the TMDB API but is not endorsed or certified by TMDB." This is a TMDB terms requirement — keep it.

### Navigation chrome
- **Phone:** bottom tab bar. Five tabs: Discover, Lists, Watched, Nightwatch, Perch. Each tab is `flex: 1`, `min-height: 56px`, column layout, centered, 6px gap, with a 6px dot indicator — amber `#F0B44B` when active, `#2E3760` when not.
- **Desktop/tablet:** left sidebar. Same five destinations as full-width rows: flex, 11px gap, 13px/11px padding, 10px radius, 14px text. Active row background `#141B33` with `#EDEAF4` text; inactive transparent with `#8A90AC` text; 5px dot indicator, same colors. Transition `background .16s ease, color .16s ease`.
- Secondary destinations (Roost, Match, Sky, Recap, Import) are reached from in-screen entry points rather than the tab set.

## Interactions & Behavior
- **Search:** typing debounces (timer cleared on each keystroke) then hits TMDB `search/movie`. `sState` drives idle / loading / empty / error UI. Clearing resets query, results, and state.
- **Navigation:** `go(screen)` sets the screen and clears any active query, so navigating away always exits search.
- **Rating:** half-star control, 0–5 in 0.5 increments. `rateFor` holds the movie being rated, `rateVal` the committed value, `rateHover` the hover preview, `rateNote` an optional text note.
- **List add:** `pickFor` opens a list picker; `pickFor: 'new'` switches it to create-a-list with `newListName`.
- **Card flip / removal:** `flipped{}` tracks per-card flip state; `leaving{}` marks cards mid-removal so they can animate out before being dropped from state.
- **Toasts:** `toast(tone, title, body)` for transient feedback, including "not built yet" messages on stub actions.
- **Gamification:** XP accrues on actions (import awards 5/row). Streak copy branches at 3+ days: at 3 or more, "Two freezes in your pocket. Miss a night and nothing burns down."; below that, "Watch tonight and it starts counting."
- **Responsive:** viewport width is tracked in state (`vw`) and mapped to a `phone | tablet | desktop` breakpoint that switches nav pattern, type scale, and grid density.
- **Animation timings:** detail fade .2s; nav transitions .16s ease; ambient background loops 7s–52s (see Landing above).
- **Reduced motion:** the prototype does not implement `prefers-reduced-motion`. Production should gate the ambient background animations behind it.

## State Management
Prototype state (single class, one object) — map these onto your state layer:
- **Phase/route:** `phase` ('landing' | 'quiz' | 'app'), `screen` (home | lists | watched | feed | perch | roost | match | sky | recap | import | search)
- **Onboarding:** `quizStep`, `picks[]`, `owl`, `email`
- **Data cache:** `cache{}` (normalized movies by id), `genreNames{}`
- **Discover:** `trending[]`, `trendLoading`, `trendErr`, `shortOnly`
- **Search:** `query`, `results[]`, `sState`
- **Detail:** `detailId`, `detail`, `dLoading`
- **Lists:** `lists[]` (each `{ id, name, items: [{ id, added }] }`), `openList`, `fWatch`, `fRate`, `sort`
- **Watched:** `watched[]` (`{ id, rating, note, date, src }`), `flipped{}`, `leaving{}`
- **Rating flow:** `rateFor`, `rateVal`, `rateNote`, `rateHover`
- **List picker:** `pickFor`, `newListName`
- **Gamification:** `xp`, `earned[]`
- **Import:** `importStage`, `importRows[]`
- **Viewport:** `vw`

**Data fetching:** TMDB v3 REST. Endpoints used include `search/movie`, trending, movie detail, and genre list. Images come from `https://image.tmdb.org/t/p/<size><path>`; a gradient placeholder `linear-gradient(150deg, #151B33, #0E1324)` stands in when a poster path is missing. Responses are normalized (`norm()`) and written into `cache`.

**Production requirements:**
1. Move the TMDB key server-side; proxy all calls. The prototype's inline key must not ship.
2. Persist `lists`, `watched`, `xp`, `earned`, and `owl` to a real backend per user account — the prototype holds everything in memory and loses it on reload.
3. Keep the TMDB attribution string in the movie detail view.

## Design Tokens

### Colors
| Token | Hex | Use |
| --- | --- | --- |
| Background | `#080B14` | Page background |
| Surface | `#0E1324` | Card base / placeholder gradient end |
| Surface raised | `#141B33` | Active nav row, elevated cards |
| Surface alt | `#151B33` | Placeholder gradient start |
| Scrim | `rgba(4,6,12,.72)` | Modal overlay |
| Primary text | `#EDEAF4` | Body and headings |
| Secondary text | `#8A90AC` | Subheads, inactive nav |
| Tertiary text | `#ADB2C8` | Landing tagline |
| Muted text | `#6E7495` | Meta labels |
| Faint text | `#4E5471` | Legal / attribution |
| Amber (accent) | `#F0B44B` | Primary CTA, active indicators, stars |
| Amber bright | `#FFC862` | Highlighted headline word |
| Amber dark border | `#3A2E12` | Late-night banner border |
| Border | `#2C3459` | Buttons, cards |
| Border light | `#3A4576` | Avatar outline |
| Dot inactive | `#2E3760` | Nav indicator, off state |
| Indigo glow | `rgba(52,74,168,.5)` | Aurora |
| Violet glow | `rgba(96,60,150,.28)` | Aurora |

### Typography
- **Display / headings:** Bodoni Moda, weight 500 — screen titles at 34px.
- **Landing headline:** Space Grotesk, weight 700 — 72px desktop / 56px tablet / 40px phone, line-height .94, letter-spacing -.045em.
- **Accent italic:** Instrument Serif, italic 400 — the highlighted headline word.
- **Body / UI:** DM Sans — 14px body, 16px controls.
- **Mono / labels:** JetBrains Mono — 16px landing tagline, 11px meta, 10px legal; uppercase with .14em–.5em letter-spacing.

All four families load from Google Fonts in the document head.

### Spacing
6, 10, 11, 14, 18, 22, 24, 26, 30, 36, 40, 44, 56 px — used for gaps, padding, and section margins. Content columns: 620px (landing copy), 720px (quiz), 860px (import), 900px (match).

### Radii
- 10px — nav rows, small cards
- 16px — banners, panels
- 50% — dots, circular buttons, avatar (with `50% 50% 42% 42%` for the owl silhouette)

### Shadows & effects
- Amber glow: `0 0 28px rgba(240,180,75,.45)` (headline), `0 0 8px rgba(240,180,75,.85)` (amber stars)
- White glow: `0 0 6px rgba(237,234,244,.6)` (stars)
- Inset hairline: `inset 0 0 0 1px rgba(237,234,244,.09–.16)`
- Inset underline: `inset 0 -.09em 0 rgba(240,180,75,.35)`
- Backdrop blur: `blur(3px)` on the detail scrim
- Ambient blurs: `blur(14px)` aurora, `blur(18px)` projector cone

### Keyframes
`owlTwinkle`, `owlDrift`, `owlAurora`, `owlShoot`, `owlFlicker`, `owlKen`, `owlFloat`, `owlPulse`, `noFade` — all defined in the document head style block.

## Assets
- **`assets/movie-bg.jpg`** — user-supplied stock photograph (film reels, clapperboard, camera lens on black). **Important:** this is a Canva-style template image whose right-hand side contains placeholder branding — a large "MOVIE" wordmark, the string "WWW.REALLYGREATSITE.COM", a placeholder tagline, and avatar circles. The design crops tightly (560% zoom at `26% 52%`) onto the reel cluster specifically to exclude all of it. If you re-crop, re-frame, or swap this image, verify no lettering from the source is visible. Ideally replace it with a licensed photograph that has no baked-in text.
- **Movie posters and backdrops** — fetched at runtime from TMDB (`image.tmdb.org`). Missing posters fall back to a gradient placeholder.
- **Icons and the owl mark** — drawn inline as CSS shapes and gradients in the prototype; no icon library or image files. Substitute your codebase's icon set.
- **Fonts** — Bodoni Moda, Space Grotesk, Instrument Serif, DM Sans, JetBrains Mono, all from Google Fonts.

## Files
| File | What it is |
| --- | --- |
| `NightOwl.dc.html` | The complete prototype — all screens, all logic, all styling. Open it directly in a browser. |
| `support.js` | Runtime that the prototype needs in order to render. Not part of the design; do not port it. |
| `assets/movie-bg.jpg` | Landing background photograph (see Assets note above). |
| `webapp/` | A separate, real, working app (auth + watchlist + ratings, Supabase-backed). See [`webapp/README.md`](webapp/README.md). |
| `supabase/schema.sql` | Database schema + Row Level Security policies for `webapp/`. |

Screen-by-screen markup is easiest to find by searching `NightOwl.dc.html` for `data-screen-label` — every screen root is tagged with its name.

## Supabase-backed webapp

`webapp/` is a small standalone app (no build step, plain HTML/CSS/JS +
the Supabase JS client) that actually runs, unlike the `.dc.html` design
file above. It implements the three things asked for in a follow-up to this
handoff — **auth, watchlist, and ratings** — persisted per-user in Supabase
with Row Level Security. It intentionally does not attempt to port the rest
of the NightOwl prototype (gamification, quiz, TMDB search, etc.); see
[`webapp/README.md`](webapp/README.md) for setup and scope.
