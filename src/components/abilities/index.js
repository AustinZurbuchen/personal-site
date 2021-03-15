import React, { Component } from "react";
import { generateLanguages, generateTechnologies } from "../../utils/abilities";
import Itemslist from "../itemslist";
import Titles from "../titles/index";
import "./index.scss";

const quote = require("../../data/quotes.json")[1];

class Abilities extends Component {
  render() {
    let languages = <>{generateLanguages()}</>;
    let technologies = <>{generateTechnologies()}</>;
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
}
export default Abilities;
