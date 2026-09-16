import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import { blankRowFor, canAddRow, canRemoveRow, MAX_ROWS } from "../../utils/listRows";
import { generateEducations, generateCareers } from "../../utils/experiences";
import "./index.scss";

// Both experience lists are written WHOLE, never by index -- server.py sorts
// `work` in public_view() before the client ever sees it, so a rendered row's
// position is a position in the SORTED array and matches nothing stored.
// LIST_SCHEMAS is the other half of that contract and refuses an
// index-addressed path outright.
const SCHOOL = "experiences.school";
const WORK = "experiences.work";

// The four fields a row shows, in the order they are painted.
//
// NONE of them takes focus. The band's quote field already does, and it is
// first in document order; claiming it here too would put two fields in the
// race and hand it to whichever mounted last -- which is the bug that used to
// land the caret in the footer's GitHub URL. Same reason the ability rows do
// not claim it either.
const CELLS = [
  { key: "company", id: "company", label: "institution" },
  { key: "dateLabel", id: "dateLabel", label: "dates" },
  { key: "title", id: "title", label: "title" },
  { key: "body", id: "body", label: "description" },
];

// The three keys a WORK row carries and never shows: what sort_work_items
// orders on. Offered only for rows that already have them, so a school row --
// whose schema is the four above and nothing else -- cannot grow a key
// LIST_SCHEMAS would refuse as "unexpected".
//
// isCurrent is separate because it is a boolean, and the document stores it as
// one. LIST_SCHEMAS refuses an int for it on purpose.
const SORT_CELLS = [
  { key: "startDate", id: "startDate" },
  { key: "endDate", id: "endDate" },
];
const FLAG_CELL = { key: "isCurrent", id: "isCurrent" };

function Experiences() {
  const resume = useSelector((state) => state.resume.value);

  // Which freshly-added row should take the caret, as "<path>:<index>". View
  // state, deliberately not a draft: it decides where focus goes, never what is
  // saved, so it must not participate in dirtiness.
  const [focusRow, setFocusRow] = useState(null);

  // One editor for the whole band: the quote, its attribution, and both lists,
  // behind one Save.
  const { editor, editProps, context } = useQuoteEditor("experiences", 0, "Experiences", [
    SCHOOL,
    WORK,
  ]);

  // Copy-on-write, never seeded: valueOf falls through to the store until
  // something actually changes, so a list draft exists only for a path the
  // operator touched.
  //
  // The spread carries EVERY key through, which matters more here than for the
  // abilities. A work row also stores startDate, endDate and isCurrent -- the
  // keys the server sorts on and LIST_SCHEMAS requires -- and none of them is
  // editable. Rebuilding a row from the four visible fields instead would drop
  // them, and the write would be refused for a row the operator never touched.
  //
  // The consequence worth knowing: editing a dateLabel changes the words under
  // a company name and does NOT move the row, because the sort keys are
  // separate and untouched. That is the honest behaviour for a free-text label,
  // but it does mean a label and its dates can drift apart.
  const listEdit = (path, label) => {
    if (!editor.editing) return undefined;
    const rows = editor.valueOf(path) || [];
    const write = editor.onChangeOf(path);
    const prefix = path.replace(/\./g, "-");

    return {
      rows,
      // Appended, never inserted: `work` is re-sorted by the server on the next
      // read anyway, and `school` has no sort at all, so a new row at the end is
      // where the operator just looked for it.
      add: {
        label: "Add",
        context: label.toLowerCase(),
        disabled: !canAddRow(rows),
        note: canAddRow(rows)
          ? null
          : "At the " + MAX_ROWS + "-row limit the server enforces.",
        onClick: () => {
          if (!canAddRow(rows)) return;
          write(rows.concat([blankRowFor(path)]));
          // The new row is last, so its first field is the one to land in.
          setFocusRow(path + ":" + rows.length);
        },
      },
      forRow: (index) => {
        const row = rows[index];
        const props = {
          editing: true,
          readOnly: editor.saving,
          describedBy: editor.describedBy,
          onSubmit: editor.save,
          onCancel: editor.closeEditor,
          remove: {
            // The server refuses an empty list, so the last row cannot go.
            // Saying why beats a control that fails: wiping a whole section
            // stays a deliberate database operation.
            disabled: !canRemoveRow(rows),
            label: canRemoveRow(rows)
              ? "Remove"
              : "Remove",
            // The row's company, not its index -- see the note in
            // components/abilities/index.js. A blank row falls back to its
            // position.
            context:
              row.company && row.company.trim()
                ? row.company
                : label + " " + (index + 1),
            note: canRemoveRow(rows) ? null : "The last row cannot be removed.",
            onClick: () => {
              if (!canRemoveRow(rows)) return;
              write(rows.filter((_, i) => i !== index));
            },
          },
        };
        const setKey = (key, value) =>
          write(rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

        CELLS.forEach((cell) => {
          props[cell.key] = {
            id: prefix + "-" + index + "-" + cell.id + "Edit",
            label: label + " " + (index + 1) + " " + cell.label,
            value: row[cell.key],
            onChange: (value) => setKey(cell.key, value),
            // Only the first cell of a row just added by this operator, so the
            // caret lands where they are about to type. Cleared once used, or
            // it would steal focus again on the next render.
            takeFocus:
              cell.key === "company" && focusRow === path + ":" + index,
          };
        });

        // Gated on the ROW, not on the path: a row is offered these only if it
        // already carries them, which is the same question LIST_SCHEMAS asks.
        // Keying off `path === WORK` instead would let a school row grow keys
        // the server would then refuse as unexpected.
        if (Object.prototype.hasOwnProperty.call(row, FLAG_CELL.key)) {
          SORT_CELLS.forEach((cell) => {
            props[cell.key] = {
              id: prefix + "-" + index + "-" + cell.id + "Edit",
              value: row[cell.key],
              onChange: (value) => setKey(cell.key, value),
            };
          });
          props[FLAG_CELL.key] = {
            id: prefix + "-" + index + "-" + FLAG_CELL.id + "Edit",
            value: row[FLAG_CELL.key],
            // Boolean straight through, never String(): the schema requires a
            // real bool and refuses anything else.
            onChange: (value) => setKey(FLAG_CELL.key, Boolean(value)),
          };
        }
        return props;
      },
    };
  };

  // Cleared when the editor closes, so reopening does not yank focus into
  // whatever row was added last time.
  useEffect(() => {
    if (!editor.editing) setFocusRow(null);
  }, [editor.editing]);

  const schoolEdit = listEdit(SCHOOL, "Education");
  const workEdit = listEdit(WORK, "Career");

  const educationItems = (
    <>
      {generateEducations(
        schoolEdit ? schoolEdit.rows : resume.experiences.school,
        schoolEdit
      )}
    </>
  );
  const careerItems = (
    <>
      {generateCareers(workEdit ? workEdit.rows : resume.experiences.work, workEdit)}
    </>
  );

  return (
    <section className="experiences" aria-labelledby="experiences-title">
      <div className="container">
        <Editbar context={context} editor={editor}></Editbar>
        <Titles
          id="experiences-title"
          title="Experiences"
          subtitle={resume.quotes[0].quote}
          by={resume.quotes[0].by}
          edit={editProps}
        ></Titles>
        <div className="info column">
          <div className="educations">
            <Itemslist
              title="Educations"
              items={educationItems}
              add={schoolEdit ? schoolEdit.add : undefined}
            ></Itemslist>
          </div>
          <div className="careers">
            <Itemslist
              title="Careers"
              items={careerItems}
              add={workEdit ? workEdit.add : undefined}
            ></Itemslist>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Experiences;
