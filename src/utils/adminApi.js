import axios from "axios";
import { resolveServerUrl } from "./env";
import { readSession, writeSession, clearSession } from "./adminSession";

// The three admin calls and the one vocabulary for their failures.
//
// Every component talks to the write API through this file, so there is exactly
// one place that knows the base URL, the Authorization header shape, and how an
// HTTP failure becomes a sentence a person can act on.
//
// This module never dispatches. It returns data or throws a normalised error,
// and the caller decides what that means for the store -- which keeps it free
// of an import cycle with the reducer and testable without a Provider.
//
// NOTE for the existing suite: src/App.test.js mocks axios as `{ get }` only.
// Nothing here runs unless the admin flag is on, and the flag is off in jsdom,
// so the missing `post`/`put` never bite. Do not call any of them at module
// scope.

// axios has NO default timeout. Without this a save against a hung proxy sits
// on "Saving..." forever with no way out but a reload.
const REQUEST_TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// Errors
//
// One shape for every failure: a plain Error carrying `code` (always one of the
// keys below), `message` (already written for a human) and `fieldErrors` (path
// -> detail, populated only by validation_failed). Callers branch on
// `error.code` and render `error.message`; nothing outside this file should
// read `error.response.status`.
//
// A plain Error with properties attached, NOT `class ApiError extends Error`.
// Babel downlevelling a subclass of a builtin to ES5 breaks `instanceof`
// silently, and this project's production browserslist does downlevel -- the
// bug would appear only in the built image, which is the worst possible place
// for it.
//
// The copy follows components/loaderror/: name what failed, say whether it is
// retryable, never blame the reader. Two extra rules for saves: say the typed
// text survived (it does -- a failed save never touches the draft and never
// leaves edit mode), and never paste the API's own `error` prose into the page.
// The `code` field is the contract; the prose is for the log.
// ---------------------------------------------------------------------------

const MESSAGES = {
  // POST /session
  invalid_credentials:
    "That username and password did not match. Check both — the password is case-sensitive.",
  bad_request: "Enter both a username and a password.",

  // PUT /updateResume
  validation_failed: "The server would not accept that value.",
  session_expired:
    "Your session expired before that saved. Sign in again and press Save — your text is still here.",
  unauthorized:
    "That session is no longer valid. Sign in again and press Save — your text is still here.",

  // Either call.
  not_configured:
    "The server has no admin session secret configured, so it is refusing writes. Set ADMIN_SESSION_SECRET on the API container.",
  // nginx, not Flask: the public vhost's `limit_except GET HEAD { deny all; }`
  // answering a write. Worth its own sentence -- "something went wrong" would
  // send someone hunting through Flask logs that contain no record of the
  // request at all, because it never reached Flask.
  forbidden:
    "This is the read-only site. Writes only work on the admin address, not on port 80.",
  not_found:
    "The API answered, but there is nothing at that address. Check that nginx still proxies /api/ to personal-site-py.",
  too_large: "That text is too long to send.",
  server_error:
    "The server could not complete that. This is usually temporary — please try again in a moment.",
  network:
    "Could not reach the server. This is usually temporary — please try again in a moment.",

  // Not an HTTP failure: sessionStorage refused the write. "Try again in a
  // moment" would be actively wrong advice, so it gets its own sentence.
  storage_unavailable:
    "This browser will not let the site remember your sign-in. Allow site data for this address, or leave private browsing, and try again.",

  unknown:
    "Something went wrong. This is usually temporary — please try again in a moment.",
};

function apiError(code, fieldErrors) {
  const error = new Error(MESSAGES[code] || MESSAGES.unknown);
  error.code = code;
  error.fieldErrors = fieldErrors || {};
  return error;
}

// The API's `errors: [{path, detail}]` flattened to `{path: detail}`, keyed by
// the same dotted path the drafts are keyed by, so a field can find its own
// error without scanning a list.
function toFieldErrors(errors) {
  if (!Array.isArray(errors)) return {};
  const byPath = {};
  errors.forEach((entry) => {
    if (entry && typeof entry.path === "string") {
      byPath[entry.path] = entry.detail || "could not be saved";
    }
  });
  return byPath;
}

function normalizeError(error) {
  // No response at all: offline, DNS, a CORS rejection, or the timeout above.
  if (!error || !error.response) {
    return apiError("network");
  }

  const status = error.response.status;
  const data =
    error.response.data && typeof error.response.data === "object"
      ? error.response.data
      : {};
  const code = typeof data.code === "string" ? data.code : "";

  // THE BODY'S OWN CODE FIRST, THEN THE STATUS. Not the other way round:
  // POST /session answers a wrong password with 401 invalid_credentials, and a
  // status-first branch turns "that password is wrong" into "your session is no
  // longer valid, sign in again" -- which sends the user to redo the thing that
  // just failed.
  if (code === "validation_failed") {
    const fieldErrors = toFieldErrors(data.errors);
    const detail = Object.keys(fieldErrors)
      .map((path) => `${path}: ${fieldErrors[path]}`)
      .join("; ");
    const failure = apiError("validation_failed", fieldErrors);
    if (detail) {
      failure.message = `The server would not accept that value — ${detail}`;
    }
    return failure;
  }
  if (code && MESSAGES[code]) {
    return apiError(code);
  }
  // Flask's own HTTPException handler turns a 413 into this code.
  if (code === "request_entity_too_large" || status === 413) {
    return apiError("too_large");
  }

  // Reached only when the body carried no code this file recognises -- i.e. it
  // never came from Flask (an nginx or proxy page) or Flask invented a new one.
  if (status === 401) return apiError("unauthorized");
  if (status === 403) return apiError("forbidden");
  if (status === 404) return apiError("not_found");
  if (status === 503) return apiError("not_configured");
  if (status >= 500) return apiError("server_error");
  return apiError("unknown");
}

