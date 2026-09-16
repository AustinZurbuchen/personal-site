import React from "react";
import Editfield from "../editfield/index";
import Editcontrol from "../editcontrol/index";
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
// The <li>, the <h4> and both <p>s are untouched in both modes.
//
// A WORK ROW HAS THREE MORE FIELDS THAN IT SHOWS. startDate, endDate and
// isCurrent are what server.py's sort_work_items orders on, and they render
// nowhere in read mode -- so before they were editable, the visible dateLabel
// could say one thing while the row sorted by another, with no way to see or
// fix the disagreement short of opening Atlas. They appear only while editing,
// only on rows that have them (school rows do not), and they are the reason a
// work row can be ADDED at all: LIST_SCHEMAS requires all seven keys.
//
// These three get VISIBLE labels while every other field on the page gets an
// aria-label. That is deliberate rather than inconsistent: the others sit under
// a heading or hold self-describing content, and these hold "2022-07" in a box
// that would otherwise explain nothing -- least of all on a new row, where it
// is empty.
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

  // Named by the <label> beside it rather than by an aria-label, so the visible
  // text and the accessible name are the same string by construction.
  const dateCell = (key, text) => (
    <div className="sortkey">
      <label className="sortkeylabel" id={edit[key].id + "Label"} htmlFor={edit[key].id}>
        {text}
      </label>
      <Editfield
        id={edit[key].id}
        labelledBy={edit[key].id + "Label"}
        value={edit[key].value}
        onChange={edit[key].onChange}
        readOnly={edit.readOnly}
        describedBy={edit.describedBy}
        onSubmit={edit.onSubmit}
        onCancel={edit.onCancel}
      ></Editfield>
    </div>
  );

  return (
    <li className="experienceitem row">
      <div className="namedate column">
        <h4 className="institution bold biggertext">
          {cell("company", company)}
        </h4>
        <div className="date">{cell("dateLabel", dateLabel)}</div>

        {editing && edit.startDate && (
          <div className="sortkeys">
            {/* Not a heading: site/index.test.js walks heading levels and a
                fifth level here would jump from the h4 above. */}
            <p className="sortkeynote">Sort order only — not shown on the page.</p>
            {dateCell("startDate", "Start (YYYY-MM)")}
            {dateCell("endDate", "End (YYYY-MM)")}
            <label className="sortkeycurrent">
              {/* A real checkbox. isCurrent is a boolean in the document and
                  LIST_SCHEMAS refuses an int 1 for it, because sort_work_items
                  branches on truthiness and a stray 1 would work right up until
                  someone stored "0", which is truthy. */}
              <input
                type="checkbox"
                id={edit.isCurrent.id}
                checked={Boolean(edit.isCurrent.value)}
                // aria-disabled and a guarded handler, NOT the disabled
                // attribute -- the same rule Editcontrol states and for the same
                // reason: a disabled control is blurred by the browser and
                // dropped from the tab order, so going disabled mid-save would
                // throw a keyboard user out of the row they are standing in.
                aria-disabled={edit.readOnly ? "true" : undefined}
                onChange={(event) => {
                  if (edit.readOnly) return;
                  edit.isCurrent.onChange(event.target.checked);
                }}
              />
              Current role
            </label>
          </div>
        )}
      </div>
      <div className="titlebody column">
        <p className="experiencetitle bold biggertext">{cell("title", title)}</p>
        <p className="body">{cell("body", body)}</p>
        {editing && edit.remove && (
          <div className="rowcontrols">
            <Editcontrol
              label={edit.remove.label}
              context={edit.remove.context}
              disabled={edit.remove.disabled}
              onClick={edit.remove.onClick}
            ></Editcontrol>
            {edit.remove.note ? (
              <p className="rowcontrolnote">{edit.remove.note}</p>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
};
export default Experienceitem;
