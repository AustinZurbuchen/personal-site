import React from "react";
import ExperienceItem from "../components/experienceitem/index";

const experiences = require("../data/experiences.json");
export function generateEducations() {
  let educations = experiences[0];
  let educationComponents = [];

  for (let education of educations) {
    educationComponents.push(
      <ExperienceItem
        institution={education.institution}
        date={education.date}
        title={education.title}
        body={education.body}
      ></ExperienceItem>
    );
  }
  return educationComponents;
}

export function generateCareers() {
  let careers = experiences[1];
  let careerComponents = [];

  for (let career of careers) {
    careerComponents.push(
      <ExperienceItem
        institution={career.institution}
        date={career.date}
        title={career.title}
        body={career.body}
      ></ExperienceItem>
    );
  }
  return careerComponents;
}
