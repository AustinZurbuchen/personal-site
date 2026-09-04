import React from "react";
import { render, wait } from "@testing-library/react";
import { Provider } from "react-redux";
import axios from "axios";
import App from "./App";
import { makeStore } from "./test-utils/renderWithStore";
import { resumeFixture } from "./test-utils/fixtures";

// The factory form of jest.mock matters: an automock would still LOAD axios to
// derive its shape. With the "^axios$" -> "axios/dist/node/axios.cjs" mapping in
// package.json that would work, but the factory keeps these tests independent of
// the mapping and never touches the real module.
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

// react-scripts sets resetMocks: true, so any implementation baked into a
// jest.fn() at module scope is wiped before every test. Set behaviour per test.
const renderApp = () => {
  const store = makeStore();
  return render(
    <Provider store={store}>
      <App />
    </Provider>
  );
};

afterEach(() => {
  delete window.__ENV__;
});

describe("App: where the resume is fetched from", () => {
  // Production depends entirely on the runtime injection layer:
  // docker-entrypoint.d/40-env-config.sh rewrites public/env-config.js to set
  // window.__ENV__.REACT_APP_SERVER_URL, and nginx proxies /api/ to Flask. This
  // resolver has silently broken once already (.env.local uses the wrong key,
  // REACT_APP_API_URL). A regression here builds, deploys, renders, and 404s its
  // only API call -- invisible until someone loads the page.
  it("calls the same origin when no runtime env is injected", () => {
    axios.get.mockResolvedValue({ data: resumeFixture() });
    renderApp();
    expect(axios.get).toHaveBeenCalledWith("/getResume");
  });

  it("uses window.__ENV__.REACT_APP_SERVER_URL when the container injects one", () => {
    window.__ENV__ = { REACT_APP_SERVER_URL: "/api" };
    axios.get.mockResolvedValue({ data: resumeFixture() });
    renderApp();
    expect(axios.get).toHaveBeenCalledWith("/api/getResume");
  });

  it("requests a root-relative path, so nested routes cannot rebase it", () => {
    // Deliberately not a string comparison: the invariant is that the URL
    // resolves to the same place from "/" and from "/some/deep/route". A value
    // like "api/getResume" (no leading slash) satisfies neither, and would 404
    // the moment a route deeper than one segment is added.
    window.__ENV__ = { REACT_APP_SERVER_URL: "/api" };
    axios.get.mockResolvedValue({ data: resumeFixture() });
    renderApp();

    const url = axios.get.mock.calls[0][0];
    expect(new URL(url, "https://example.com/deep/route").pathname).toBe(
      new URL(url, "https://example.com/").pathname
    );
  });
});

describe("App: the shape of the response it accepts", () => {
  // Two shapes are in play and the code silently accepts both via
  // `response.data?.resume ?? response.data`. Flask's jsonify(resume) returns
  // the bare document, so the envelope branch is untested by production. If the
  // API is ever wrapped or unwrapped, the only symptom is an empty page -- the
  // merge happily produces a valid, blank resume from the wrong object.
  //
  // Assertions are scoped to the h1: the name also appears in the Details <dd>,
  // so getByText would throw "found multiple elements" and, inside wait(), that
  // surfaces as an unhelpful timeout instead of a clear failure.
  it("accepts a bare resume document", async () => {
    axios.get.mockResolvedValue({ data: resumeFixture() });
    const { container } = renderApp();
    await wait(() => {
      expect(container.querySelector("h1").textContent).toContain(
        "Ada Lovelace"
      );
    });
  });

  it("accepts a { resume: ... } envelope", async () => {
    axios.get.mockResolvedValue({ data: { resume: resumeFixture() } });
    const { container } = renderApp();
    await wait(() => {
      expect(container.querySelector("h1").textContent).toContain(
        "Ada Lovelace"
      );
    });
  });
});
