# personal-site

The React resume site behind [austinzurbuchen.com](https://austinzurbuchen.com).
Content lives in MongoDB Atlas and is served by the `personal-site-py` Flask API;
this repo is the front end and the nginx that fronts it.

Vite 8 · React 19 · Redux Toolkit 2 · Sass, tested with Vitest.

```
npm install
npm start        # dev server on :3000, no backend needed (stub at public/getResume)
npm test         # 175 tests, 6 files
npm run build    # production build into build/
npm run preview  # serve the built output
```

`npm start` needs no API: with `REACT_APP_SERVER_URL` empty the app fetches the
stub at `public/getResume`. Point it at a real API by setting that key in
`.env.local`.

## Deploying

Pushing to `dev` builds a `linux/amd64` image and pushes it to GHCR; the Unraid
NAS pulls it on Force Update. The suite gates the image — a red run publishes
nothing. `master` catches up by PR.

Every image carries the commit it was built from at `/version.json`, and
`.github/workflows/cert-check.yml` compares that twice daily against the last
successful publish, so a container running code nobody deployed raises an issue.

## Working in this repo

Read [CLAUDE.md](CLAUDE.md) first. It carries the parts that are not obvious from
the code: why the API URL is normalised, why editing is LAN-only, which colours
were measured rather than chosen, and which constraints exist because something
broke once.
