import React from "react";
import Editfield from "../editfield/index";
import "./index.scss";

// Still a leaf: props only, no store, no network. Profile owns the draft, the
// request and the controls; this file only decides what is on screen.
//
// `edit` is undefined on the public site and in every existing test -- the only
// call src/components/site/index.test.js ever produces is
// <Aboutme title body />, via Profile -- so `editing` is false, the ternary
// below renders `body` exactly where {body} used to sit, and the rendered DOM
// is byte-identical to what it was before edit mode existed. No wrapper element
// was added and no attribute was added to an existing one.
const Aboutme = ({ title, body, edit }) => {
  const editing = Boolean(edit && edit.editing);
  return (
    <div className="aboutme">
      <h3 className="title" id="aboutmeTitle">
        {title}
      </h3>
      <div className="body collapsedtext">
        {editing ? (
          <Editfield
            id="aboutmeEdit"
            // The <h3> above is the field's accessible name, so edit mode
            // introduces no new id and cannot collide with one.
            labelledBy="aboutmeTitle"
            value={edit.value}
            onChange={edit.onChange}
            onSubmit={edit.onSubmit}
            onCancel={edit.onCancel}
            readOnly={edit.readOnly}
            describedBy={edit.describedBy}
          ></Editfield>
        ) : (
          body
        )}
      </div>
    </div>
  );
};
export default Aboutme;
