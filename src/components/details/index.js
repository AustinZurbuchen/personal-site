import React from "react";
import Editfield from "../editfield/index";
import "./index.scss";

// Still a leaf: props only, no store, no network. Profile owns the drafts, the
// request and the controls.
//
// `edit` is undefined on the public site and in every existing test, so
// `editing` is false, each cell renders exactly the bare value it always did,
// and the public DOM is byte-identical. No wrapper element was added and no
// attribute was added to an existing one.
//
// THE FIELDS GO INSIDE THE <dd>s, never in place of the <dl>. The definition
// list is the whole accessibility story of this block -- site/index.test.js
// pins the dt/dd pairing and the order of the three definitions -- so edit mode
// keeps every one of those elements and only changes what sits in the cell.
//
// profile.name is the one value on this page that renders TWICE: here, and as
// the <h1> in components/name/. It is editable HERE rather than in the hero,
// deliberately. The h1 is the single strongest structural invariant the suite
// has (exactly one, and its text is profile.name); turning it into a field even
// briefly would perturb it, and this band already owns an editor. The hero goes
// on showing the SAVED name while you type, and repaints from the server's
// response on Save -- which is honest, since that is what is stored.
const Details = ({ title, body, edit }) => {
  const { name, age, location } = body;
  const editing = Boolean(edit && edit.editing);

  // Save/Escape/readOnly/describedBy belong to the SECTION's save, not to one
  // cell, so all three fields get the same ones.
  const cell = (key, value) => {
    if (!editing || !edit[key]) return value;
    return (
      <Editfield
        id={edit[key].id}
        // aria-label rather than pointing at the <dt>: naming it by the term
        // would mean giving all three <dt>s ids, which are public DOM the
        // read-only site would then carry for no reason. The label is the same
        // word the <dt> shows, so the visible and accessible names agree.
        label={edit[key].label}
        value={edit[key].value}
        onChange={edit[key].onChange}
        readOnly={edit.readOnly}
        describedBy={edit.describedBy}
        onSubmit={edit.onSubmit}
        onCancel={edit.onCancel}
      ></Editfield>
    );
  };

  return (
    <div className="details">
      <h3 className="title" id="detailsTitle">
        {title}
      </h3>
      <dl className="body spreadtext">
        <dt className="bodyTitle bold">Name:</dt>
        <dd className="bodyContent">{cell("name", name)}</dd>
        <dt className="bodyTitle bold">Age:</dt>
        <dd className="bodyContent">{cell("age", age)}</dd>
        <dt className="bodyTitle bold">Location:</dt>
        <dd className="bodyContent">{cell("location", location)}</dd>
      </dl>
    </div>
  );
};
export default Details;
