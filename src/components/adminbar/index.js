import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editcontrol from "../editcontrol/index";
import { sessionStarted, sessionEnded, selectSignedIn } from "../../reducers/editMode";
import { signIn, signOut } from "../../utils/adminApi";
import { isAdminUi } from "../../utils/env";
import "./index.scss";

// The admin chrome: sign in, sign out, and the only visible cue telling you
// which vhost you are on. Both vhosts serve identical files, so without this
// the admin page and the public page are indistinguishable on screen.
//
// Rendered from App.js rather than from Site, deliberately:
//   * it is available while GET /getResume is failing, so a dead API does not
//     also lock the operator out of signing in;
//   * src/components/site/index.js is therefore not modified at all by this
//     feature, which is the strongest possible guarantee for the 57 structural
//     assertions in src/components/site/index.test.js.
//
// It reads Redux, so it is a "section" component by the convention in
// CLAUDE.md even though it is chrome rather than a band.
function Adminbar() {
  const signedIn = useSelector(selectSignedIn);
  const dispatch = useDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // { text, attempt }. The attempt counter keys the alert element below: a
  // second identical failure would otherwise be the same string, React would
  // bail out of the re-render, and a second wrong password would look like
  // nothing happened. Re-keying remounts the node, and role="alert" on a newly
  // inserted node is announced.
  const [failure, setFailure] = useState(null);

  // Every hook above this line, on purpose. Returning null here is one of the
  // two mechanisms that keep the public DOM byte-identical: with no
  // window.__ENV__.REACT_APP_ADMIN -- the public vhost, and every existing
  // test -- this component contributes no element, no landmark, no id and no
  // button.
  //
  // isAdminUi() is COSMETIC. It decides whether this form is painted and
  // nothing else. Anyone can set the flag from a console on the public site and
  // summon it; they still cannot get a token without an admin password, and the
  // public vhost's `limit_except GET HEAD { deny all; }` refuses the write at
  // the edge with a 403 before Flask ever sees it. See src/utils/env.js.
  if (!isAdminUi()) {
    return null;
  }

  const onSubmit = (event) => {
    event.preventDefault();
    if (busy) return;

    const trimmed = username.trim();
    if (!trimmed || !password) {
      setFailure((current) => ({
        text: "Enter both a username and a password.",
        attempt: (current ? current.attempt : 0) + 1,
      }));
      return;
    }

    setBusy(true);
    setFailure(null);
    signIn(trimmed, password)
      .then(() => {
        // Cleared on success so neither value sits in a DOM node for the rest
        // of the session.
        setUsername("");
        setPassword("");
        setBusy(false);
        dispatch(sessionStarted());
      })
      .catch((error) => {
        setBusy(false);
        setFailure((current) => ({
          text: error.message,
          attempt: (current ? current.attempt : 0) + 1,
        }));
      });
  };

  const onSignOut = () => {
    // Both copies, always together: sessionStorage survives a reload, the store
    // flag drives the render. Clearing one leaves the other to resurrect the
    // session. sessionEnded also drops the open section and any drafts, which
    // is correct here -- this is a deliberate exit, unlike an expiry.
    signOut();
    dispatch(sessionEnded());
    setFailure(null);
  };

  return (
    <div className="adminbar">
      <div className="adminbarinner">
        {signedIn ? (
          <>
            <p className="adminbarstatus">
              Admin session active — edit controls are on.
            </p>
            <Editcontrol
              label="Sign out"
              dark
              onClick={onSignOut}
            ></Editcontrol>
          </>
        ) : (
          <form className="adminbarform" onSubmit={onSubmit}>
            <p className="adminbarstatus">Admin view — sign in to edit.</p>
            {/* Real labels, visually hidden. The placeholders are a hint, not a
                name: a placeholder disappears on the first keystroke and is not
                exposed as an accessible name by every combination. */}
            <label className="visually-hidden" htmlFor="adminUsername">
              Username
            </label>
            <input
              className="adminbarinput"
              id="adminUsername"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Username"
              value={username}
              // readOnly, not disabled: disabling the field the user just
              // pressed Enter in drops focus to <body>, so a screen-reader user
              // is silently teleported to the top of the document mid-request.
              readOnly={busy}
              onChange={(event) => setUsername(event.target.value)}
            />
            <label className="visually-hidden" htmlFor="adminPassword">
              Password
            </label>
            <input
              className="adminbarinput"
              id="adminPassword"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              readOnly={busy}
              onChange={(event) => setPassword(event.target.value)}
            />
            {/* A real <form> with a submit button, so Enter submits from either
                field and password managers see a username/password pair. */}
            <button className="editcontrol editcontroldark" type="submit" aria-disabled={busy ? "true" : undefined}>
              {busy ? "Signing in" : "Sign in"}
            </button>
          </form>
        )}
      </div>

      {failure && (
        <p className="adminbarmessage" role="alert" key={failure.attempt}>
          {failure.text}
        </p>
      )}
    </div>
  );
}
export default Adminbar;
