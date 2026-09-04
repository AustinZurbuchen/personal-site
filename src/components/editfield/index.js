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
  rows = 8,
  // Mirrors MAX_FIELD_LENGTH in personal-site-py/server.py. Duplicated on
  // purpose: the server is still the authority and still answers
  // validation_failed; this only saves a round trip that could not succeed.
  maxLength = 4000,
}) => {
  const field = useRef(null);

  // Focus follows the mode change, with the caret at the END -- not a
  // select-all, so the first keystroke appends rather than silently replacing
  // the whole paragraph.
  useEffect(() => {
    const node = field.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    if (typeof node.setSelectionRange === "function") {
      node.setSelectionRange(end, end);
    }
  }, []);

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

  return (
    <textarea
      ref={field}
      id={id}
      className="editfield"
      value={value ?? ""}
      rows={rows}
      maxLength={maxLength}
      // readOnly, never disabled, for the length of a save. A disabled control
      // is blurred by the browser and dropped from the tab order, so going
      // disabled mid-request would throw a keyboard user out of the field they
      // are typing in. readOnly blocks typing without moving the caret.
      readOnly={readOnly}
      // Named by the sub-heading that already sits above it (#aboutmeTitle), so
      // edit mode introduces no new id and cannot collide with one.
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      aria-describedby={describedBy}
      onChange={(event) => onChange && onChange(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
};
export default Editfield;
