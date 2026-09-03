# personal-site

React resume site for austinzurbuchen.com. Public, read-only for visitors; the
resume content lives in MongoDB Atlas and is served by the `personal-site-py`
Flask API (separate repo, `../personal-site-py`).

## Stack

CRA 5 (`react-scripts`) · React 17 · Redux Toolkit · MUI 5 + Emotion ·
react-router-dom 6 · axios · Sass. Deployed as a Docker image (node:20-alpine
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

`src/reducers/resume.js` deep-merges the API payload over an `emptyResume`
skeleton, so `resume.profile`, `resume.abilities.languages`, etc. are always
defined. Do not reintroduce optional chaining guards that assume they may be
missing — but do keep the merge intact when adding new resume fields: **a new
field must be added to `emptyResume` or it will be dropped.**

`editMode` slice exists and is wired to a Button in `name/index.js`, but that
button carries `.hidden` and the edit flow is unfinished. Treat it as WIP.

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
| Heading teal | `#22a39f` |
| Filled star | `#46a4a0` |
| Empty star | `#dfe0e0` |
| Subtitles, 1px rules, footer links | `#727878` |
| Body text | `#434242` |
| Footer background | `#444242` |
| Profile band | `#fff6db` |
| Experiences band | `#f3efe0` |
| Abilities band | `#ffffff` |
| Hero wash over CatWallpaper | `rgba(0, 255, 255, 0.5)` |

**Type** — `"Courier New", Courier, monospace` for every heading and display
string; the system sans stack in `index.scss` for body copy. Sizes in use:
50px section title · 48px name · 30px `.smalltitle` · 28px sub-heading ·
26px hero subtext · 20px `.biggertext` · 18px subtitle.

**Layout** — the page is a stack of full-bleed bands. Each band is
`min-height: 100vh`, flex column, centered, with its own background color, and
contains a `.container` (`max-width: 810px`, `padding: 40px 180px`). Sections
are separated by a `1px solid #727878` top border, not by margin.

**Global helpers** in `src/index.scss`: `.row` `.column` `.bold` `.biggertext`
`.smalltitle` `.collapsedtext` `.spreadtext`. Prefer these over redeclaring
flex direction or font weight in a component.

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
- CRA boilerplate not yet replaced: `manifest.json` name, the
  `<meta name="description">`, and `App.test.js` (which asserts "learn react"
  and fails).

## Commands

```
npm start     # dev server, port 3000
npm run build # production build to build/
npm test      # currently failing on boilerplate App.test.js
```

Do not run `npm run eject`. Do not commit `.env.local`.
