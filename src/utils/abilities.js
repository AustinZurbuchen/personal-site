import React from "react";
import Abilityitem from "../components/abilityitem/index";

export function generateLanguages(languageData) {
  let languages = languageData.sort((a, b) => {
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

export function generateTechnologies(technologyData) {
  let technologies = technologyData.sort((a, b) => {
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
        <div key={i.toString()} aria-hidden="true" style={{ color: "#46a4a0" }}>
          &#9733;
        </div>
      );
    } else {
      starelements.push(
        // Outline glyph, not a filled one: filled-vs-empty is 2.24:1 on
        // colour alone, so the state is carried by shape as well.
        <div key={i.toString()} aria-hidden="true" style={{ color: "#dfe0e0" }}>
          &#9734;
        </div>
      );
    }
  }
  return starelements;
}
