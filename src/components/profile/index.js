import React from "react";
import { useDispatch, useSelector } from "react-redux";
import Titles from "../titles/index";
import Aboutme from "../aboutme/index";
import Photo from "../photo/index";
import Details from "../details/index";
import Editcontrol from "../editcontrol/index";
import { update } from "../../reducers/resume";
import {
  sectionOpened,
  sectionClosed,
  draftChanged,
  draftsDiscarded,
  saveStarted,
  saveSucceeded,
  saveFailed,
  sessionExpired,
} from "../../reducers/editMode";
import { saveFields, isAuthFailure } from "../../utils/adminApi";
import { isAdminUi } from "../../utils/env";
import "./index.scss";

// The one field stage 2 ships end to end. Both halves of the pair are this one
// constant: the key the editMode slice opens under, and the dotted path
// server.py's ALLOWLIST accepts. Stage 4 adds entries to FIELDS, not a second
// mechanism.
const SECTION = "profile";
const ABOUT_ME = "profile.description";
const FIELDS = [ABOUT_ME];

const readPath = (source, path) =>
  path
    .split(".")
    .reduce(
      (value, key) =>
        value === null || value === undefined ? value : value[key],
      source
    );

function Profile() {
  const dispatch = useDispatch();
  const resume = useSelector((state) => state.resume.value);

  // THE GATE THAT MAKES "SAVE BLANKED MY RESUME" IMPOSSIBLE, and it is four
  // independent gates rather than one:
  //
  //   1. App.js renders <Site /> only at status === "ready".
  //   2. `loaded` is set by the resume slice's `update` reducer and by nothing
  //      else, so it is true only once a real payload has been merged. App's
  //      gate is a RENDERING decision and it has been wrong once before (its own
  //      comment records the `resume?.profile` gate that was truthy on the first
  //      render and painted the skeleton); a gate that protects the database
  //      lives next to the button that writes to it.
  //   3. openEditor() and save() both re-check it, so the paint is not trusted.
  //   4. Even with all three gone, a draft only exists for a path the user has
  //      TYPED into, and `dirty` compares it against the store. Over the
  //      skeleton every stored value is "", nothing is dirty, and Save has
  //      nothing to send. Blanking the resume would take deliberately typing
  //      into a blank box.
  //
  // Read as `=== true`, so if the flag is ever dropped from the slice this
  // reads undefined and the edit UI simply never appears. It fails CLOSED.
  const loaded = useSelector((state) => state.resume.loaded) === true;
  const signedIn = useSelector((state) => state.editMode.signedIn);
  const openSection = useSelector((state) => state.editMode.openSection);
  const drafts = useSelector((state) => state.editMode.drafts);
  const saveStatus = useSelector((state) => state.editMode.saveStatus);
  const saveError = useSelector((state) => state.editMode.saveError);

  // The flag alone is not enough to offer an Edit button: without a token Save
  // could only ever 401, so the control would be an invitation to fail.
  const canEdit = isAdminUi() && signedIn && loaded;

  // Gated on `openSection` ALONE, not on signedIn. A token that expires
  // mid-edit flips signedIn false, and tearing the editor down at that moment
  // would delete the user's unsaved text in response to a clock. The editor
  // stays, Save reports the 401, the sign-in form reappears in the admin bar,
  // and the same draft saves after signing back in.
  const editing = openSection === SECTION;
  const saving = saveStatus === "saving";

  // Dirtiness is DERIVED, never stored, so a successful save is self-cleaning:
  // saveSucceeded empties the drafts, every path falls back to the store, and
  // the section goes quiet with no "mark clean" step to forget.
  const dirtyPaths = FIELDS.filter(
    (path) => path in drafts && drafts[path] !== readPath(resume, path)
  );
  const dirty = dirtyPaths.length > 0;

  // The controlled-input rule: a touched path reads from the draft, an
  // untouched one falls through to the saved value.
  const draftValue =
    ABOUT_ME in drafts ? drafts[ABOUT_ME] : resume.profile.description;

  const openEditor = () => {
    if (!loaded || !canEdit) return;
    dispatch(sectionOpened(SECTION));
  };

  const closeEditor = () => {
    if (saving) return;
    // The only place work can be lost by a click, so it is the only place that
    // asks. window.confirm rather than an invented modal: the design system has
    // no dialog vocabulary, and this is a single-operator admin tool. Cancel is
    // sitting right next to Done and is the labelled way to discard.
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    dispatch(sectionClosed());
  };

  const revert = () => {
    if (!dirty || saving) return;
    dispatch(draftsDiscarded());
  };

  const save = () => {
    // aria-disabled leaves the controls clickable on purpose (see
    // editcontrol/index.js), so every handler re-checks its own precondition
    // rather than trusting the paint.
    if (!editing || !dirty || saving || !loaded || !signedIn) return;

    const updates = dirtyPaths.reduce((changed, path) => {
      changed[path] = drafts[path];
      return changed;
    }, {});

    dispatch(saveStarted());
    saveFields(updates)
      .then((document) => {
        // The PUT answers with the whole re-read, re-sorted resume, because
        // public_view() is shared by GET /getResume and PUT /updateResume
        // precisely so a 200 cannot describe a document the next GET would
        // disagree with. So the store is refreshed through the very merge the
        // first fetch uses: no local patching, no follow-up GET, and no way for
        // the screen to drift from the database.
        dispatch(update(document));
        dispatch(saveSucceeded());
        // Deliberately NOT sectionClosed(): Save saves, Done exits.
      })
      .catch((error) => {
        // A failed save never touches the draft, never closes the section and
        // never clears the store -- the draft is the only copy of the user's
        // work. A dead token clears both of its copies (adminApi already
        // cleared storage; this clears the flag that drives the render) without
        // disturbing openSection or drafts.
        if (isAuthFailure(error)) {
          dispatch(sessionExpired(error.message));
          return;
        }
        dispatch(
          saveFailed({ message: error.message, fieldErrors: error.fieldErrors })
        );
      });
  };

  // Composed here rather than in Editfield because "dirty" needs the stored
  // value and only this component has it. Order matters: an in-flight save and
  // a real error both outrank the reminder.
  const status = saving
    ? "Saving…"
    : dirty
    ? "Unsaved changes"
    : saveStatus === "saved"
    ? "Saved"
    : "";

  return (
    <section className="profile" aria-labelledby="profile-title">
      <div className="container">
        {/* Read mode. Gated on canEdit so the public DOM gains nothing at all,
            and on `loaded` so there is no way to open an editor over the empty
            skeleton. No heading, no <section>, no <a>, no <ul>/<li> and no
            landmark is introduced here, so the structural assertions in
            site/index.test.js hold even when this branch does render. */}
        {canEdit && !editing && (
          <div className="editbar">
            <Editcontrol
              label="Edit"
              context="About Me"
              onClick={openEditor}
            ></Editcontrol>
          </div>
        )}

        {editing && (
          <div className="editbar" aria-busy={saving ? "true" : "false"}>
            {/* Mounted whether or not it has anything to say. A live region
                announces changes to text it already contains, so one that
                appears at the same moment as its first message is frequently
                not announced at all. */}
            <p className="editstatus" role="status">
              {status}
            </p>
            <Editcontrol
              label="Save"
              context="About Me"
              disabled={!dirty || saving || !signedIn}
              onClick={save}
            ></Editcontrol>
            <Editcontrol
              label="Cancel"
              context="About Me"
              disabled={!dirty || saving}
              onClick={revert}
            ></Editcontrol>
            <Editcontrol
              label="Done"
              context="About Me"
              disabled={saving}
              onClick={closeEditor}
            ></Editcontrol>
          </div>
        )}

        {/* role="alert" is announced on insertion, so this needs no id of its
            own to be heard. It has one anyway, because the textarea points at
            it with aria-describedby while it exists -- one id per section,
            unique by construction, and present only in admin mode. */}
        {editing && saveStatus === "error" && (
          <p className="editerror" role="alert" id="profile-saveerror">
            {saveError}
          </p>
        )}

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
              editing
                ? {
                    editing: true,
                    value: draftValue,
                    readOnly: saving,
                    describedBy:
                      saveStatus === "error" ? "profile-saveerror" : undefined,
                    onChange: (value) =>
                      dispatch(draftChanged({ path: ABOUT_ME, value })),
                    onSubmit: save,
                    onCancel: closeEditor,
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
