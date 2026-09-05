import React from "react";
import { useSelector } from 'react-redux';
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import { generateEducations, generateCareers } from "../../utils/experiences";
import "./index.scss";

// const quote = require("../../data/quotes.json")[0];

function Experiences() {
  const resume = useSelector((state) => state.resume.value);
  let educationItems = <>{generateEducations(resume.experiences.school)}</>;
  let careerItems = <>{generateCareers(resume.experiences.work)}</>;
  let quote = resume.quotes[0];

  // quotes[0]. The section key is what editMode opens under; it is not an id and
  // does not have to match one, but matching the band keeps them greppable
  // together.
  const { editor, editProps, context } = useQuoteEditor(
    "experiences",
    0,
    "Experiences"
  );

  return (
    <section className="experiences" aria-labelledby="experiences-title">
      <div className="container">
        {/* Renders nothing at all unless signed in on the admin vhost, so the
            public DOM is unchanged: no heading, no <section>, no <a>, no
            <ul>/<li> and no landmark. */}
        <Editbar context={context} editor={editor}></Editbar>
        <Titles
          id="experiences-title"
          title="Experiences"
          subtitle={quote.quote}
          by={quote.by}
          edit={editProps}
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
    </section>
  );
}
export default Experiences;
