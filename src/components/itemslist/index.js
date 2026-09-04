import React from "react";
import "./index.scss";

const Itemslist = ({ title, items }) => {
  return (
    <div className="itemslist">
      <h3 className="listtitle smalltitle">{title}</h3>
      <ul className="listitems">{items}</ul>
    </div>
  );
};
export default Itemslist;
