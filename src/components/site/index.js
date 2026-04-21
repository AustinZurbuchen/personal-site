import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Name from "../name/index";
import Profile from "../profile/index";
import Experiences from "../experiences/index";
import Abilities from "../abilities/index";
import Footer from "../footer/index";
import "./index.scss";

function Site() {
  const editMode = useSelector((state) => state.editMode.value);

  useEffect(() => {
    console.log("editMode", editMode);
  }, [editMode]);

  return (
    <div className="Site">
      <div className="background">
        <Name></Name>
        <Profile></Profile>
        <Experiences></Experiences>
        <Abilities></Abilities>
        <Footer></Footer>
      </div>
    </div>
  );
}
export default Site;