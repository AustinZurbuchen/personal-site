import React from "react";
import Abilityitem from "../components/abilityitem/index";

const abilityData = require("../data/abilities.json");
export function generateLanguages() {
  let languages = abilityData[0].sort((a, b) => {
    return b.stars - a.stars;
  });
  let languageComponents = [];

  let i = 0;
  for (let language of languages) {
    languageComponents.push(
      <Abilityitem
        key={i.toString()}
        ability={language.ability}
        stars={language.stars}
      ></Abilityitem>
    );
    i++;
  }
  return languageComponents;
}

export function generateTechnologies() {
  let technologies = abilityData[1].sort((a, b) => {
    return b.stars - a.stars;
  });
  let technologyComponents = [];

  let i = 0;
  for (let technology of technologies) {
    technologyComponents.push(
      <Abilityitem
        key={i.toString()}
        ability={technology.ability}
        stars={technology.stars}
      ></Abilityitem>
    );
    i++;
  }
  return technologyComponents;
}

export function generateStars(stars) {
  var starelements = [];
  for (let i = 0; i < 5; i++) {
    if (i < stars) {
      starelements.push(
        <div key={i.toString()} style={{ color: "#46a4a0" }}>
          &#9733;
        </div>
      );
    } else {
      starelements.push(
        <div key={i.toString()} style={{ color: "#dfe0e0" }}>
          &#9733;
        </div>
      );
    }
  }
  return starelements;
}
