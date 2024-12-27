import React, {
  useEffect,
  useState,
} from "react";
import axios from "axios";
import Site from "./components/site/index";
import "./App.scss";
import useStore from "./store";

function App() {
  const [isBusy, setBusy] =
    useState(true);
  const resume = useStore(
    (state) => state.resume
  );
  const setResume = useStore(
    (state) => state.setResume
  );

  useEffect(() => {
    axios
      .get(
        "http://localhost:5000/getResume"
      )
      .then((response) => {
        setResume(response.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [setResume]);

  useEffect(() => {
    if (resume && isBusy) {
      setBusy(false);
    }
  }, [resume, isBusy]);

  return (
    <div className="App">
      <div className="background">
        {resume && !isBusy && <Site />}
      </div>
    </div>
  );
}

export default App;
