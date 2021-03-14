import React, { Component } from "react";
import Titles from "../titles/index";
import Experiencelist from "../experiencelist/index";
import { generateEducations, generateCareers } from "../../utils/experiences";
import "./index.scss";

class Experiences extends Component {
  render() {
    let educations = generateEducations();
    let educationItems = <>{educations}</>;
    let careers = generateCareers();
    let careerItems = <>{careers}</>;
    return (
      <div className="experiences">
        <div className="container">
          <Titles
            title="Experiences"
            subtitle='"The most important word a man can say are, ‘I will do better.‘"'
            by='- "Dalinar Kholin", Oathbringer by Brandon Sanderson'
          ></Titles>
          <div className="info column">
            <Experiencelist
              title="Educations"
              items={educationItems}
            ></Experiencelist>
            <Experiencelist
              title="Careers"
              items={careerItems}
            ></Experiencelist>
          </div>
        </div>
      </div>
    );
  }
}
export default Experiences;
