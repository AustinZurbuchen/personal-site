import React from "react";
import "./index.scss";

// The one button shape edit mode uses: Edit, Save, Cancel, Done and Sign out
// are all this component with a different label.
//
// A TEXT button, not an icon. The site ships no icon set, so a glyph here would
// be the only one in the app -- and would still need a text alternative.
//
// A <button>, never an <a>: src/components/site/index.test.js asserts exactly
// three anchors excluding the skip link, and asserts nothing at all about
// buttons.
//
// aria-disabled, NEVER the `disabled` attribute. A disabled button is blurred
// by the browser and dropped from the tab order, so the keyboard user who has
// just pressed Save would be dumped on <body> the instant the save cleaned the
// draft and dimmed the control. This one stays focusable, announces
// "unavailable", and its handler returns early. Callers re-check their own
// preconditions anyway rather than trusting the paint.
//
// It sets no position and no margin: whoever renders it places it.
const Editcontrol = ({ label, context, disabled = false, dark = false, onClick }) => {
  return (
    <button
      type="button"
      className={dark ? "editcontrol editcontroldark" : "editcontrol"}
      aria-disabled={disabled ? "true" : undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        if (onClick) onClick(event);
      }}
    >
      {label}
      {/* "Save" alone names nothing once there is more than one section on the
          page, and a screen-reader user listing buttons hears only the label.
          .visually-hidden, not .hidden -- .hidden is display:none and would
          take this out of the accessibility tree, which is the opposite of the
          intent. */}
      {context ? <span className="visually-hidden"> {context}</span> : null}
    </button>
  );
};
export default Editcontrol;
