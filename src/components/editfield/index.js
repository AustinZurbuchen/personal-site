import React, { useEffect, useRef } from "react";
import "./index.scss";

// One editable string: a native <textarea>, no library and no contenteditable.
// contenteditable would let pasted markup into a field the API stores, and
// returns, as a plain string.
//
// Presentational leaf: props only, no Redux, no network.
//
// `font: inherit` in the stylesheet is the point of the whole component -- the
// glyphs do not move when the mode flips, because family, size, weight and
// line-height all arrive from the paragraph this replaced.
//
// THE WRAPPER IS LOAD-BEARING, not decoration. A textarea contributes nothing
// to intrinsic width: `width: 100%` is a percentage, and percentages do not
// participate in max-content sizing. .container is a shrink-to-fit flex item,
// so with a bare textarea inside it the whole band collapsed -- measured at
// 1170px -> 759px, taking the three profile columns from 267px to 132px each.
// The paragraph it replaced had text, and text has an intrinsic width.
//
// A <span>, not a <div>, and that is a correctness constraint rather than a
// preference: the experience rows put fields inside an <h4> and two <p>s, all of
// which take PHRASING content only. A <div> there is invalid, React warns, and a
// real HTML parser would close the <p> before it. The span carries display:grid
// from the stylesheet, so the layout is identical.
//
// So the wrapper is a 1x1 grid carrying the same string in a hidden ::after.
// The pseudo element gives the wrapper real intrinsic width AND height; the
// textarea sits in the same grid cell and overlays it. The band keeps its
// width, and the field grows with its content instead of being pinned to a
// fixed row count.
const Editfield = ({
  id,
  labelledBy,
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  readOnly = false,
  describedBy,
  // Named takeFocus rather than autoFocus so it cannot be mistaken for the DOM
  // attribute of that name, which React would also honour.
  takeFocus = false,
  // Mirrors MAX_FIELD_LENGTH in personal-site-py/server.py. Duplicated on
  // purpose: the server is still the authority and still answers
  // validation_failed; this only saves a round trip that could not succeed.
  maxLength = 4000,
}) => {
  const field = useRef(null);

  // Focus follows the mode change, with the caret at the END -- not a
  // select-all, so the first keystroke appends rather than silently replacing
  // the whole paragraph.
  //
  // OPT-IN, and it did not used to be. Every mounted field called focus(), so
  // with more than one field open the LAST one in document order won by simply
  // running last -- which is why opening the footer editor put the caret in the
  // GitHub URL rather than the quote. Harmless with one field, arbitrary with
  // five, and actively hostile with a list editor that mounts four fields per
  // row. The section now names the one field worth landing in.
  useEffect(() => {
    if (!takeFocus) return;
    const node = field.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    if (typeof node.setSelectionRange === "function") {
      node.setSelectionRange(end, end);
    }
  }, [takeFocus]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && onCancel) {
      onCancel();
      return;
    }
    // Enter has to stay literal inside a textarea, so the save shortcut takes a
    // modifier.
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && onSubmit) {
      event.preventDefault();
      onSubmit();
    }
  };

  const text = value ?? "";

  return (
    // The trailing space in data-value matters: without it a value ending in a
    // newline measures one line short, and the field jumps as you press Enter
    // at the end.
    <span className="editfieldwrap" data-value={text + " "}>
      <textarea
        ref={field}
        id={id}
        className="editfield"
        value={text}
        // ONE row, not the HTML default of two. The wrapper is a 1x1 grid and
        // the cell takes the taller of its two occupants, so a textarea left at
        // rows="2" imposes a two-line floor: a one-line Name or Age field
        // measured 74px against the mirror's correct 46px, and sat in a box
        // twice the height of its content. Latent until a field shorter than
        // two lines existed -- About Me and the quotes are both longer, so the
        // floor never bound.
        //
        // The mirror is what sizes the field; this just stops the control
        // arguing with it.
        rows={1}
        maxLength={maxLength}
        // readOnly, never disabled, for the length of a save. A disabled
        // control is blurred by the browser and dropped from the tab order, so
        // going disabled mid-request would throw a keyboard user out of the
        // field they are typing in. readOnly blocks typing without moving the
        // caret.
        readOnly={readOnly}
        // Named by the sub-heading that already sits above it (#aboutmeTitle),
        // so edit mode introduces no new id and cannot collide with one.
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        aria-describedby={describedBy}
        onChange={(event) => onChange && onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </span>
  );
};
export default Editfield;
