import React from "react";
import Abilityitem from "../components/abilityitem/index";

// One builder, two exported names -- the two functions were identical apart
// from a variable name.
//
// THE SORT IS SKIPPED WHILE EDITING, and that is not a shortcut. Read mode
// orders by star count, and key={i} keys a row by its POSITION in that order.
// Raise a row from 3 stars to 5 during an edit and it would jump to the top,
// React would re-key every row it passed, and the field the user is typing in
// would be remounted -- losing focus and the caret mid-word. Edit mode renders
// the draft in its stored order, so an index means the same row before and
// after a keystroke.
//
// The rows still SAVE in that stored order, and the next read re-sorts for
// display, so nothing about the rendered result changes once the editor closes.
const buildAbilityRows = (rows, edit) => {
  const ordered = edit
    ? rows
    : // A copy, because Array.prototype.sort mutates and the store's arrays are
      // frozen by immer. Callers used to own this copy; owning it here means a
      // caller cannot forget.
      [...rows].sort((a, b) => b.stars - a.stars);

  return ordered.map((row, index) => (
    <Abilityitem
      key={index.toString()}
      ability={row.ability}
      stars={row.stars}
      edit={edit ? edit.forRow(index) : undefined}
    ></Abilityitem>
  ));
};

export function generateLanguages(languageData, edit) {
  return buildAbilityRows(languageData, edit);
}

export function generateTechnologies(technologyData, edit) {
  return buildAbilityRows(technologyData, edit);
}

// The glyph count and the "{n} out of 5" text alternative in Abilityitem are
// computed in two different files and MUST agree. They did not: stars=7 drew 5
// glyphs but announced "7 out of 5", stars=2.5 drew 3 but announced "2.5", and
// stars=undefined announced " out of 5" — an empty accessible name. Both sides
// now normalise through here.
//
// Coerces because the database stores star counts as strings ({"stars": "4"}).
export function normalizeStars(stars) {
  const n = Math.round(Number(stars));
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, n));
}

export function generateStars(stars) {
  const filled = normalizeStars(stars);
  var starelements = [];
  for (let i = 0; i < 5; i++) {
    if (i < filled) {
      starelements.push(
        <div key={i.toString()} aria-hidden="true" style={{ color: "#46a4a0" }}>
          &#9733;
        </div>
      );
    } else {
      starelements.push(
        // Outline glyph, not a filled one: filled-vs-empty is 2.24:1 on
        // colour alone, so the state is carried by shape as well.
        <div key={i.toString()} aria-hidden="true" style={{ color: "#dfe0e0" }}>
          &#9734;
        </div>
      );
    }
  }
  return starelements;
}
