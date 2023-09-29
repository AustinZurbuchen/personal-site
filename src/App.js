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

  useEffect(() => {
    axios
      .post("http://localhost:5001/getResume")
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => {
        console.log(err);
      });
  }, [dispatch]);

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
