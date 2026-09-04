import React from "react";
import { generateStars } from "../../utils/abilities";
import "./index.scss";

const Abilityitem = ({ ability, stars }) => {
  let starsElement = generateStars(stars);
  return (
    <li className="abilityitem row">
      <div className="ability">{ability}</div>
      <div className="starsContainer">
        <div className="stars">{starsElement}</div>
        <span className="visually-hidden">{stars} out of 5</span>
      </div>
    </li>
  );
};
export default Abilityitem;
