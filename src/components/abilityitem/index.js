import React from "react";
import { generateStars, normalizeStars } from "../../utils/abilities";
import "./index.scss";

const Abilityitem = ({ ability, stars }) => {
  let starsElement = generateStars(stars);
  // Same normalisation as the glyphs, so the two can never disagree.
  const rating = normalizeStars(stars);
  return (
    <li className="abilityitem row">
      <div className="ability">{ability}</div>
      <div className="starsContainer">
        <div className="stars">{starsElement}</div>
        <span className="visually-hidden">{rating} out of 5</span>
      </div>
    </li>
  );
};
export default Abilityitem;
