import React from "react";
import "./index.scss";

const Experienceitem = ({ company, dateLabel, title, body }) => {
  return (
    <li className="experienceitem row">
      <div className="namedate column">
        <h4 className="institution bold biggertext">{company}</h4>
        <div className="date">{dateLabel}</div>
      </div>
      <div className="titlebody column">
        <p className="experiencetitle bold biggertext">{title}</p>
        <p className="body">{body}</p>
      </div>
    </li>
  );
};
export default Experienceitem;
