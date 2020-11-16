import React from "react";
import "./index.scss";

const Titles = ({ title, subtitle, by }) => {
  return (
    <div className="titles">
      <div className="title">{title}</div>
      <div className="subtitle">{subtitle}</div>
      {by && <div className="subtitle by">{by}</div>}
    </div>
  );
};
export default Titles;
