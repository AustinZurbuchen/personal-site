// The runtime environment, resolved in one place.
//
// This logic used to live inline in App.js. src/utils/adminApi.js needs the
// same base URL for POST /session and PUT /updateResume, and a second copy of a
// three-layer fallback is a second chance to get it wrong.
//
// FUNCTIONS, not exported constants, and that is load-bearing rather than
// stylistic. window.__ENV__ is written by public/env-config.js -- a plain
// <script> that runs before the bundle -- so a constant evaluated at import
// would be correct in the browser. It is NOT correct under test: src/App.test.js
// assigns window.__ENV__ inside individual tests and deletes it in afterEach,
// long after this module was imported. A constant freezes the first value and
// those tests fail. Reading per call also preserves the exact semantics App.js
// already had, where the URL was re-derived on every render.

function runtimeEnv() {
  return typeof window !== "undefined" && window.__ENV__ ? window.__ENV__ : {};
}

// Unchanged from App.js, deliberately, including the odd-looking production
// value: REACT_APP_SERVER_URL is "api" with no leading slash in the Unraid
// template, so `${serverUrl}/getResume` resolves relative to the document --
// served at "/" -- and lands on /api/getResume. src/App.test.js pins the
// invariant that the resolved URL must not rebase under a nested route; the
// public value satisfies it only because this app has exactly one route. The
// admin vhost's inline env-config.js uses "/api" with a leading slash, and the
// template should be changed to match.
//
//   1. window.__ENV__.REACT_APP_SERVER_URL -- written at container start by
//      docker-entrypoint.d/40-env-config.sh. This is what production uses.
//   2. process.env.REACT_APP_SERVER_URL -- dev only (.env.local).
//   3. "" -- same origin.
export function resolveServerUrl() {
  const injected = runtimeEnv().REACT_APP_SERVER_URL;
  const runtimeServerUrl = typeof injected === "string" ? injected : "";

  return (
    runtimeServerUrl ||
    (process.env.NODE_ENV === "development"
      ? process.env.REACT_APP_SERVER_URL || ""
      : "")
  );
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
// The existing suite renders with no window.__ENV__ at all (App.test.js sets
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
