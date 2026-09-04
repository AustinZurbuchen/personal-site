import React from "react";
import "./index.scss";

const Details = ({ title, body }) => {
  const { name, age, location } = body;
  return (
    <div className="details">
      <h3 className="title" id="detailsTitle">
        {title}
      </h3>
      <dl className="body spreadtext">
        <dt className="bodyTitle bold">Name:</dt>
        <dd className="bodyContent">{name}</dd>
        <dt className="bodyTitle bold">Age:</dt>
        <dd className="bodyContent">{age}</dd>
        <dt className="bodyTitle bold">Location:</dt>
        <dd className="bodyContent">{location}</dd>
      </dl>
    </div>
  );
};
export default Details;
