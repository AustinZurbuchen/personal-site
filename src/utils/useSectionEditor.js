import { useDispatch, useSelector } from 'react-redux';
import { update } from '../reducers/resume';
import {
    sectionOpened,
    sectionClosed,
    draftChanged,
    draftsDiscarded,
    saveStarted,
    saveSucceeded,
    saveFailed,
    sessionExpired,
} from '../reducers/editMode';
import { saveFields, isAuthFailure } from './adminApi';
import { isAdminUi } from './env';

// The edit machinery that used to live inside src/components/profile/index.js,
// lifted here verbatim when the second, third and fourth editable sections
// arrived. Nothing about the behaviour changed; what changed is that there is
// one copy of it instead of four.
//
// Extracted rather than copied because the thing being duplicated would have
// been a PUT handler and a data-loss guard. A divergence between four copies of
// those is not a styling bug.
//
// A hook rather than a wrapper component: the section components are already
// the ones that own their <section> element and their heading, and
// src/components/site/index.test.js asserts exactly three <section>s and a fixed
// heading walk. A wrapper would have had to render nothing at all to be safe,
// which is what a hook is.

// Value equality, deep enough for what a draft can hold: a string, or a list of
// flat rows whose values are strings and bools.
//
// THIS IS A SAFETY CHECK, NOT A TIDINESS ONE. Dirtiness used to be `!==`, which
// is reference identity. That is exactly right for a string and exactly wrong
// for an array: a draft list is never === the store's list, so the moment a
// list draft exists it reads as dirty for ever. Save lights up with nothing
// typed, every section switch asks to discard, and -- the part that matters --
// gate 4 of the "Save blanked my resume" defence stops holding. That gate is
// "a draft only exists for a path the user typed into, and dirty compares it
// against the store". A list editor has to SEED a draft to have something to
// mutate, so under `!==` a seeded copy of the un-hydrated skeleton's empty list
// would be dirty, and one Save would PUT [] over the live section.
//
// Written out rather than pulled from a library: the shapes are known and
// small, and the app ships no deep-equal dependency.
export const sameValue = (a, b) => {
    if (a === b) return true;

    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        return a.every((item, i) => sameValue(item, b[i]));
    }

    if (a && b && typeof a === 'object' && typeof b === 'object') {
        const keys = Object.keys(a);
        if (keys.length !== Object.keys(b).length) return false;
        return keys.every(
            (key) =>
                Object.prototype.hasOwnProperty.call(b, key) &&
                sameValue(a[key], b[key])
        );
    }

    return false;
};

// Dotted-path reader for the API's own allowlist paths. Array indices work
// without a special case: 'quotes.0.quote' splits to ['quotes','0','quote'] and
// array['0'] is array[0].
export const readPath = (source, path) =>
    path
        .split('.')
        .reduce(
            (value, key) =>
                value === null || value === undefined ? value : value[key],
            source
        );

