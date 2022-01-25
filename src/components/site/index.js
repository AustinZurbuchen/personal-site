import React from "react";
// import Header from "./components/header/index.js";
import Name from "../name/index";
import Profile from "../profile/index";
import Experiences from "../experiences/index";
import Abilities from "../abilities/index";
import Footer from "../footer/index";
import "./index.scss";

function Site() {
  return (
    <div className="Site">
      {/* <Header></Header> */}
      <Name></Name>
      <Profile></Profile>
      <Experiences></Experiences>
      <Abilities></Abilities>
      <Footer></Footer>
    </div>
  );
}
export default Site;
