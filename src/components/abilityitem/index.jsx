import React from "react";
import { generateStars, normalizeStars } from "../../utils/abilities";
import Editfield from "../editfield/index";
import Starrating from "../starrating/index";
import Editcontrol from "../editcontrol/index";
import "./index.scss";

// Still a leaf: props only, no store, no network. The Abilities section owns
// the drafts, the request and the controls.
//
// `edit` is undefined on the public site and in every existing test -- the only
// call abilityitem/index.test.js makes is <Abilityitem ability stars /> -- so
// `editing` is false, both branches below render exactly what they rendered
// before, and the read-mode DOM is byte-identical. That is what keeps the five
// assertions in that file (glyph count, aria-hidden, shape-not-colour, string
// coercion, clamping) meaningful rather than merely passing.
//
// The <li> is untouched in both modes. Only the two cells change, the same way
// the <dd>s do in components/details/ and the link cells do in the footer --
// site/index.test.js counts listitems and asserts each one's parent is a UL,
// and that has to hold with an editor open.
const Abilityitem = ({ ability, stars, edit }) => {
  const editing = Boolean(edit && edit.editing);
  const rating = normalizeStars(stars);

  return (
    <li className="abilityitem row">
      <div className="ability">
        {editing ? (
          <Editfield
            id={edit.nameId}
            label={edit.nameLabel}
            value={edit.name}
            onChange={edit.onNameChange}
            readOnly={edit.readOnly}
            describedBy={edit.describedBy}
            onSubmit={edit.onSubmit}
            onCancel={edit.onCancel}
            takeFocus={edit.takeFocus}
          ></Editfield>
        ) : (
          ability
        )}
      </div>
      <div className="starsContainer">
        {editing ? (
          <Starrating
            ability={edit.name}
            value={edit.stars}
            onChange={edit.onStarsChange}
            readOnly={edit.readOnly}
            describedBy={edit.describedBy}
          ></Starrating>
        ) : (
          <div className="stars">{generateStars(stars)}</div>
        )}
        {/* Kept in BOTH modes. The radiogroup announces which star is checked
            as you move through it; this is the only place the row states its
            current value as one fact, and losing it in edit mode would mean the
            rating is only knowable by counting. */}
        <span className="visually-hidden">
          {editing ? normalizeStars(edit.stars) : rating} out of 5
        </span>
      </div>
      {editing && edit.remove && (
        <div className="rowcontrols">
          <Editcontrol
            label={edit.remove.label}
            context={edit.remove.context}
            disabled={edit.remove.disabled}
            onClick={edit.remove.onClick}
          ></Editcontrol>
          {edit.remove.note ? (
            <p className="rowcontrolnote">{edit.remove.note}</p>
          ) : null}
        </div>
      )}
    </li>
  );
};
export default Abilityitem;
