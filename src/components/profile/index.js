import React from "react";
import { useSelector } from "react-redux";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import Editbar from "../editbar/index";
import { useSectionEditor } from "../../utils/useSectionEditor";
import "./index.scss";

// The first field wired end to end, and now one of four editable sections.
// Both halves of the pair are still this one constant: the key the editMode
// slice opens under, and the dotted path server.py's ALLOWLIST accepts.
//
// The draft/dirty/PUT machinery that used to live in this file moved to
// src/utils/useSectionEditor.js when the quote sections arrived -- unchanged,
// but in one place rather than four. `profile.subtitle` is allowlisted by the
// server and not yet wired here; adding it means adding it to FIELDS and giving
// <Titles> an `edit` prop, not a second mechanism.
const SECTION = "profile";
const ABOUT_ME = "profile.description";
const FIELDS = [ABOUT_ME];

function Profile() {
  const resume = useSelector((state) => state.resume.value);
  const editor = useSectionEditor(SECTION, FIELDS);

  return (
    <section className="profile" aria-labelledby="profile-title">
      <div className="container">
        {/* Read mode and edit mode both. Renders nothing at all -- no element,
            no landmark, no button -- unless signed in on the admin vhost, so
            the structural assertions in site/index.test.js hold either way. */}
        <Editbar context="About Me" editor={editor}></Editbar>

        <Titles
          id="profile-title"
          title="Profile"
          subtitle={resume.profile.subtitle}
        ></Titles>
        <div className="info row">
          <Aboutme
            title="About Me"
            body={resume.profile.description}
            edit={
              editor.editing
                ? {
                    editing: true,
                    value: editor.valueOf(ABOUT_ME),
                    readOnly: editor.saving,
                    describedBy: editor.describedBy,
                    onChange: editor.onChangeOf(ABOUT_ME),
                    onSubmit: editor.save,
                    onCancel: editor.closeEditor,
                  }
                : undefined
            }
          ></Aboutme>
          <Photo></Photo>
          <Details title="Details" body={resume.profile}></Details>
        </div>
      </div>
    </section>
  );
}
export default Profile;
