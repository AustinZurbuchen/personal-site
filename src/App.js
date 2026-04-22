import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { update } from "./reducers/resume";
import Site from "./components/site/index";
import Login from "./components/login";
import "./App.scss";

function App() {
  const resume = useSelector((state) => state.resume.value);
  const [isBusy, setBusy] = useState(true);
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
    axios
      .get(`${serverUrl}/getResume`)
      .then((response) => {
        dispatch(update(response.data?.resume ?? response.data));
      })
      .catch((err) => {
        console.log(err);
      });
  }, [dispatch, serverUrl]);

  useEffect(() => {
    if (resume && isBusy) {
      setBusy(false);
    }
  }, [resume, isBusy]);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={resume && !isBusy && <Site />} exact />
          <Route path="/login" element={<Login />} exact />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
