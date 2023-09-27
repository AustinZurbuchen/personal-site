import { configureStore } from '@reduxjs/toolkit'
import resumeReducer from '../reducers/resume'

export default configureStore({
  reducer: {
    resume: resumeReducer,
  },
})