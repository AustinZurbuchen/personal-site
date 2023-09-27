import React from "react";
import { useSelector } from "react-redux";
import { generateLanguages, generateTechnologies } from "../../utils/abilities";
import Itemslist from "../itemslist";
import Titles from "../titles/index";
import "./index.scss";

function Abilities() {
  const resume = useSelector((state) => state.resume.value);
  let languages = <>{generateLanguages([...resume.abilities.languages])}</>;
  let technologies = <>{generateTechnologies([...resume.abilities.technologies])}</>;
  let quote = resume.quotes[1];

  return (
    <div className="abilities">
      <div className="container">
        <Titles
          title="Abilities"
          subtitle={quote.quote}
          by={quote.by}
        ></Titles>
        <div className="list column">
          <div className="languages">
            <Itemslist title="Languages" items={languages}></Itemslist>
          </div>
          <div className="technologies">
            <Itemslist title="Technologies" items={technologies}></Itemslist>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Abilities;
