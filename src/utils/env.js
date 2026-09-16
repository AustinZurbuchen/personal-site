// The runtime environment, resolved in one place.
//
// This logic used to live inline in App.js. src/utils/adminApi.js needs the
// same base URL for POST /session and PUT /updateResume, and a second copy of a
// three-layer fallback is a second chance to get it wrong.
//
// FUNCTIONS, not exported constants, and that is load-bearing rather than
// stylistic. window.__ENV__ is written by public/env-config.js -- a plain
// <script> that runs before the bundle -- so a constant evaluated at import
// would be correct in the browser. It is NOT correct under test: src/App.test.jsx
// assigns window.__ENV__ inside individual tests and deletes it in afterEach,
// long after this module was imported. A constant freezes the first value and
// those tests fail. Reading per call also preserves the exact semantics App.js
// already had, where the URL was re-derived on every render.

function runtimeEnv() {
  return typeof window !== "undefined" && window.__ENV__ ? window.__ENV__ : {};
}

// The Unraid template injects "api" with no leading slash; the admin vhost's
// inline env-config.js injects "/api". Taken as-is, "api" resolves against the
// page's own directory: /api/getResume from "/", but /resume/api/getResume from
// "/resume/" -- which nginx answers with index.html, and the merge turns into a
// hollow resume. So a bare path is made root-relative here, once, for every
// caller. "" (same origin) and absolute URLs ("http://localhost:5000" in
// .env.local) pass through untouched. src/App.test.jsx pins all three.
//
//   1. window.__ENV__.REACT_APP_SERVER_URL -- written at container start by
//      docker-entrypoint.d/40-env-config.sh. This is what production uses.
//   2. process.env.REACT_APP_SERVER_URL -- dev only (.env.local).
//   3. "" -- same origin.
export function resolveServerUrl() {
  const injected = runtimeEnv().REACT_APP_SERVER_URL;
  const runtimeServerUrl = typeof injected === "string" ? injected : "";
  const url =
    runtimeServerUrl ||
    (process.env.NODE_ENV === "development"
      ? process.env.REACT_APP_SERVER_URL || ""
      : "");

  return url && !url.startsWith("/") && !url.includes("://") ? `/${url}` : url;
}

// COSMETIC. This flag decides whether edit UI is RENDERED, and nothing else.
//
// Both nginx vhosts serve the identical bundle from the identical document
// root, so the app cannot tell from its own code which port it was fetched
// over. The admin server block on 8081 overrides /env-config.js with an inline
// `return 200` that adds this key. That makes the flag trivially forgeable --
// anyone can type window.__ENV__.REACT_APP_ADMIN = true into a console on the
// public site and the Edit button appears.
//
// That is fine, and it is the design. The real boundary is two things this file
// cannot touch: the public vhost's `limit_except GET HEAD { deny all; }`, which
// refuses the write at the edge with a 403, and the API's own require_session,
// which refuses it again without a signed token. A forged flag buys a sign-in
// form that cannot authenticate and a Save button that 403s. NEVER move a
// security decision onto this flag.
//
// Both `true` and "true" are accepted: nginx's inline body emits a JS boolean,
// while a shell-templated env-config.js would emit a string.
//
// The existing suite renders with no window.__ENV__ at all (App.test.jsx sets
// only REACT_APP_SERVER_URL), so this is false throughout it and the public DOM
// stays byte-identical.
export function isAdminUi() {
  const flag = runtimeEnv().REACT_APP_ADMIN;
  if (flag === true || flag === "true" || flag === "1") {
    return true;
  }
  // Development-only third layer, mirroring resolveServerUrl. Without it there
  // is no way to see this code outside the container, because `npm start`
  // serves public/env-config.js, which sets no flag. Guarded by NODE_ENV so a
  // production build can never be talked into admin mode by a stale .env.
  return (
    process.env.NODE_ENV === "development" &&
    process.env.REACT_APP_ADMIN === "true"
  );
}
