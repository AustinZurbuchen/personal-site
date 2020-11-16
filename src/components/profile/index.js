import React, { Component } from "react";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import "./index.scss";

class Profile extends Component {
  render() {
    const body =
      "I am a Front End Developer who focuses on writing clean, elegant and efficient code. I am experienced with the latest front end technologies such as Angular, React, and back end technologies such as NodeJS, etc. Worked with teams of several sizes ranging from 3 - 15 developers.";
    const detailBody = {
      name: "Austin Zurbuchen",
      age: "25 years",
      location: "Santa Clara, California",
    };
    return (
      <div className="profile">
        <div className="container">
          <Titles title="Profile" subtitle="Software Developer"></Titles>
          <div className="info row">
            <Aboutme title="About Me" body={body}></Aboutme>
            <Photo></Photo>
            <Details title="Details" body={detailBody}></Details>
          </div>
        </div>
      </div>
    );
  }
}
export default Profile;
