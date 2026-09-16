import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { generateLanguages, generateTechnologies } from "../../utils/abilities";
import Itemslist from "../itemslist";
import Titles from "../titles/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import { blankRowFor, canAddRow, canRemoveRow, MAX_ROWS } from "../../utils/listRows";
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
  const sortedIndexes = (stored) =>
    stored.map((row, index) => index).sort((a, b) => stored[b].stars - stored[a].stars);

  // ADD AND REMOVE HAVE TO MAINTAIN THIS MAPPING, which is why it is state and
  // not a pure function of the store any more.
  //
  // The mapping is display position -> index in the draft array. Deriving it
  // from the store worked only while the draft was a same-length, same-order
  // copy: append a row and the store has no position for it; remove row k and
  // every draft index above k shifts down, so a store-derived mapping points at
  // the wrong rows and the list scrambles. Both are maintained explicitly
  // below.
  //
  // View state, deliberately not a draft: it decides what order rows are
  // painted in, never what is saved, so it must not participate in dirtiness.
  const [order, setOrder] = useState({});
  const [focusRow, setFocusRow] = useState(null);

  // Rebuilt when the editor opens, and again when the STORE changes -- which
  // during an edit happens only on a successful save, where the server has just
  // re-sorted and the drafts have been cleared. A keystroke changes the draft,
  // not the store, so it cannot rebuild this and move a row under the cursor.
  useEffect(() => {
    if (!editor.editing) {
      setFocusRow(null);
      return;
    }
    setOrder({
      [LANGUAGES]: sortedIndexes(resume.abilities.languages),
      [TECHNOLOGIES]: sortedIndexes(resume.abilities.technologies),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.editing, resume.abilities.languages, resume.abilities.technologies]);

  const listEdit = (path, label, stored) => {
    if (!editor.editing) return undefined;
    const rows = editor.valueOf(path) || [];
    const change = editor.onChangeOf(path);

    // A desync here would silently drop or duplicate rows on screen, so the
    // mapping is checked rather than trusted: anything that does not describe
    // exactly this many rows falls back to draft order, which is always valid.
    const stale = order[path];
    const order_ = Array.isArray(stale) && stale.length === rows.length
      ? stale
      // The effect below runs AFTER the first render, so without a correct
      // fallback the list paints one frame in STORED order and then snaps to
      // star order -- thirty rows flicking past on every open. Recomputed here
      // instead, which is also the right answer whenever the mapping is missing
      // or stale for any other reason.
      //
      // Only while the draft still has the store's shape. Once a row has been
      // added or removed the store has no position for it, and draft order is
      // the only order that is certainly valid.
      : rows.length === stored.length
      ? sortedIndexes(stored)
      : rows.map((row, index) => index);

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
      rows: order_.map((draftIndex) => rows[draftIndex]),
      add: {
        label: "Add",
        context: label.toLowerCase(),
        disabled: !canAddRow(rows),
        note: canAddRow(rows)
          ? null
          : "At the " + MAX_ROWS + "-row limit the server enforces.",
        onClick: () => {
          if (!canAddRow(rows)) return;
          const at = rows.length;
          write(rows.concat([blankRowFor(path)]));
          // Appended to the mapping so the new row paints LAST rather than
          // wherever its (absent) star rating would have placed it.
          setOrder({ ...order, [path]: order_.concat([at]) });
          setFocusRow(path + ":" + at);
        },
      },
      // `position` is where the row is painted; every write addresses its
      // index in the stored array, so an id and a write mean the same row
      // however the display is ordered.
      forRow: (position) => {
        const at = order_[position];
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
          takeFocus: focusRow === path + ":" + at,
          remove: {
            disabled: !canRemoveRow(rows),
            label: "Remove",
            // The ROW'S NAME, not its index. `at` is the position in the
            // stored array, so on a star-sorted list the third row on screen
            // announced itself as "Remove Language 6" -- a number matching
            // nothing the operator can see. A display position would be no
            // better once the list re-sorts on save. The name is what they
            // recognise; a blank row falls back to where it currently sits.
            context:
              row.ability && row.ability.trim()
                ? row.ability
                : label + " " + (position + 1),
            note: canRemoveRow(rows) ? null : "The last row cannot be removed.",
            onClick: () => {
              if (!canRemoveRow(rows)) return;
              write(rows.filter((r, i) => i !== at));
              // Every draft index above the removed one shifts down by one, so
              // the mapping shifts with it. Without this the list keeps
              // pointing at the old positions and rows appear to scramble.
              setOrder({
                ...order,
                [path]: order_
                  .filter((i) => i !== at)
                  .map((i) => (i > at ? i - 1 : i)),
              });
            },
          },
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
            <Itemslist
              title="Languages"
              items={languages}
              add={languageEdit ? languageEdit.add : undefined}
            ></Itemslist>
          </div>
          <div className="technologies">
            <Itemslist
              title="Technologies"
              items={technologies}
              add={technologyEdit ? technologyEdit.add : undefined}
            ></Itemslist>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Abilities;
