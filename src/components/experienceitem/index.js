import React from "react";
import "./index.scss";

const Experienceitem = ({ company, dateLabel, title, body }) => {
  return (
    <div className="experienceitem row">
      <div className="namedate column">
        <div className="institution bold biggertext">{company}</div>
        <div className="date">{dateLabel}</div>
      </div>
      <div className="titlebody column">
        <div className="experiencetitle bold biggertext">{title}</div>
        <div className="body">{body}</div>
      </div>
    </div>
  );
};
export default Experienceitem;
