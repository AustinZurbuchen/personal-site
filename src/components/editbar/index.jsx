import React from "react";
import Editcontrol from "../editcontrol/index";
import "./index.scss";

// The control row every editable section shows: Edit in read mode; status,
// Save, Cancel and Done while editing; and the save-failure band underneath.
//
// Presentational: it holds no state and makes no request. `editor` is the object
// src/utils/useSectionEditor.js returns, and this component only reads it -- the
// hook owns every decision, this owns the markup.
//
// Introduces NO heading, NO <section>, NO <a> and NO <ul>/<li>, so the
// structural assertions in src/components/site/index.test.js hold wherever it
// renders -- including inside the footer's contentinfo landmark, next to the
// <ul> of links.
//
// `dark` is threaded to the buttons rather than inferred from a container,
// because .editcontroldark predates this component and the admin bar uses it
// while sitting outside every band. The field, status and error go dark the
// other way -- see the .footer-scoped rules in components/footer/index.scss --
// because those three only ever darken inside the footer, and the repo already
// styles footer descendants that way (.footer .subtitle, .footer :focus-visible).
const Editbar = ({ context, editor, dark = false }) => {
  const {
    canEdit,
    editing,
    dirty,
    saving,
    signedIn,
    saveStatus,
    saveError,
    errorId,
    status,
    openEditor,
    save,
    revert,
    closeEditor,
  } = editor;

  // Nothing at all on the public site: no element, no landmark, no button.
  // src/editflow.test.js asserts the signed-out render contains zero <button>s
  // across the whole page.
  //
  // `|| editing` rather than `canEdit` alone: a token that expires mid-edit
  // flips canEdit false, and vanishing the controls at that moment would strand
  // an open editor with no way to Save after signing back in, and no Done.
  if (!canEdit && !editing) return null;

  return (
    <>
      {!editing && (
        <div className="editbar">
          <Editcontrol
            label="Edit"
            context={context}
            dark={dark}
            onClick={openEditor}
          ></Editcontrol>
        </div>
      )}

      {editing && (
        <div className="editbar" aria-busy={saving ? "true" : "false"}>
          {/* Mounted whether or not it has anything to say. A live region
              announces changes to text it already contains, so one that appears
              at the same moment as its first message is frequently not
              announced at all. */}
          <p className="editstatus" role="status">
            {status}
          </p>
          <Editcontrol
            label="Save"
            context={context}
            dark={dark}
            disabled={!dirty || saving || !signedIn}
            onClick={save}
          ></Editcontrol>
          <Editcontrol
            label="Cancel"
            context={context}
            dark={dark}
            disabled={!dirty || saving}
            onClick={revert}
          ></Editcontrol>
          <Editcontrol
            label="Done"
            context={context}
            dark={dark}
            disabled={saving}
            onClick={closeEditor}
          ></Editcontrol>
        </div>
      )}

      {/* role="alert" is announced on insertion, so this needs no id of its own
          to be heard. It has one anyway, because the fields point at it with
          aria-describedby while it exists. */}
      {editing && saveStatus === "error" && (
        <p className="editerror" role="alert" id={errorId}>
          {saveError}
        </p>
      )}
    </>
  );
};
export default Editbar;
