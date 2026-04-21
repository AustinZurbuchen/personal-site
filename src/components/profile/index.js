import React from "react";
import { useSelector } from 'react-redux';
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import "./index.scss";

function Profile() {
  const resume = useSelector((state) => state.resume.value);
  
  return (
    <div className="profile">
      <div className="container">
        <Titles
          title="Profile"
          subtitle={resume.profile.subtitle}
        ></Titles>
        <div className="info row">
          <Aboutme title="About Me" body={resume.profile.description}></Aboutme>
          <Photo></Photo>
          <Details title="Details" body={resume.profile}></Details>
        </div>
      </div>
    </div>
  );
}
export default Profile;
