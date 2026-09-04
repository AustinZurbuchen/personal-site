import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@mui/material";
import { toggle } from "../../reducers/editMode";
import "./index.scss";

function Name() {
  const resume = useSelector((state) => state.resume.value);
  const dispatch = useDispatch();
  // The edit flow is unfinished, so the control stays unrendered. Previously it
  // shipped a literal "hidden" class, which put a display:none button in the
  // markup that nothing could ever reveal.
  const showEdit = false;

  return (
    <header className="nameContainer">
      {showEdit && (
        <Button
          className="edit-button-top-right"
          variant="contained"
          onClick={() => dispatch(toggle())}
        >
          Edit
        </Button>
      )}
      <h1 className="name"> {resume.profile.name} </h1>
      <div className="subText"> Resume </div>
    </header>
  );
}
export default Name;
