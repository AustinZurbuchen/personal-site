import React from "react";
import useStore from "../../store";
import "./index.scss";

function Name() {
  const resume = useStore(
    (state) => state.resume
  );

  return (
    <div className="nameContainer">
      <div className="name">
        {" "}
        {resume.profile.name}{" "}
      </div>
      <div className="subText">
        {" "}
        Resume{" "}
      </div>
    </div>
  );
}
export default Name;