// `section` is the key editMode opens under; `fields` are that section's dotted
// ALLOWLIST paths, in the order the server would list them.
export const useSectionEditor = (section, fields) => {
    const dispatch = useDispatch();
    const resume = useSelector((state) => state.resume.value);

    // THE GATE THAT MAKES "SAVE BLANKED MY RESUME" IMPOSSIBLE, and it is four
    // independent gates rather than one:
    //
    //   1. App.js renders <Site /> only at status === "ready".
    //   2. `loaded` is set by the resume slice's `update` reducer and by nothing
    //      else, so it is true only once a real payload has been merged. App's
    //      gate is a RENDERING decision and it has been wrong once before (its
    //      own comment records the `resume?.profile` gate that was truthy on the
    //      first render and painted the skeleton); a gate that protects the
    //      database lives next to the button that writes to it.
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
    const editing = openSection === section;
    const saving = saveStatus === 'saving';

    // Dirtiness is DERIVED, never stored, so a successful save is self-cleaning:
    // saveSucceeded empties the drafts, every path falls back to the store, and
    // the section goes quiet with no "mark clean" step to forget.
    const dirtyPaths = fields.filter(
        (path) => path in drafts && !sameValue(drafts[path], readPath(resume, path))
    );
    const dirty = dirtyPaths.length > 0;

    // The same question asked of the WHOLE drafts object rather than this
    // section's fields, so it is true when some OTHER section has unsaved work.
    // Deliberately section-agnostic: it needs no register of which sections
    // exist, and a section added later is covered without editing this line.
    const anyDirty = Object.keys(drafts).some(
        (path) => !sameValue(drafts[path], readPath(resume, path))
    );

    // One id per section, unique by construction, and present only in admin
    // mode. site/index.test.js asserts every [id] on the page is unique.
    const errorId = section + '-saveerror';

    // The controlled-input rule: a touched path reads from the draft, an
    // untouched one falls through to the saved value. `in`, not `||`, so a field
    // deliberately cleared to '' stays cleared.
    const valueOf = (path) =>
        path in drafts ? drafts[path] : readPath(resume, path);

    const openEditor = () => {
        if (!loaded || !canEdit) return;

        // THE SECOND PLACE WORK CAN BE LOST BY A CLICK, and it did not exist
        // while `profile` was the only editable section. sectionOpened assigns
        // openSection and empties drafts -- so opening a second editor over a
        // half-typed first one used to discard it with no prompt and no undo.
        // Same question Done asks, deliberately the same wording.
        if (
            openSection &&
            openSection !== section &&
            anyDirty &&
            !window.confirm('Discard your unsaved changes?')
        ) {
            return;
        }
        dispatch(sectionOpened(section));
    };

    const closeEditor = () => {
        if (saving) return;
        // window.confirm rather than an invented modal: the design system has no
        // dialog vocabulary, and this is a single-operator admin tool. Cancel is
        // sitting right next to Done and is the labelled way to discard.
        if (dirty && !window.confirm('Discard your unsaved changes?')) return;
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

        // Only the paths that actually differ. A section with two fields whose
        // second is untouched sends one key, not two -- the PUT body is the
        // dirty subset verbatim, with no mapping table between a UI field name
        // and a database path.
        const updates = dirtyPaths.reduce((changed, path) => {
            changed[path] = drafts[path];
            return changed;
        }, {});

        dispatch(saveStarted());
        saveFields(updates)
            .then((document) => {
                // The PUT answers with the whole re-read, re-sorted resume,
                // because public_view() is shared by GET /getResume and PUT
                // /updateResume precisely so a 200 cannot describe a document
                // the next GET would disagree with. So the store is refreshed
                // through the very merge the first fetch uses: no local
                // patching, no follow-up GET, and no way for the screen to
                // drift from the database.
                //
                // Order is load-bearing: update() before saveSucceeded(), which
                // empties the drafts, so the fields repaint from the merged
                // server document including anything it normalised.
                dispatch(update(document));
                dispatch(saveSucceeded());
                // Deliberately NOT sectionClosed(): Save saves, Done exits.
            })
            .catch((error) => {
                // A failed save never touches the draft, never closes the
                // section and never clears the store -- the draft is the only
                // copy of the user's work. A dead token clears both of its
                // copies (adminApi already cleared storage; this clears the flag
                // that drives the render) without disturbing openSection or
                // drafts.
                if (isAuthFailure(error)) {
                    dispatch(sessionExpired(error.message));
                    return;
                }
                dispatch(
                    saveFailed({
                        message: error.message,
                        fieldErrors: error.fieldErrors,
                    })
                );
            });
    };

    // Composed here rather than in Editfield because "dirty" needs the stored
    // value and only this layer has it. Order matters: an in-flight save and a
    // real error both outrank the reminder.
    const status = saving
        ? 'Saving…'
        : dirty
        ? 'Unsaved changes'
        : saveStatus === 'saved'
        ? 'Saved'
        : '';

    return {
        canEdit,
        editing,
        dirty,
        saving,
        signedIn,
        saveStatus,
        saveError,
        errorId,
        status,
        valueOf,
        openEditor,
        closeEditor,
        revert,
        save,
        // The textarea points at the error band while it exists, and at nothing
        // when it does not -- aria-describedby must not name a missing id.
        describedBy: saveStatus === 'error' ? errorId : undefined,
        onChangeOf: (path) => (value) => dispatch(draftChanged({ path, value })),
    };
};
