import { configureStore } from '@reduxjs/toolkit'
import resumeReducer from '../reducers/resume'
import editModeReducer from '../reducers/editMode'

export default configureStore({
  reducer: {
    resume: resumeReducer,
    editMode: editModeReducer,
  },
})