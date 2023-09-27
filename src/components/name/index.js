import React from "react";
import { useSelector } from 'react-redux';
import "./index.scss";

function Name() {
  const resume = useSelector((state) => state.resume.value);

  return (
    <div className="nameContainer">
      <div className="name"> {resume.profile.name} </div>
      <div className="subText"> Resume </div>
    </div>
  );
}
export default Name;
