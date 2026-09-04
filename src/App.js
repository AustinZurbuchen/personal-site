import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { update } from "./reducers/resume";
import Site from "./components/site/index";
import Loaderror from "./components/loaderror/index";
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
  const runtimeServerUrl =
    typeof window.__ENV__?.REACT_APP_SERVER_URL === "string"
      ? window.__ENV__.REACT_APP_SERVER_URL
      : "";
  const serverUrl =
    runtimeServerUrl ||
    (process.env.NODE_ENV === "development"
      ? process.env.REACT_APP_SERVER_URL || ""
      : "");

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
