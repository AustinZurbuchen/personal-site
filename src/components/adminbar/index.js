import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Editcontrol from "../editcontrol/index";
import { sessionStarted, sessionEnded, selectSignedIn } from "../../reducers/editMode";
import { signIn, signOut } from "../../utils/adminApi";
import { isAdminUi } from "../../utils/env";
import "./index.scss";

// The admin chrome: a small trigger in the top right that drops down a sign-in
// panel. COLLAPSED BY DEFAULT, and that is the point — the admin vhost should
// look like the site anyone else sees until you ask it not to. Before this the
// panel was always open, so the two vhosts were obviously different pages.
//
// The trigger itself is unavoidable: both vhosts serve identical files, so
// something has to be reachable or there is no way in. It is kept as quiet as
// it can be while staying findable and operable.
//
// Rendered from App.js rather than from Site, deliberately:
//   * it is available while GET /getResume is failing, so a dead API does not
//     also lock the operator out of signing in;
//   * src/components/site/index.js is therefore not modified at all by this
//     feature, which is the strongest possible guarantee for the 57 structural
//     assertions in src/components/site/index.test.js.
function Adminbar() {
  const signedIn = useSelector(selectSignedIn);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // { text, attempt }. The attempt counter keys the alert element below: a
  // second identical failure would otherwise be the same string, React would
  // bail out of the re-render, and a second wrong password would look like
  // nothing happened. Re-keying remounts the node, and role="alert" on a newly
  // inserted node is announced.
  const [failure, setFailure] = useState(null);

  const triggerRef = useRef(null);
  const firstFieldRef = useRef(null);
  const rootRef = useRef(null);

  // Focus the first thing worth typing into when the panel opens, and hand
  // focus back to the trigger when it closes — otherwise closing the panel
  // drops focus to <body> and a keyboard user restarts from the top of a
  // ~450vh document.
  useEffect(() => {
    if (!open) return;
    const node = firstFieldRef.current;
    if (node) node.focus();
  }, [open, signedIn]);

  // A click anywhere outside the widget closes it. Bound on mousedown rather
  // than click: a click that STARTS inside the panel and ends outside — which
  // is what selecting text in a field and releasing past its edge does — would
  // otherwise close the panel out from under the drag.
  //
  // Listening in the capture phase, so a handler that stops propagation
  // somewhere below cannot strand the panel open.
  useEffect(() => {
    if (!open) return undefined;

    const onDocumentMouseDown = (event) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target)) {
        // Not close(): that pulls focus back to the trigger, which would yank
        // it away from whatever the person just deliberately clicked on.
        setOpen(false);
        setFailure(null);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown, true);
    return () =>
      document.removeEventListener("mousedown", onDocumentMouseDown, true);
  }, [open]);

  // Escape closes it, from anywhere inside. Bound on the panel rather than the
  // document so it cannot swallow an Escape meant for something else.
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  };

  const close = () => {
    setOpen(false);
    setFailure(null);
    const node = triggerRef.current;
    if (node) node.focus();
  };

  // Every hook above this line, on purpose. Returning null here is one of the
  // two mechanisms that keep the public DOM byte-identical: with no
  // window.__ENV__.REACT_APP_ADMIN -- the public vhost, and every existing
  // test -- this component contributes no element, no landmark, no id and no
  // button.
  //
  // isAdminUi() is COSMETIC. It decides whether this is painted and nothing
  // else. Anyone can set the flag from a console on the public site and summon
  // it; they still cannot get a token without an admin password, and the public
  // vhost's `limit_except GET HEAD { deny all; }` refuses the write at the edge
  // with a 403 before Flask ever sees it. See src/utils/env.js.
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
        setOpen(false);
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
    setOpen(false);
  };

  return (
    <div
      className={"adminbar" + (signedIn ? " adminbarlive" : "")}
      ref={rootRef}
    >
      <button
        className="admintrigger"
        type="button"
        ref={triggerRef}
        aria-expanded={open ? "true" : "false"}
        aria-controls="adminpanel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {/* The word carries the state, so it is not colour alone. */}
        {signedIn ? "Editing" : "Admin"}
        <span className="admintriggermark" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="adminpanel" id="adminpanel" onKeyDown={onKeyDown}>
          {signedIn ? (
            <>
              <p className="adminbarstatus">
                Signed in. Edit controls are on each section.
              </p>
              <Editcontrol label="Sign out" dark onClick={onSignOut}></Editcontrol>
            </>
          ) : (
            <form className="adminbarform" onSubmit={onSubmit}>
              <p className="adminbarstatus">Sign in to edit this page.</p>
              {/* Real labels, visually hidden. The placeholders are a hint, not
                  a name: a placeholder disappears on the first keystroke and is
                  not exposed as an accessible name by every combination. */}
              <label className="visually-hidden" htmlFor="adminUsername">
                Username
              </label>
              <input
                className="adminbarinput"
                id="adminUsername"
                name="username"
                type="text"
                ref={firstFieldRef}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Username"
                value={username}
                // readOnly, not disabled: disabling the field the user just
                // pressed Enter in drops focus to <body>, so a screen-reader
                // user is silently teleported to the top of the document
                // mid-request.
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
              {/* A real <form> with a submit button, so Enter submits from
                  either field and password managers see a username/password
                  pair. */}
              <button
                className="editcontrol editcontroldark"
                type="submit"
                aria-disabled={busy ? "true" : undefined}
              >
                {busy ? "Signing in" : "Sign in"}
              </button>
            </form>
          )}

          {failure && (
            <p className="adminbarmessage" role="alert" key={failure.attempt}>
              {failure.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export default Adminbar;
