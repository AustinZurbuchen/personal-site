import React from "react";
import { useSelector } from "react-redux";
import "./index.scss";

function Name() {
  const resume = useSelector((state) => state.resume.value);

  return (
    <header className="nameContainer">
      <h1 className="name"> {resume.profile.name} </h1>
      <div className="subText"> Resume </div>
    </header>
  );
}
export default Name;