// A dead token has to clear BOTH copies of itself -- sessionStorage, which
// survives a reload, and the store's `signedIn` flag, which drives the render --
// or the UI keeps offering an editor that cannot save.
export function isAuthFailure(error) {
  return (
    !!error &&
    (error.code === "unauthorized" || error.code === "session_expired")
  );
}

// ---------------------------------------------------------------------------
// Calls. Promise chains rather than async/await, matching the only other
// network code in the app (App.js).
// ---------------------------------------------------------------------------

// POST /session -> {"token", "expiresIn": 28800}. Resolves with nothing: the
// token is a side effect of this module, never a value a component holds.
export function signIn(username, password) {
  return axios
    .post(
      `${resolveServerUrl()}/session`,
      { username, password },
      { timeout: REQUEST_TIMEOUT_MS }
    )
    .then(
      (response) => {
        const data = (response && response.data) || {};
        if (typeof data.token !== "string" || !data.token) {
          // A 200 with no usable token means something is answering that is not
          // this API -- a captive portal, a misrouted proxy. Treated as a
          // failure rather than as a sign-in, or the UI opens an editor that
          // cannot save.
          throw apiError("unknown");
        }
        if (!writeSession(data.token, data.expiresIn, username)) {
          throw apiError("storage_unavailable");
        }
      },
      (error) => {
        throw normalizeError(error);
      }
    );
}

// Local only. The API issues stateless signed tokens and has nothing to revoke,
// so there is no call to make.
export function signOut() {
  clearSession();
}

// PUT /updateResume. `updates` is a plain object of dotted allowlist path ->
// string -- exactly the shape drafts are stored in, so the caller passes them
// straight through with no mapping table between a UI field name and a database
// path. That is the piece that generalises to stage 4: new fields are new keys,
// not new plumbing.
//
// Resolves with the WHOLE re-read, re-sorted resume the API returns. public_view
// is shared by GET /getResume and PUT /updateResume precisely so a 200 cannot
// describe a document the next GET would disagree with, so the caller dispatches
// this through the same `update` merge the first fetch uses -- no local
// patching, no follow-up GET, and no way for the screen to drift from the
// database.
export function saveFields(updates) {
  const session = readSession();
  if (!session) {
    // Never send a save with no Authorization header: the API would answer 401
    // unauthorized, which reads as "your session just died" when in fact it was
    // already gone before the click.
    return Promise.reject(apiError("session_expired"));
  }

  return axios
    .put(
      `${resolveServerUrl()}/updateResume`,
      { updates },
      {
        headers: { Authorization: `Bearer ${session.token}` },
        timeout: REQUEST_TIMEOUT_MS,
      }
    )
    .then(
      // Same unwrap App.js applies to /getResume, so the two paths into the
      // resume slice cannot diverge if the API is ever wrapped in an envelope.
      (response) => response.data?.resume ?? response.data,
      (error) => {
        const normalized = normalizeError(error);
        // Drop the dead token HERE, at the one place that learns it is dead.
        // Leaving it in storage means the next Save retries with a token that
        // cannot work, and hasSession() keeps claiming the user is signed in.
        if (isAuthFailure(normalized)) {
          clearSession();
        }
        throw normalized;
      }
    );
}

// GET /backups -> {"backups": [{id, createdAt, actor, changedPaths}, ...]},
// newest first. Metadata only: the API never sends the snapshots themselves.
//
// A READER, not a restore. A restore is a whole-document replacement -- exactly
// what the server's allowlist exists to refuse -- so there is deliberately no
// call here that could perform one. This tells the operator WHICH generation
// they want; the restore itself stays a mongosh command.
//
// Resolves with an array, never null, so a caller can render it without
// guarding. A row missing its date or actor comes through with nulls rather
// than being dropped: a backup you cannot fully describe is still a backup that
// exists, and hiding it would misreport how many generations you have.
export function fetchBackups() {
  const session = readSession();
  if (!session) {
    return Promise.reject(apiError("session_expired"));
  }

  return axios
    .get(`${resolveServerUrl()}/backups`, {
      headers: { Authorization: `Bearer ${session.token}` },
      timeout: REQUEST_TIMEOUT_MS,
    })
    .then(
      (response) => {
        const rows = response && response.data && response.data.backups;
        return Array.isArray(rows) ? rows : [];
      },
      (error) => {
        const normalized = normalizeError(error);
        // Same rule as saveFields: the one place that learns a token is dead
        // clears it, or hasSession() keeps claiming the user is signed in.
        if (isAuthFailure(normalized)) {
          clearSession();
        }
        throw normalized;
      }
    );
}
