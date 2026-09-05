# personal-site

React resume site for austinzurbuchen.com. Public, read-only for visitors; the
resume content lives in MongoDB Atlas and is served by the `personal-site-py`
Flask API (separate repo, `../personal-site-py`).

## Stack

CRA 5 (`react-scripts`) · React 17 · Redux Toolkit · react-router-dom 6 ·
axios · Sass. **No component library** — MUI and Emotion were removed once the
login page was deleted, taking the bundle from 375KB to 219KB. Do not add one
back; the design system is hand-rolled SCSS and a library's defaults fight it. Deployed as a Docker image (node:20-alpine
build → nginx:1.27-alpine serve) on an Unraid NAS behind Nginx Proxy Manager
(openresty), DNS via Namecheap.

**Deploys are registry-based, not build-on-host.** The container is managed by
Unraid's Docker Manager (label `net.unraid.docker.managed: dockerman`), which
pulls a published image rather than building from source — there is no repo
checkout or compose project on the NAS. `.github/workflows/publish.yml` builds
`linux/amd64` on push to `dev` and pushes to GHCR; the NAS then pulls.
`docker-compose.yml` documents the intended topology and is useful locally,
but it is **not** what runs in production.

**Production runs the `dev` branch, not `master`.** `master` lags and does not
contain the deploy machinery. Always confirm `git log origin/dev` before
assuming what is live.

## Component convention

Every component is a directory under `src/components/`:

```
src/components/<name>/
  index.js      # default export, function component
  index.scss    # imported as `import "./index.scss";`
```

Follow the existing shape exactly:

```jsx
import React from "react";
import "./index.scss";

const Thing = ({ title, body }) => {
  return (
    <div className="thing">
      <div className="title">{title}</div>
      <div className="body">{body}</div>
    </div>
  );
};
export default Thing;
```

Section components (`profile`, `experiences`, `abilities`, `footer`) pull from
Redux directly. Leaf components (`titles`, `itemslist`, `abilityitem`,
`experienceitem`, `aboutme`, `details`, `photo`) are presentational and take
props only. Keep that split.

List rendering lives in `src/utils/` (`abilities.js`, `experiences.js`) as
functions returning arrays of JSX with `key={i.toString()}`.

## Data flow

`App.js` fetches `${serverUrl}/getResume` once on mount and dispatches
`update(...)`. Everything else reads `useSelector((state) => state.resume.value)`.

`src/reducers/resume.js` merges the API payload over an `emptyResume` skeleton,
so `resume.profile`, `resume.abilities.languages`, `resume.quotes[2]` etc. are
always defined. Do not reintroduce optional chaining guards that assume they
may be missing.

The merge spreads the payload, so **unknown fields DO pass through** —
`profile.age` and `profile.location` are rendered by `details/index.js` and
appear nowhere in `emptyResume`. Adding a field to `emptyResume` is only
required when a component will dereference it **unguarded** before the fetch
resolves; otherwise it is optional. (An earlier version of this file claimed
unknown fields were dropped. They are not — `src/reducers/resume.test.js` pins
the actual behaviour.)

`quotes` is the exception and is backfilled to three slots, because
`experiences`, `abilities` and `footer` each read a fixed index
(`quotes[0]`/`[1]`/`[2]`) with no guard. A shorter array from the database used
to take the whole page down.

`App.js` tracks an explicit `status` of `loading` / `ready` / `error` rather
than inspecting the store. Do not reintroduce a gate like `resume?.profile` —
`emptyResume.profile` is an object, so it is truthy on the first render and
such a gate opens before any response arrives, painting the blank skeleton. On
a failed fetch the `loaderror` band renders instead of the hollow resume.

