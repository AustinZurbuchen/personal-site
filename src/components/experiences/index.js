import React from "react";
import { useSelector } from 'react-redux';
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import { generateEducations, generateCareers } from "../../utils/experiences";
import "./index.scss";

// const quote = require("../../data/quotes.json")[0];

function Experiences() {
  const resume = useSelector((state) => state.resume.value);
  let educationItems = <>{generateEducations(resume.experiences.school)}</>;
  let careerItems = <>{generateCareers(resume.experiences.work)}</>;
  let quote = resume.quotes[0];

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
export default Experiences;
