import React from "react";
import Header from "./components/header/index.js";
import Name from "./components/name/index.js";
import Profile from "./components/profile/index.js";
import Experiences from "./components/experiences/index";
import "./App.scss";

function App() {
  return (
    <div className="App">
      <div className="background">
        {/* <Header></Header> */}
        <Name></Name>
        <Profile></Profile>
        <Experiences></Experiences>
      </div>
    </div>
  );
}

export default App;
