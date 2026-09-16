import React from "react";
import Editcontrol from "../editcontrol/index";
import "./index.scss";

// `add` is undefined on the public site and in read mode, so the rendered DOM
// is byte-identical to what it was: one <h3>, one <ul>, and whatever `items`
// contains. The control below the list appears only while editing.
//
// AFTER the </ul>, never inside it. site/index.test.js asserts every <li> has a
// <ul> parent and counts them; a button smuggled into the list as an <li> would
// be counted as an item, and one placed loose inside the <ul> is invalid markup
// that a real parser relocates.
const Itemslist = ({ title, items, add }) => {
  return (
    <div className="itemslist">
      <h3 className="listtitle smalltitle">{title}</h3>
      <ul className="listitems">{items}</ul>
      {add && (
        <div className="listadd">
          <Editcontrol
            label={add.label}
            context={add.context}
            disabled={add.disabled}
            onClick={add.onClick}
          ></Editcontrol>
          {/* Only ever says why the control is unavailable. Absent otherwise,
              rather than an empty node that a screen reader would announce as
              a blank live region on every render. */}
          {add.note ? <p className="listaddnote">{add.note}</p> : null}
        </div>
      )}
    </div>
  );
};
export default Itemslist;
