import React, { Component } from "react";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import "./index.scss";

const profileData = require("../../data/profile.json");
class Profile extends Component {
  render() {
    const body = profileData.description;
    const detailBody = {
      name: profileData.name,
      age: profileData.age,
      location: profileData.location,
    };
    return (
      <div className="profile">
        <div className="container">
          <Titles
            title="Profile"
            subtitle="Passionate Software Developer"
          ></Titles>
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
