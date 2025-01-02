import React, { useState } from "react";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import useStore from "../../store";
import axios from "axios";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import "./index.scss";

function Profile() {
  const resume = useStore(
    (state) => state.resume
  );
  let [ showEditButton, setShowEditButton ] = useState(false);

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
    <div className="profile relative">
      {showEditButton && (
        <div className="absolute top-4 right-4">
          <button
            className="btn btn-circle"
            onClick={() => console.log(showEditButton)}
          >
            <PencilSquareIcon className="size-6" />
          </button>
        </div>
      )}
      <div className="container">
        <Titles
          title="Profile"
          subtitle={
            resume.profile.subtitle
          }
        />
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
        </div>
      </div>
    </div>
  );
}
export default Profile;
