import React from "react";
import Editfield from "../editfield/index";
import "./index.scss";

// Still a leaf: props only, no store, no network. The Experiences section owns
// the drafts, the request and the controls.
//
// `edit` is undefined on the public site and in every existing test, so
// `editing` is false, every cell renders the bare value it always did, and the
// read-mode DOM is byte-identical.
//
// FOUR CELLS, FOUR ELEMENTS THAT TAKE PHRASING CONTENT ONLY -- an <h4> and two
// <p>s. That is why Editfield's wrapper is a <span>: a <div> inside a <p> is
// invalid, React warns about it, and a real parser closes the <p> before it.
// The <li>, the <h4> and both <p>s are untouched in both modes, so the heading
// walk and the listitem counts in site/index.test.js hold with an editor open.
//
// The dates are the visible LABEL only. A work row also stores startDate,
// endDate and isCurrent, which is what the server sorts on -- they are carried
// through a save untouched but are not editable here, so editing a label never
// moves a row. See the note in components/experiences/index.js.
const Experienceitem = ({ company, dateLabel, title, body, edit }) => {
  const editing = Boolean(edit && edit.editing);

  const cell = (key, value) => {
    if (!editing || !edit[key]) return value;
    return (
      <Editfield
        id={edit[key].id}
        label={edit[key].label}
        value={edit[key].value}
        onChange={edit[key].onChange}
        readOnly={edit.readOnly}
        describedBy={edit.describedBy}
        onSubmit={edit.onSubmit}
        onCancel={edit.onCancel}
        takeFocus={edit[key].takeFocus}
      ></Editfield>
    );
  };

  return (
    <li className="experienceitem row">
      <div className="namedate column">
        <h4 className="institution bold biggertext">
          {cell("company", company)}
        </h4>
        <div className="date">{cell("dateLabel", dateLabel)}</div>
      </div>
      <div className="titlebody column">
        <p className="experiencetitle bold biggertext">{cell("title", title)}</p>
        <p className="body">{cell("body", body)}</p>
      </div>
    </li>
  );
};
export default Experienceitem;
