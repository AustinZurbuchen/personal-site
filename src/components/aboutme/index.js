import React from "react";
import "./index.scss";

const Aboutme = ({ title, body }) => {
  return (
    <div className="aboutme">
      <div className="title" id="aboutmeTitle">
        {title}
      </div>
      <div className="body collapsedtext">{body}</div>
    </div>
  );
};
export default Aboutme;
