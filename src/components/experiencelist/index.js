import React from "react";
import "./index.scss";

const Experiencelist = ({ title, items }) => {
  console.log("items");
  console.log(items);
  return (
    <div className="experiencelist">
      <div className="listtitle smalltitle">{title}</div>
      <div className="listitems">{items}</div>
    </div>
  );
};
export default Experiencelist;
