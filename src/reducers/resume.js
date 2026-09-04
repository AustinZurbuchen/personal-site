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
        },
    },
})

export const { update } = resumeSlice.actions

export default resumeSlice.reducer
