// Where the admin session token lives between renders and across a reload.
//
// THIS MODULE DELIBERATELY IMPORTS NOTHING. src/reducers/editMode.js seeds its
// `signedIn` flag from hasSession() here, and every store construction --
// including src/test-utils/renderWithStore.js, which builds one for all 57
// existing tests -- therefore loads this file. Importing axios here would drag
// axios into the module graph of every reducer test, where it parses only
// because of the "^axios$" -> "axios/dist/node/axios.cjs" mapping in
// package.json. Keeping the token store separate from the HTTP client means a
// change to that mapping can break the network layer without taking the whole
// suite down with it. src/utils/adminApi.js imports this file, never the
// reverse.
//
// STORAGE: sessionStorage, not localStorage. The token dies with the tab, so a
// machine left open on the admin vhost stops being a standing write credential
// when the window closes. It is not a cookie either: the token is only ever
// sent as an explicit Authorization header, so the browser never attaches it to
// a request on its own and there is no CSRF surface to defend.
//
// One key holding one JSON record, rather than a token key plus an expiry key:
// two keys can be written half-way and leave a token with no expiry, which
// fails open.
//
// Every access is wrapped. It is the property access ITSELF that throws in some
// configurations (Safari private browsing, "block all cookies", a null-origin
// iframe), not just the write -- and an unhandled throw here would white-screen
// the admin view on mount. Every failure degrades to "no session", which fails
// in the safe direction: you get the sign-in form.

const STORAGE_KEY = "personal-site.admin.session";

export function clearSession() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Nothing to do and nothing to report: if storage refuses to be written it
    // refused to be read too, so there was no session to clear.
  }
}

export function readSession() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== "string" || !parsed.token) {
      return null;
    }

    // A hint, not the authority. itsdangerous re-checks max_age on the server
    // for every write and answers 401 session_expired, and the client clock can
    // be wrong in either direction. This only stops the UI opening an editor
    // whose Save is already guaranteed to fail -- the tab left open overnight.
    if (
      typeof parsed.expiresAt === "number" &&
      Number.isFinite(parsed.expiresAt) &&
      parsed.expiresAt <= Date.now()
    ) {
      clearSession();
      return null;
    }

    return parsed;
  } catch (e) {
    // Malformed JSON, or storage that refuses to be read at all.
    return null;
  }
}

// `expiresIn` is the backend's SESSION_TTL_SECONDS (28800). Returns true when
// the record actually landed, so the caller can say "this browser will not keep
// you signed in" rather than silently handing back a session that is gone on
// the next reload.
export function writeSession(token, expiresIn, username) {
  const record = { token };
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0) {
    record.expiresAt = Date.now() + expiresIn * 1000;
  }
  if (typeof username === "string" && username) {
    record.username = username;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch (e) {
    // Storage is unavailable or full. The session still works for this page
    // view -- the caller holds the token in memory -- only a reload loses it.
    return false;
  }
}

// Read by the editMode slice's lazy initialState, so a page reload inside a
// live 8h session returns to the editor rather than to the sign-in form.
export function hasSession() {
  return readSession() !== null;
}
