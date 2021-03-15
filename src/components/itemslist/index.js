import React from "react";
import "./index.scss";

const Itemslist = ({ title, items }) => {
  return (
    <div className="itemslist">
      <div className="listtitle smalltitle">{title}</div>
      <div className="listitems">{items}</div>
    </div>
  );
};
export default Itemslist;
