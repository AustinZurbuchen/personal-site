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
    <section className="profile" aria-labelledby="profile-title">
      <div className="container">
        <Titles
          id="profile-title"
          title="Profile"
          subtitle={resume.profile.subtitle}
        ></Titles>
        <div className="info row">
          <Aboutme title="About Me" body={resume.profile.description}></Aboutme>
          <Photo></Photo>
          <Details title="Details" body={resume.profile}></Details>
        </div>
      </div>
    </section>
  );
}
export default Profile;
