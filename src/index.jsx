import React from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App";
import store from './app/store'
import { Provider } from 'react-redux'

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
