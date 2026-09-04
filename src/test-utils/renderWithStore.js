import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import resumeReducer, { update } from "../reducers/resume";
import editModeReducer from "../reducers/editMode";
import { resumeFixture } from "./fixtures";

// Deliberately NOT src/app/store.js. That module exports one already-created
// store, so state written by one test would leak into every test after it.
export function makeStore() {
  return configureStore({
    reducer: { resume: resumeReducer, editMode: editModeReducer },
  });
}

// Data is pushed in through the real `update` action rather than through
// configureStore's preloadedState on purpose: the emptyResume merge is the part
// of this app most likely to regress, so every component test should exercise
// it rather than route around it.
//
// Pass `resume: null` to render against the untouched emptyResume skeleton.
export function renderWithStore(ui, options = {}) {
  const { resume = resumeFixture(), store, ...renderOptions } = options;
  const testStore = store || makeStore();
  if (resume) {
    testStore.dispatch(update(resume));
  }
  const Wrapper = ({ children }) => (
    <Provider store={testStore}>{children}</Provider>
  );
  return {
    store: testStore,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
