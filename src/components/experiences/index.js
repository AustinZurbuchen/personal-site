import React, { Component } from "react";
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import { generateEducations, generateCareers } from "../../utils/experiences";
import "./index.scss";

const quote = require("../../data/quotes.json")[0];

class Experiences extends Component {
  render() {
    let educationItems = <>{generateEducations()}</>;
    let careerItems = <>{generateCareers()}</>;
    return (
      <div className="experiences">
        <div className="container">
          <Titles
            title="Experiences"
            subtitle={quote.quote}
            by={quote.by}
          ></Titles>
          <div className="info column">
            <div className="educations">
              <Itemslist title="Educations" items={educationItems}></Itemslist>
            </div>
            <div className="careers">
              <Itemslist title="Careers" items={careerItems}></Itemslist>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default Experiences;
