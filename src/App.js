import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { update } from "./reducers/resume";
import Site from "./components/site/index";
import Loaderror from "./components/loaderror/index";
import Adminbar from "./components/adminbar/index";
import { resolveServerUrl } from "./utils/env";
import "./App.scss";

function App() {
  // An explicit fetch status, NOT a check on the store. `resume.profile` is
  // truthy from the very first render because emptyResume.profile is an
  // object, so the old `resume?.profile && !isBusy` gate opened immediately
  // and painted the blank skeleton — a resume with no name and no experience —
  // before any response arrived, and left it there forever if the request
  // failed.
  const [status, setStatus] = useState("loading");
  const dispatch = useDispatch();
  // Moved to src/utils/env.js, unchanged, because src/utils/adminApi.js needs
  // the same value for /session and /updateResume and a second copy of a
  // three-layer fallback is a second chance to get it wrong. Still resolved on
  // every render rather than memoised: window.__ENV__ is set by a <script>
  // before the bundle and never changes afterwards, and src/App.test.js assigns
  // it between renders. It returns a string, so the [dispatch, serverUrl]
  // dependency array below compares exactly as the inline version did.
  const serverUrl = resolveServerUrl();

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${serverUrl}/getResume`)
      .then((response) => {
        if (cancelled) return;
        dispatch(update(response.data?.resume ?? response.data));
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, serverUrl]);

  return (
    <div className="App">
      {/* Renders null unless window.__ENV__.REACT_APP_ADMIN is set, which only
          the :8081 server block in nginx.conf does. On the public vhost -- and
          in every existing test, none of which sets that key -- it contributes
          no element, no landmark, no heading and no button.

          Deliberately OUTSIDE the router and outside the fetch status: an admin
          can sign in while /getResume is failing, and the sign-in form has no
          reason to wait on the resume. It also means
          src/components/site/index.js is not touched at all by this feature. */}
      <Adminbar></Adminbar>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              status === "error" ? (
                <Loaderror />
              ) : status === "ready" ? (
                <Site />
              ) : null
            }
            exact
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
