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
                quotes: Array.isArray(payload.quotes) ? payload.quotes : emptyResume.quotes,
                links: { ...emptyResume.links, ...(payload.links || {}) },
            };
        },
    },
})

export const { update } = resumeSlice.actions

export default resumeSlice.reducer