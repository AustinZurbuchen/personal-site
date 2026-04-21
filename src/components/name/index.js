import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@mui/material";
import { toggle } from "../../reducers/editMode";
import "./index.scss";

function Name() {
  const resume = useSelector((state) => state.resume.value);
  const dispatch = useDispatch();

  return (
    <div className="nameContainer">
      {/* <Button className="edit-button-top-right" variant="contained" onClick={() => dispatch(toggle())}>Edit</Button> */}
      <div className="name"> {resume.profile.name} </div>
      <div className="subText"> Resume </div>
    </div>
  );
}
export default Name;
