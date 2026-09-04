import React from "react";
import "./index.scss";

const Titles = ({ title, subtitle, by, id }) => {
  return (
    <div className="titles">
      <h2 className="title" id={id}>
        {title}
      </h2>
      <div className="subtitle">{subtitle}</div>
      {by && <div className="subtitle by">{by}</div>}
    </div>
  );
};
export default Titles;