`editMode` drives in-place editing on the admin vhost: `signedIn`, which
section is `openSection`, the `drafts` the user has actually touched (keyed by
the API's own dotted ALLOWLIST path), and the outcome of the last PUT. The
token is deliberately NOT here -- it lives in sessionStorage, owned by
`src/utils/adminSession.js`, so a DevTools state snapshot never contains a
write credential.

Four sections are editable and between them cover every path the server
allows: `profile` (subtitle, About Me, name, age, location), `experiences` and
`abilities` (each a quote plus two whole lists of rows), and `contact` (a quote
plus the three links). All four go through
`src/utils/useSectionEditor.js`, which owns the drafts, the dirty derivation
and the PUT; `src/utils/useQuoteEditor.js` wraps it for the three that own a
`quotes.N.quote` / `quotes.N.by` pair, and `src/components/editbar/` is the
control row. Adding a field means adding its allowlist path to a section's
FIELDS, not writing a second mechanism.

`openSection` is a single string, so opening a second editor closes the first.
That is why `openEditor` asks before opening over another section's unsaved
work -- `sectionOpened` empties the drafts, and without the prompt a second
click discards typing with no undo.

## API URL resolution

Three-layer fallback in `App.js`:

1. `window.__ENV__.REACT_APP_SERVER_URL` — injected at container start by
   `docker-entrypoint.d/40-env-config.sh`, which overwrites
   `public/env-config.js`. This is what production uses (value: `"api"`).
2. `process.env.REACT_APP_SERVER_URL` — dev only.
3. `""` — same-origin.

The var is `REACT_APP_SERVER_URL`. Note `.env.local` currently defines
`REACT_APP_API_URL`, which is the **old** name and is ignored — local dev
against a remote API will not work until that key is renamed.

nginx proxies `/api/` → `http://personal-site-py:5000/`, so the frontend and
backend are same-origin in production and CORS is not exercised.

`location /api/` wraps that proxy in `limit_except GET HEAD { deny all; }`, so
**the public API is read-only by proof rather than by convention** — no non-GET
method reaches Flask from the internet regardless of any application bug. The
admin vhost is a separate `server` block on port 8081, bound to `10.0.0.24` and
never published through Nginx Proxy Manager, and does not carry that
restriction. Do not relax this block to make writes work.

**Editing is LAN-only on purpose, and that is a settled decision.** A VPN
(Unraid's built-in WireGuard, or Tailscale) was considered and declined in Sep
2026: the resume is edited from home, so remote access buys nothing, and an
unpublished port cannot be attacked from the internet regardless of any bug in
Flask or in this app — a guarantee no amount of application security matches.
Do not propose reopening this without a reason to edit away from home.

The practical cost is worth knowing: anyone (or anything) not on the LAN cannot
verify the admin UI at all. Public-surface checks — bundle hashes, the read-only
API, `GET /api/version` — still work from anywhere, so lean on those and ask
someone on the LAN to confirm the rest.

That hostname resolves because both containers share the `zurbnet` Docker
network, declared `external: true` in both repos' `docker-compose.yml` and
created outside compose (`docker network create zurbnet`). Removing that
declaration puts the container on a private default network where
`personal-site-py` does not resolve, and `/api/` returns 502.

## Design system

There is no theme file; these values are duplicated across component SCSS.
Match them exactly rather than inventing new ones.

**Color**

| Role | Value |
|---|---|
| Heading teal | `#1f9693` |
| Filled star | `#46a4a0` |
| Empty star | `#dfe0e0` |
| Subtitles, 1px rules, footer links | `#727878` |
| Body text | `#434242` |
| Footer background | `#444242` |
| Profile band | `#fff6db` |
| Experiences band | `#f3efe0` |
| Abilities band | `#ffffff` |
| Hero wash over CatWallpaper | `rgba(31, 150, 147, 0.62)` |

**Type** — `"Courier New", Courier, monospace` for every heading and display
string; the system sans stack in `index.scss` for body copy. Sizes in use:
50px section title · 48px name · 30px `.smalltitle` · 28px sub-heading ·
26px hero subtext · 20px `.biggertext` · 18px subtitle.

**Layout** — the page is a stack of full-bleed bands. Each band is
`min-height: 100vh`, flex column, centered, with its own background color, and
contains a `.container` (`max-width: 810px`, `padding: 40px 180px`). Sections
are separated by a `1px solid #727878` top border, not by margin.

**Global helpers** in `src/index.scss`: `.row` `.column` `.bold` `.biggertext`
`.smalltitle` `.collapsedtext` `.spreadtext` `.hidden` `.visually-hidden`.
Prefer these over redeclaring flex direction or font weight in a component.
`.hidden` is `display:none` (gone from the accessibility tree too);
`.visually-hidden` is for text that should reach a screen reader but not be
painted. They are not interchangeable.

**Breakpoints** — exactly two, both in `src/index.scss` and the component files:
`max-width: 1024px` (gutter drops 180px -> 24px, restoring the approved 810px
content box that was silently squeezing below 1170px) and `max-width: 768px`
(multi-column rows stack, type scale steps down). The 768px scale is sized to
hold down to 320px, so do not add a third breakpoint without a reason.

## Contrast — why these two values are what they are

Both were measured against the real assets, not estimated. Neither is arbitrary
and neither should be nudged for aesthetic reasons without re-measuring.

- **Heading teal `#1f9693`.** The shallowest teal along the original hue that
  clears the 3:1 large-text bar on every band: **3.33:1** on `#fff6db`,
  **3.12:1** on `#f3efe0`, **3.59:1** on white. The previous `#22a39f` was
  2.86 / 2.68 / 3.08 — failing on both cream bands. Lightening it back toward
  `#22a39f` reintroduces that failure; there is no headroom in this direction.
- **Hero wash `rgba(31, 150, 147, 0.62)`.** White text over the wash on
  `CatWallpaper` measures a **0.6%** failing area against the 3:1 large-text
  bar, down from **19%** under the old `rgba(0,255,255,0.5)`. The wash's alpha
  and darkness are doing that work: any wash sets a luminance floor under the
  composite, and the old 50% aqua capped white text at 4.80:1 no matter what
  was behind it. Lightening the wash or lowering the alpha undoes this.

Still not strictly AA: 0.6% of the hero text area remains below 3:1, where the
text crosses the brightest part of the nebula. A fully passing wash
(`rgba(20,95,93,0.62)`, 0% failing) was measured and rejected as too dark for
the photograph — an accepted, deliberate residue rather than an oversight.

`og-image.png` and the icons still use `#22a39f`. Left deliberately: the
difference is imperceptible at those sizes, and social platforms cache card
images by URL, so changing one means a new filename and a cache flush across
LinkedIn, Slack and X for no visible gain.

Everything else measured clears AA: footer text and links are `#dfe0e0` on
`#444242` (7.55:1), `.subtitle` is `#434242` on the light bands (8.70–10.02:1),
and the focus ring is `#434242` (`#dfe0e0` inside the footer).

## Known constraints

- **SCSS is globally scoped.** No CSS modules. `.container` is defined
  identically in three files; `.info`, `.body`, `.title`, `.hidden` also
  collide. A new top-level class name can silently restyle another section —
  check with `grep -rn '^\.classname' src/` before adding one.
- **Zero media queries app-wide.** `padding: 40px 180px` and `width: 33%`
  columns mean the site does not work on mobile.
- `DISABLE_ESLINT_PLUGIN=true` in the build script, so lint errors will not
  fail a build.
- CRA 5 / React 17 are both unmaintained.
- CRA boilerplate is replaced: `manifest.json`, the `<meta
  name="description">` and `App.test.js` were all rewritten. (An earlier
  version of this file listed them as outstanding.)

## Tests

`npm test` runs 152 cases across 6 suites. They cover the two places this app
can regress silently: the `resume` reducer's merge, and the accessibility
structure of the page (landmarks, one `h1`, heading nesting, list semantics) —
a property that spans nine component files and that no single component test
can protect.

The star rating's text alternative is NOT asserted in `site/index.test.js`,
despite what an earlier version of this file said. It lives in
`src/components/abilityitem/index.test.js` along with the shape-not-colour,
string-coercion and clamping assertions — verified by grep, not assumed.

`package.json` maps `^axios$` to `axios/dist/node/axios.cjs`; axios 1.x is ESM
and CRA's Jest does not transform `node_modules`, so without the mapping the
suite fails to parse before running a single test.

Deliberately NOT tested, because jsdom loads no CSS and does no layout:
breakpoints, contrast ratios, focus rings, and `.visually-hidden` vs `.hidden`.
An assertion there would pass vacuously and license CSS changes nobody checked.
Verify those in a browser.

Note `@testing-library/react` 9.5 resolves a nested dom-testing-library 6.16,
which **silently ignores** the `level` option on `getAllByRole('heading', ...)`
— so the canonical single-`h1` assertion passes regardless of the markup. The
suite uses `querySelectorAll` where that matters.

## Certificate monitoring

`.github/workflows/cert-check.yml` watches TLS from outside the house, twice
daily. It must live on **`master`** — GitHub runs `schedule` only on the default
branch, and on `dev` it would never fire and never say so.

Its load-bearing check is **SAN resolution**, not expiry. In Aug 2026 the cert
covered `austinzurbuchen.com` + `resume.austinzurbuchen.com`; the `resume` A
record was deleted, Let's Encrypt validates every SAN before issuing, and so
renewal failed for the *whole* certificate including the healthy apex. Renewal
began failing ~18 Jul and nobody noticed until 3 Sep — 17 days after expiry.
From outside, a soon-to-fail renewal looks identical to a healthy cert, so
watching expiry alone cannot warn in time. Resolving every SAN fires the day a
record dies.

Thresholds are WARN at 25 days and CRITICAL at 10, both deliberately **below**
the ~30-day renewal trigger, so a healthy renewal cycle never raises an alarm —
an alert that fires on success is how monitors get muted.

When you add a hostname in Nginx Proxy Manager, update `EXPECTED_SANS` in the
workflow in the same sitting. The drift check exists to force that edit.

The heartbeat commit under `monitor/` is not noise: public repos have scheduled
workflows auto-disabled after 60 days of inactivity, and this repo has had
several quiet stretches longer than that.

**Who watches the watcher.** Everything above can only report a problem while
the workflow is still running; a workflow that stops firing produces no output
to inspect, so nothing in this repo can detect its own silence. The
`HEALTHCHECK_URL` secret points at a healthchecks.io check that expects a ping
on a schedule and emails when one does not arrive — an observer whose failure
mode is independent of GitHub Actions. It deliberately pings OK even on a WARN
or CRITICAL verdict: it watches liveness, not the certificate. Letting a cert
problem hold it down for 25 days would turn it into a second permanently-red
alarm. Leave the secret unset and the step is a clean no-op, but then nothing
is watching whether the monitor still runs.

## Commands

```
npm start     # dev server, port 3000
npm run build # production build to build/
npm test      # 152 tests, 6 suites
```

Do not run `npm run eject`. Do not commit `.env.local`.
