import React, { useRef } from "react";
import { normalizeStars } from "../../utils/abilities";
import "./index.scss";

// The editable counterpart of generateStars: five buttons where read mode draws
// five glyphs. Presentational -- props only, no store, no network.
//
// A RADIOGROUP, not five toggle buttons. A rating is a pick-one-of-five, which
// is what radio semantics say and what aria-pressed does not: five pressed
// buttons announce five independent on/off controls and never state the current
// value as a single fact.
//
// The roving tabindex is the reason for the role rather than a decoration on
// top of it. The Abilities band renders thirty rows; five individually tabbable
// buttons per row would be a hundred and fifty tab stops between the top of the
// editor and the Save button. A radiogroup is ONE stop, and the arrow keys move
// within it -- which is also what a screen-reader user is told to expect the
// moment the role is announced.
//
// The glyphs stay aria-hidden and keep the shape difference (filled U+2605 vs
// outline U+2606) that read mode relies on: #46a4a0 against #dfe0e0 is 2.24:1,
// so the state cannot be carried by colour.
const STARS = [1, 2, 3, 4, 5];

const Starrating = ({ ability, value, onChange, readOnly = false, describedBy }) => {
  const buttons = useRef([]);
  const selected = normalizeStars(value);

  const choose = (next) => {
    if (readOnly) return;
    const clamped = Math.min(5, Math.max(1, next));
    if (onChange) onChange(String(clamped));
    // Focus follows the selection, because the roving tabindex moves with it --
    // leaving focus on a button that has just become tabIndex={-1} strands the
    // keyboard user on an element the next Tab will not return to.
    const node = buttons.current[clamped - 1];
    if (node) node.focus();
  };

  const onKeyDown = (event) => {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowUp") {
      event.preventDefault();
      choose(selected + 1);
    } else if (key === "ArrowLeft" || key === "ArrowDown") {
      event.preventDefault();
      choose(selected - 1);
    } else if (key === "Home") {
      event.preventDefault();
      choose(1);
    } else if (key === "End") {
      event.preventDefault();
      choose(5);
    }
  };

  return (
    <div
      className="stars starsediting"
      role="radiogroup"
      // The row's own name, so thirty of these are not thirty identical
      // "Rating" groups.
      aria-label={"Rating for " + (ability || "this ability")}
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
    >
      {STARS.map((n) => (
        <button
          key={n.toString()}
          type="button"
          role="radio"
          // aria-checked marks the ONE selected star; the fill runs 1..selected,
          // so the colour needs its own class. Conflating them would paint only
          // the last star teal.
          className={
            "starbutton" + (n <= selected ? " starbuttonfilled" : "")
          }
          ref={(node) => {
            buttons.current[n - 1] = node;
          }}
          aria-checked={n === selected ? "true" : "false"}
          // Exactly one button in the group is tabbable. With no rating yet
          // (normalizeStars gives 0 for a missing or unparseable value) the
          // first one takes the stop, or the group would be unreachable.
          tabIndex={n === selected || (selected === 0 && n === 1) ? 0 : -1}
          aria-label={n === 1 ? "1 star" : n + " stars"}
          // readOnly is a save in flight. aria-disabled rather than disabled,
          // for the same reason Editcontrol gives: a disabled control is blurred
          // and dropped from the tab order, so going disabled mid-save would
          // throw a keyboard user out of the group they are standing in.
          aria-disabled={readOnly ? "true" : undefined}
          onClick={() => choose(n)}
        >
          <span aria-hidden="true">{n <= selected ? "★" : "☆"}</span>
        </button>
      ))}
    </div>
  );
};
export default Starrating;
