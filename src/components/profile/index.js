import React from "react";
import { useSelector } from "react-redux";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import Editbar from "../editbar/index";
import { useSectionEditor } from "../../utils/useSectionEditor";
import "./index.scss";

// Every scalar the server will accept for this band, in one section and behind
// one Save. Each entry is the dotted path server.py's ALLOWLIST accepts
// verbatim, so the PUT body needs no mapping table between a UI field name and
// a database path.
//
// This is what the architecture promised when the quote sections arrived:
// adding a field is adding a line here and an `edit` prop, not a second
// mechanism. Nothing else in this file changed to go from one field to five.
//
// profile.name is edited through <Details>, not through the <h1> in
// components/name/ that also renders it -- see the note in details/index.js.
const SECTION = "profile";
const ABOUT_ME = "profile.description";
const SUBTITLE = "profile.subtitle";
const NAME = "profile.name";
const AGE = "profile.age";
const LOCATION = "profile.location";
const FIELDS = [ABOUT_ME, SUBTITLE, NAME, AGE, LOCATION];

function Profile() {
  const resume = useSelector((state) => state.resume.value);
  const editor = useSectionEditor(SECTION, FIELDS);

  // readOnly / describedBy / Save / Escape are properties of the SECTION's
  // save, not of any one field, so every field below gets the same ones.
  const shared = editor.editing
    ? {
        editing: true,
        readOnly: editor.saving,
        describedBy: editor.describedBy,
        onSubmit: editor.save,
        onCancel: editor.closeEditor,
      }
    : null;

  // Ids are section-prefixed because this band now puts five of them on a page
  // that already carries the quote editors' six; site/index.test.js asserts
  // every [id] is unique.
  const field = (path, id, label) => ({
    id: id,
    label: label,
    value: editor.valueOf(path),
    onChange: editor.onChangeOf(path),
  });

  return (
    <section className="profile" aria-labelledby="profile-title">
      <div className="container">
        {/* Renders nothing at all -- no element, no landmark, no button --
            unless signed in on the admin vhost. */}
        <Editbar context="Profile" editor={editor}></Editbar>

        <Titles
          id="profile-title"
          title="Profile"
          subtitle={resume.profile.subtitle}
          // No `by`: this band has no attribution, and Titles renders the
          // attribution field only when one is supplied.
          edit={
            shared && {
              ...shared,
              // First editable field in document order, so the caret lands
              // somewhere predictable rather than wherever mounted last.
              takeFocus: true,
              subtitle: field(
                SUBTITLE,
                "profile-subtitleEdit",
                "Profile subtitle"
              ),
            }
          }
        ></Titles>
        <div className="info row">
          <Aboutme
            title="About Me"
            body={resume.profile.description}
            edit={
              shared && {
                ...shared,
                value: editor.valueOf(ABOUT_ME),
                onChange: editor.onChangeOf(ABOUT_ME),
              }
            }
          ></Aboutme>
          <Photo></Photo>
          <Details
            title="Details"
            body={resume.profile}
            edit={
              shared && {
                ...shared,
                name: field(NAME, "profile-nameEdit", "Name"),
                age: field(AGE, "profile-ageEdit", "Age"),
                location: field(LOCATION, "profile-locationEdit", "Location"),
              }
            }
          ></Details>
        </div>
      </div>
    </section>
  );
}
export default Profile;
