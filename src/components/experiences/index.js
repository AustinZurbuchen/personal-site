import React from "react";
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import {
  generateEducations,
  generateCareers,
} from "../../utils/experiences";
import useStore from "../../store";
import "./index.scss";

function Experiences() {
  const resume = useStore(
    (state) => state.resume
  );

  let educationItems = resume
    .experiences?.school ? (
    <>
      {generateEducations(
        resume.experiences.school
      )}
    </>
  ) : null;

  let careerItems = resume.experiences
    ?.work ? (
    <>
      {generateCareers(
        resume.experiences.work
      )}
    </>
  ) : null;

  let quote = resume.quotes?.[0] || {
    quote: "",
    by: "",
  };

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
            <Itemslist
              title="Educations"
              items={educationItems}
            ></Itemslist>
          </div>
          <div className="careers">
            <Itemslist
              title="Careers"
              items={careerItems}
            ></Itemslist>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Experiences;
