import React from "react";
import { useSelector } from "react-redux";
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
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

function Experiences() {
  const resume = useSelector((state) => state.resume.value);

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
      forRow: (index) => {
        const row = rows[index];
        const props = {
          editing: true,
          readOnly: editor.saving,
          describedBy: editor.describedBy,
          onSubmit: editor.save,
          onCancel: editor.closeEditor,
        };
        CELLS.forEach((cell) => {
          props[cell.key] = {
            id: prefix + "-" + index + "-" + cell.id + "Edit",
            label: label + " " + (index + 1) + " " + cell.label,
            value: row[cell.key],
            onChange: (value) =>
              write(
                rows.map((r, i) =>
                  i === index ? { ...r, [cell.key]: value } : r
                )
              ),
          };
        });
        return props;
      },
    };
  };

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
            <Itemslist title="Educations" items={educationItems}></Itemslist>
          </div>
          <div className="careers">
            <Itemslist title="Careers" items={careerItems}></Itemslist>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Experiences;
