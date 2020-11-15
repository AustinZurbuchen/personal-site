import React from "react";
import "./index.scss";

const Details = ({ title, body }) => {
  const { name, age, location } = body;
  return (
    <div className="details">
      <div className="title" id="detailsTitle">
        {title}
      </div>
      <div className="body">
        <div className="bodyTitle bold">Name:</div>
        <div className="bodyContent">{name}</div>
        <div className="bodyTitle bold">Age:</div>
        <div className="bodyContent">{age}</div>
        <div className="bodyTitle bold">Location:</div>
        <div className="bodyContent">{location}</div>
      </div>
    </div>
  );
};
export default Details;
