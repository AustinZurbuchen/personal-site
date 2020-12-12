import React from "react";
import "./index.scss";

const Experienceitem = ({ institution, date, title, body }) => {
  return (
    <div className="experienceitem row">
      <div className="namedate column">
        <div className="institution bold biggertext">{institution}</div>
        <div className="date">{date}</div>
      </div>
      <div className="titlebody column">
        <div className="experiencetitle bold biggertext">{title}</div>
        <div className="body">{body}</div>
      </div>
    </div>
  );
};
export default Experienceitem;
