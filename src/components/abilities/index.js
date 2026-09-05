import React from "react";
import { useSelector } from "react-redux";
import { generateLanguages, generateTechnologies } from "../../utils/abilities";
import Itemslist from "../itemslist";
import Titles from "../titles/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import "./index.scss";

// Both ability lists are written WHOLE, never by index: the rows are re-sorted
// by star count for display, so a rendered row's position matches nothing in
// the database. server.py's LIST_SCHEMAS is the other half of that contract and
// refuses an index-addressed path outright.
const LANGUAGES = "abilities.languages";
const TECHNOLOGIES = "abilities.technologies";

function Abilities() {
  const resume = useSelector((state) => state.resume.value);

  // One editor for the whole band: the quote, its attribution, and both lists,
  // behind one Save.
  const { editor, editProps, context } = useQuoteEditor("abilities", 1, "Abilities", [
    LANGUAGES,
    TECHNOLOGIES,
  ]);

  // A list draft is built by copy-on-write, never seeded. valueOf falls through
  // to the store until something actually changes, so the "a draft only exists
  // for a path the user touched" gate survives a list edit unchanged -- there
  // is no seeded copy that could be mistaken for unsaved work, and nothing to
  // PUT over a live section if the editor is opened and closed again.
  // The order rows are PAINTED in while editing, and it is deliberately derived
  // from the STORE rather than from the draft.
  //
  // Read mode sorts by star count. Painting the draft in its stored order
  // instead meant all thirty rows reshuffled the instant you clicked Edit --
  // same rows, different order, for no reason the operator did anything about.
  // Sorting the DRAFT would fix that and reintroduce the worse problem: a row
  // would jump the moment you changed its rating, re-keying every row it passed
  // and remounting the field under the cursor.
  //
  // The store does not change while an editor is open, so ordering by it gives
  // both: the same order read mode just showed, and an order that cannot move
  // under a keystroke. It re-sorts on Save, when the response lands -- which is
  // a moment the operator caused and can see.
  //
  // Same comparator and same stability as buildAbilityRows, so equal star
  // counts keep the identical tie order.
  const displayOrder = (stored) =>
    stored.map((row, index) => index).sort((a, b) => stored[b].stars - stored[a].stars);

  const listEdit = (path, label, stored) => {
    if (!editor.editing) return undefined;
    const rows = editor.valueOf(path) || [];
    const order = displayOrder(stored);
    const change = editor.onChangeOf(path);

    // stars is coerced to a string on every write, including for rows nobody
    // touched. The document stores it as a string ("5") and LIST_SCHEMAS
    // REQUIRES a string -- so a single row left as a number by some earlier
    // hand-edit would make the whole list unsavable, with an error naming a row
    // the operator never touched and no way to fix it from the UI. Coercing
    // here turns that dead end into a save that repairs the row.
    //
    // It only ever differs from what is stored when the stored value is
    // genuinely not a string, so it cannot make an untouched list look dirty on
    // a healthy document.
    const write = (next) =>
      change(next.map((row) => ({ ...row, stars: String(row.stars) })));

    return {
      // Rows to paint, in display order but carrying DRAFT values.
      rows: order.map((storedIndex) => rows[storedIndex]),
      // `position` is where the row is painted; every write addresses its
      // index in the stored array, so an id and a write mean the same row
      // however the display is ordered.
      forRow: (position) => {
        const at = order[position];
        const row = rows[at];
        const setRow = (patch) =>
          write(rows.map((r, i) => (i === at ? { ...r, ...patch } : r)));
        return {
          editing: true,
          name: row.ability,
          stars: row.stars,
          nameId: path.replace(/\./g, "-") + "-" + at + "-abilityEdit",
          nameLabel: label + " " + (at + 1) + " name",
          onNameChange: (value) => setRow({ ability: value }),
          onStarsChange: (value) => setRow({ stars: value }),
          readOnly: editor.saving,
          describedBy: editor.describedBy,
          onSubmit: editor.save,
          onCancel: editor.closeEditor,
        };
      },
    };
  };

  const languageEdit = listEdit(LANGUAGES, "Language", resume.abilities.languages);
  const technologyEdit = listEdit(
    TECHNOLOGIES,
    "Technology",
    resume.abilities.technologies
  );

  const languages = (
    <>
      {generateLanguages(
        languageEdit ? languageEdit.rows : resume.abilities.languages,
        languageEdit
      )}
    </>
  );
  const technologies = (
    <>
      {generateTechnologies(
        technologyEdit ? technologyEdit.rows : resume.abilities.technologies,
        technologyEdit
      )}
    </>
  );

  return (
    <section className="abilities" aria-labelledby="abilities-title">
      <div className="container">
        <Editbar context={context} editor={editor}></Editbar>
        <Titles
          id="abilities-title"
          title="Abilities"
          subtitle={resume.quotes[1].quote}
          by={resume.quotes[1].by}
          edit={editProps}
        ></Titles>
        <div className="list column">
          <div className="languages">
            <Itemslist title="Languages" items={languages}></Itemslist>
          </div>
          <div className="technologies">
            <Itemslist title="Technologies" items={technologies}></Itemslist>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Abilities;
