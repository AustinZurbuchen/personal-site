import React from "react";
import ExperienceItem from "../components/experienceitem/index";

// const experiences = require("../data/experiences.json");
export function generateEducations(educations) {
  // let educations = experiences[0];
  let educationComponents = [];

  let i = 0;
  for (let education of educations) {
    educationComponents.push(
      <ExperienceItem
        key={i.toString()}
        company={education.company}
        dateLabel={education.dateLabel}
        title={education.title}
        body={education.body}
      ></ExperienceItem>,
    );
    i++;
  }
  return educationComponents;
}

export function generateCareers(careers) {
  // let careers = experiences[1];
  let careerComponents = [];

  let i = 0;
  for (let career of careers) {
    careerComponents.push(
      <ExperienceItem
        key={i.toString()}
        company={career.company}
        dateLabel={career.dateLabel}
        title={career.title}
        body={career.body}
      ></ExperienceItem>,
    );
    i++;
  }
  return careerComponents;
}
