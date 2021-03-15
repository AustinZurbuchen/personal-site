import React from "react";
import Abilityitem from "../components/abilityitem/index";

const abilityData = require("../data/abilities.json");
export function generateLanguages() {
  let languages = abilityData[0];
  let languageComponents = [];

  for (let language of languages) {
    languageComponents.push(
      <Abilityitem
        ability={language.ability}
        stars={language.stars}
      ></Abilityitem>
    );
  }
  return languageComponents;
}

export function generateTechnologies() {
  let technologies = abilityData[1];
  let technologyComponents = [];

  for (let technology of technologies) {
    technologyComponents.push(
      <Abilityitem
        ability={technology.ability}
        stars={technology.stars}
      ></Abilityitem>
    );
  }
  return technologyComponents;
}

export function generateStars(stars) {
  var starelements = [];
  for (let i = 0; i < 5; i++) {
    if (i < stars) {
      starelements.push(<div style={{ color: "#46a4a0" }}>&#9733;</div>);
    } else {
      starelements.push(<div style={{ color: "#dfe0e0" }}>&#9733;</div>);
    }
  }
  return starelements;
}
