import React, { Component } from "react";
import Titles from "../titles/index";
import Experiencelist from "../experiencelist/index";
import Experienceitem from "../experienceitem/index";
import "./index.scss";

class Experiences extends Component {
  render() {
    let educations = [
      <Experienceitem
        institution="institution"
        date="startdate - enddate"
        title="title"
        body="body body body body body body body body body body body body body body body body body body body"
      ></Experienceitem>,
      <Experienceitem
        institution="institution"
        date="startdate - enddate"
        title="title"
        body="body body body body body body body body body body body body body body body body body body body"
      ></Experienceitem>,
      <Experienceitem
        institution="institution"
        date="startdate - enddate"
        title="title"
        body="body body body body body body body body body body body body body body body body body body body"
      ></Experienceitem>,
    ];
    let educationItems = <>{educations}</>;
    let careers = [
      <Experienceitem
        institution="institution"
        date="startdate - enddate"
        title="title"
        body="body body body body body body body body body body body body body body body body body body body"
      ></Experienceitem>,
      <Experienceitem
        institution="institution"
        date="startdate - enddate"
        title="title"
        body="body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body body"
      ></Experienceitem>,
      <Experienceitem
        institution="institution"
        date="startdate - enddate"
        title="title"
        body="body body body body body body body body body body body body body body body body body body body"
      ></Experienceitem>,
    ];
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
              title="careers"
              items={careerItems}
            ></Experiencelist>
          </div>
        </div>
      </div>
    );
  }
}
export default Experiences;
