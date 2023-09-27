import React, { useEffect, useState } from "react";
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux'
import { update } from './reducers/resume';
import Site from "./components/site/index";
import "./App.scss";

function App() {
  const resume = useSelector((state) => state.resume.value);
  const [isBusy, setBusy] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    axios.post('http://localhost:5001/getResume').then(response => {
      dispatch(update(response.data));
    }).catch(err => {
      console.log(err);
    })
  }, [dispatch]);

  useEffect(() => {
    if(resume && isBusy) {
      setBusy(false);
    }
  }, [resume, isBusy]);

  return (
    <div className="App">
      <div className="background">
        {resume && !isBusy && <Site></Site>}
      </div>
    </div>
  );
}

export default App;
