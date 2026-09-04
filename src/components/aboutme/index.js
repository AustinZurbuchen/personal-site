import React from "react";
import "./index.scss";

const Aboutme = ({ title, body }) => {
  return (
    <div className="aboutme">
      <h3 className="title" id="aboutmeTitle">
        {title}
      </h3>
      <div className="body collapsedtext">{body}</div>
    </div>
  );
};
export default Aboutme;
