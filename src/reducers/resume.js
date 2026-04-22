import { createSlice } from '@reduxjs/toolkit';

export const resumeSlice = createSlice({
    name: 'resume',
    initialState: {
        value: {},
    },
    reducers: {
        update: (state, action) => {
            state.value = action.payload;
        },
    },
})

export const { update } = resumeSlice.actions

export default resumeSlice.reducer