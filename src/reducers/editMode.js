import { createSlice } from '@reduxjs/toolkit';
import { hasSession } from '../utils/adminSession';

// Replaces the old `{ value: false }` + `toggle` slice, which nothing ever
// rendered. Grepped before replacing: only src/app/store.js and
// src/test-utils/renderWithStore.js import this module, and both use the
// default export. Nothing imported `toggle` or read `state.editMode.value`.
//
// The path, the slice name ('editMode') and the default export are unchanged on
// purpose. src/test-utils/renderWithStore.js builds its store from exactly
// { resume, editMode }; a NEW top-level key would be undefined in every existing
// test, and the first useSelector to read it would throw -- taking all 57
// assertions down for a feature they never render.
//
// Five pieces of state, and deliberately not a sixth:
//
//   signedIn    - is there a usable admin token
//   openSection - WHICH section is open for editing, or null
//   drafts      - the fields the user has actually TOUCHED, keyed by the API's
//                 own dotted allowlist path ('profile.description')
//   saveStatus / saveError / fieldErrors - the outcome of the last PUT
//
// THE TOKEN IS NOT HERE. It lives in sessionStorage, owned by
// src/utils/adminSession.js. A credential in the store is a credential in every
// DevTools snapshot and in anything that ever serialises state; the store keeps
// the one bit a component actually needs.
//
// The admin FLAG is not here either. It is read per render by isAdminUi() in
// src/utils/env.js, so a test can set window.__ENV__ without having to create
// its store afterwards, and so the cosmetic flag never looks like durable state.
//
// `openSection` is a single string rather than a set or a per-section flag,
// because one section is editable at a time. Making a second one
// unrepresentable is cheaper and more honest than enforcing it in a component.
//
// `drafts` are keyed by API path on purpose, and hold ONLY touched fields:
//   * the PUT body is the dirty subset of this object verbatim, with no mapping
//     table between a UI field name and a database path;
//   * an untouched field falls through to the store, so there is no seeding
//     step that could seed an editor from the un-hydrated emptyResume skeleton.
// That is the part that generalises to stage 4: new fields are new keys.

const initialState = () => ({
    // A lazy initialiser (RTK >= 1.8; 1.9.6 is installed), so this reads storage
    // when a store is CREATED rather than once when the module is first
    // imported. A page reload inside a live 8h session comes straight back to
    // the editor. In jsdom sessionStorage is empty, so this is false in every
    // existing test.
    signedIn: hasSession(),
    openSection: null,
    drafts: {},
    // idle | saving | saved | error
    saveStatus: 'idle',
    saveError: '',
    fieldErrors: {},
});

const clearSaveState = (state) => {
    state.saveStatus = 'idle';
    state.saveError = '';
    state.fieldErrors = {};
};

export const editModeSlice = createSlice({
    name: 'editMode',
    initialState,
    reducers: {
        // --- session --------------------------------------------------------
        sessionStarted: (state) => {
            state.signedIn = true;
            clearSaveState(state);
        },

        // A deliberate sign-out: the user is finished, so the open section and
        // any unsaved drafts go with it.
        //
        // `signedIn: false` is written explicitly rather than left to
        // initialState(), which reads storage -- dispatching this before the
        // token is cleared would otherwise come back signed in.
        sessionEnded: () => ({ ...initialState(), signedIn: false }),

        // A 401 mid-edit. Same signedIn transition as sessionEnded and a
        // deliberately DIFFERENT one for everything else: `openSection` and
        // `drafts` SURVIVE.
        //
        // The session expired; the paragraph the user was halfway through
        // typing did not. The editor is gated on `openSection` alone rather
        // than on signedIn, so the textarea stays on screen holding the same
        // text, the sign-in form reappears in the admin bar above it, and the
        // same draft saves after signing back in. Tearing the editor down here
        // would delete someone's work in response to a clock.
        sessionExpired: (state, action) => {
            state.signedIn = false;
            state.saveStatus = 'error';
            state.saveError = action.payload || 'Your session expired.';
            state.fieldErrors = {};
        },

        // --- which section is open -------------------------------------------
        // Payload is a section key ('profile'). Assigning rather than toggling
        // means opening a second section closes the first for free.
        sectionOpened: (state, action) => {
            state.openSection = action.payload;
            state.drafts = {};
            clearSaveState(state);
        },

        sectionClosed: (state) => {
            state.openSection = null;
            state.drafts = {};
            clearSaveState(state);
        },

        // --- drafts -----------------------------------------------------------
        // Payload: { path, value }. Only touched paths ever enter this object.
        draftChanged: (state, action) => {
            const { path, value } = action.payload;
            state.drafts[path] = value;

            // A keystroke retires the previous failure. An error band left
            // sitting above a field the user has since fixed describes a state
            // that no longer exists. `saved` is retired too -- the text on
            // screen is no longer what was saved.
            if (state.saveStatus === 'error' || state.saveStatus === 'saved') {
                state.saveStatus = 'idle';
                state.saveError = '';
            }
            delete state.fieldErrors[path];
        },

        // Revert to what is stored, without leaving edit mode. Clearing the
        // drafts is the whole operation: an untouched path reads from the
        // resume slice, so emptying this object hands every field back to the
        // server's value.
        draftsDiscarded: (state) => {
            state.drafts = {};
            clearSaveState(state);
        },

        // --- save -------------------------------------------------------------
        saveStarted: (state) => {
            state.saveStatus = 'saving';
            state.saveError = '';
            state.fieldErrors = {};
        },

        // The caller dispatches resume/update with the document the PUT returned
        // FIRST, then this. Clearing the drafts then repaints the field with
        // what was actually written, including anything the server normalised.
        //
        // `openSection` deliberately survives: Save saves, Done exits.
        saveSucceeded: (state) => {
            state.drafts = {};
            state.saveStatus = 'saved';
            state.saveError = '';
            state.fieldErrors = {};
        },

        // Payload: { message, fieldErrors }, both straight off the error
        // src/utils/adminApi.js throws. The drafts SURVIVE so the user can fix
        // and retry -- the draft is the only copy of their work.
        saveFailed: (state, action) => {
            const { message, fieldErrors } = action.payload || {};
            state.saveStatus = 'error';
            state.saveError = message || 'That could not be saved.';
            state.fieldErrors = fieldErrors || {};
        },
    },
})

export const {
    sessionStarted,
    sessionEnded,
    sessionExpired,
    sectionOpened,
    sectionClosed,
    draftChanged,
    draftsDiscarded,
    saveStarted,
    saveSucceeded,
    saveFailed,
} = editModeSlice.actions

// Selectors, so components never reach into this shape by hand.

export const selectSignedIn = (state) => state.editMode.signedIn;

export const selectIsEditing = (state, section) =>
    state.editMode.openSection === section;

// The controlled-input rule for the whole app: a touched path reads from
// `drafts`, an untouched one falls through to the saved value in the resume
// slice. `in`, not `||`, so a field deliberately cleared to '' stays cleared.
export const selectDraft = (state, path, savedValue) =>
    path in state.editMode.drafts ? state.editMode.drafts[path] : savedValue;

export const selectSaveStatus = (state) => state.editMode.saveStatus;
export const selectSaveError = (state) => state.editMode.saveError;

export default editModeSlice.reducer
