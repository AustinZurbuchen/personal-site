import { createSlice } from '@reduxjs/toolkit';

export const editModeSlice = createSlice({
    name: 'editMode',
    initialState: {
        value: false,
    },
    reducers: {
        toggle: (state) => {
            state.value = !state.value;
        },
    },
})

export const { toggle } = editModeSlice.actions

export default editModeSlice.reducer