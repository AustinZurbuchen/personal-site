import { createSlice } from '@reduxjs/toolkit';

const emptyResume = {
    profile: {
        name: '',
        subtitle: '',
        description: '',
    },
    experiences: {
        school: [],
        work: [],
    },
    abilities: {
        languages: [],
        technologies: [],
    },
    quotes: [
        { quote: '', by: '' },
        { quote: '', by: '' },
        { quote: '', by: '' },
    ],
    links: {
        email: '',
        linkedin: '',
        github: '',
    },
};

// Experiences reads quotes[0], Abilities quotes[1] and Footer quotes[2] with no
// guard, on the strength of the emptyResume merge. An `Array.isArray` check
// alone did not deliver that: a shorter array (one quote deleted by hand in
// Mongo Atlas) passed straight through and took the whole page down with
// "Cannot read properties of undefined (reading 'quote')". Backfill every slot
// emptyResume declares, and keep any extras the payload supplies.
const withQuoteSlots = (quotes) => {
    const supplied = Array.isArray(quotes) ? quotes : [];
    const filled = emptyResume.quotes.map((fallback, i) => supplied[i] || fallback);
    return filled.concat(supplied.slice(emptyResume.quotes.length));
};

export const resumeSlice = createSlice({
    name: 'resume',
    initialState: {
        value: emptyResume,
        // False until a real payload has been merged. Set by `update` and by
        // nothing else, so it is the only honest answer to "is what is on
        // screen the database, or the skeleton?".
        //
        // The edit UI hangs on it. An editor opened over the skeleton would be
        // an editor over empty strings, and one Save would write those empties
        // over the real resume. App.js's status machine also refuses to render
        // <Site /> before then, but the write path must not inherit its safety
        // from a rendering decision -- that exact gate has been wrong once
        // already (see the comment in App.js about `resume?.profile`, which was
        // truthy on the first render and painted the blank skeleton). A gate
        // that protects the database lives in the store the write path reads.
        //
        // Safe against src/reducers/resume.test.js, which only ever reads
        // `.value` off the result and never deep-equals the slice object.
        loaded: false,
    },
    reducers: {
        update: (state, action) => {
            const payload = action.payload || {};
            state.value = {
                ...emptyResume,
                ...payload,
                profile: { ...emptyResume.profile, ...(payload.profile || {}) },
                experiences: { ...emptyResume.experiences, ...(payload.experiences || {}) },
                abilities: { ...emptyResume.abilities, ...(payload.abilities || {}) },
                quotes: withQuoteSlots(payload.quotes),
                links: { ...emptyResume.links, ...(payload.links || {}) },
            };
            state.loaded = true;
        },
    },
})

export const { update } = resumeSlice.actions

export default resumeSlice.reducer
