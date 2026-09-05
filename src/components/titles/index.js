import React from "react";
import Editfield from "../editfield/index";
import "./index.scss";

// Still a leaf: props only, no store, no network. The section that renders this
// owns the drafts, the request and the controls.
//
// This one component paints FOUR things, not three: the quote in Experiences
// (quotes[0]), Abilities (quotes[1]) and the footer (quotes[2]), plus the
// Profile band's subtitle, which passes no `by` at all. So the edit prop cannot
// assume a quote/attribution pair exists -- `edit.by` is optional and Profile
// simply never supplies it.
//
// `edit` is undefined on the public site and in every existing test, so
// `editing` is false, both ternaries below render exactly what they rendered
// before, and the public DOM is byte-identical to what it was before edit mode
// existed. No wrapper element was added and no attribute was added to an
// existing one.
//
// THE ONE STRUCTURAL DIFFERENCE FROM READ MODE, and it is deliberate: read mode
// drops the attribution element entirely when `by` is empty, but edit mode
// always renders its field. Gating the field on the same truthiness would make
// an attribution you had just cleared impossible to type back in -- the control
// needed to fix the mistake would be removed by the mistake.
const Titles = ({ title, subtitle, by, id, edit }) => {
  const editing = Boolean(edit && edit.editing);

  // Save/Escape/readOnly/describedBy are properties of the SECTION's save, not
  // of one field, so both fields get the same ones.
  const shared = editing
    ? {
        readOnly: edit.readOnly,
        describedBy: edit.describedBy,
        onSubmit: edit.onSubmit,
        onCancel: edit.onCancel,
      }
    : null;

  return (
    // The editing class exists only to undo .by's -40px pull, which is tuned to
    // a 40px line of plain text and lands on a field's bottom border instead.
    // See index.scss.
    <div className={editing ? "titles titlesediting" : "titles"}>
      <h2 className="title" id={id}>
        {title}
      </h2>

      <div className="subtitle">
        {editing && edit.subtitle ? (
          <Editfield
            id={edit.subtitle.id}
            // No labelledBy: the only heading above these fields is the band's
            // <h2> ("Experiences"), which would give BOTH fields the same
            // accessible name. Editfield falls back to aria-label when
            // labelledBy is absent, so each field is named for what it holds.
            label={edit.subtitle.label}
            value={edit.subtitle.value}
            onChange={edit.subtitle.onChange}
            // The quote, never the attribution below it.
            takeFocus={edit.takeFocus}
            {...shared}
          ></Editfield>
        ) : (
          subtitle
        )}
      </div>

      {editing && edit.by ? (
        <div className="subtitle by">
          <Editfield
            id={edit.by.id}
            label={edit.by.label}
            value={edit.by.value}
            onChange={edit.by.onChange}
            {...shared}
          ></Editfield>
        </div>
      ) : by ? (
        <div className="subtitle by">{by}</div>
      ) : null}
    </div>
  );
};
export default Titles;
