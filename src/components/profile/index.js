import React from "react";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import useStore from "../../store";
import axios from "axios";
import "./index.scss";

function Profile() {
  const resume = useStore(
    (state) => state.resume
  );

  const updateTest = (text) => {
    axios
      .put(
        "http://localhost:5000/updateTest",
        {
          data: text,
        }
      )
      .then((response) => {
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="profile">
      <div className="container">
        <Titles
          title="Profile"
          subtitle={
            resume.profile.subtitle
          }
        ></Titles>
        <div className="info row">
          <Aboutme
            title="About Me"
            body={
              resume.profile.description
            }
          ></Aboutme>
          <Photo></Photo>
          <Details
            title="Details"
            body={resume.profile}
          ></Details>
          {/* <button
            className="btn btn-primary mt-4"
            onClick={() =>
              updateTest(
                "doing another test"
              )
            }
          >
            Update Test
          </button> */}
        </div>
      </div>
    </div>
  );
}
export default Profile;
