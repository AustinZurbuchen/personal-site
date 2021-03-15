import React from "react";
import { generateStars } from "../../utils/abilities";
import "./index.scss";

const Abilityitem = ({ ability, stars }) => {
  let starsElement = generateStars(stars);
  return (
    <div className="abilityitem row">
      <div className="ability">{ability}</div>
      <div className="starsContainer">
        <div className="stars">{starsElement}</div>
      </div>
    </div>
  );
};
export default Abilityitem;
