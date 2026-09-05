import React from "react";
import { render, fireEvent, wait } from "@testing-library/react";
import { Provider } from "react-redux";
import axios from "axios";
import App from "./App";
import Site from "./components/site/index";
import { makeStore, renderWithStore } from "./test-utils/renderWithStore";
import { resumeFixture } from "./test-utils/fixtures";

// The stage-2 edit flow, end to end: the admin flag paints the chrome, the
// chrome exchanges a password for a token, the token unlocks one field, and the
// field's Save lands a PUT whose response replaces the store.
//
// Rendered through <App /> rather than through the pieces, because the two
// things most likely to regress silently span components: the admin bar lives
// in App while the Edit control lives in Profile, and they agree only through
// the editMode slice and sessionStorage.
//
// Toolchain notes, all load-bearing on this repo's pinned versions:
//   * @testing-library/react 9.5 has NO waitFor. `wait` is the async helper.
//   * dom-testing-library 6.16 (what RTL 9.5 resolves) silently ignores the
//     `level` option on ByRole heading queries, so heading structure is asserted
//     with querySelectorAll, exactly as src/components/site/index.test.js does.
//   * getByText matches an element's DIRECT text nodes, so `control(container, "Save", "About Me")`
//     finds the button even though it also carries a .visually-hidden " About
//     Me" span.
//
// The factory form of jest.mock keeps these tests independent of the
// "^axios$" -> "axios/dist/node/axios.cjs" mapping in package.json, and unlike
// App.test.js's mock this one has post and put, because this flow uses them.
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}));

const TOKEN = "signed.session.token";
const STORAGE_KEY = "personal-site.admin.session";

// The admin vhost's inline env-config.js emits a JS boolean. The flag is read
// per render by src/utils/env.js, so setting it before render is enough.
const enableAdminUi = () => {
  window.__ENV__ = { REACT_APP_SERVER_URL: "/api", REACT_APP_ADMIN: true };
};

// A live session already in storage, as after a reload. The editMode slice
// seeds `signedIn` from this when the store is CREATED, so it has to be written
// before any render helper runs.
// The sign-in panel is collapsed by default so the admin vhost looks like the
// public site. Every test that reaches the form has to open it first, exactly
// as a person would.
const openAdminPanel = (utils) => {
  fireEvent.click(utils.getByText("Admin"));
  return utils;
};

const seedStoredSession = () => {
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: TOKEN,
      username: "ada",
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    })
  );
};

const renderApp = () =>
  render(
    <Provider store={makeStore()}>
      <App />
    </Provider>
  );

// Resolves once the fetched resume is on screen. `wait` (not waitFor) on RTL 9.
const renderLoadedApp = async () => {
  axios.get.mockResolvedValue({ data: resumeFixture() });
  const utils = renderApp();
  await wait(() => {
    expect(utils.container.querySelector("h1")).not.toBeNull();
  });
  return utils;
};

// axios rejects with an object carrying `response`; adminApi normalises it.
const httpError = (status, data) => ({ response: { status, data } });
// Four sections are editable now -- About Me plus the three quotes -- so a bare
// control(container, "Save", "About Me") matches four buttons and throws. The accessible name is
// label + context ("Save About Me"), but getByText matches an element's DIRECT
// text nodes and the context lives in a child <span>, so it cannot see the whole
// name. These match on textContent instead.
const controls = (container, label, context) => {
  const wanted = (label + " " + context).replace(/\s+/g, " ").trim();
  return Array.prototype.slice
    .call(container.querySelectorAll("button.editcontrol"))
    .filter((node) => node.textContent.replace(/\s+/g, " ").trim() === wanted);
};

// Throws rather than returning the first match, so a duplicated context or a
// section wired to the wrong slot fails loudly here instead of silently
// asserting against whichever control happened to render first.
const control = (container, label, context) => {
  const found = controls(container, label, context);
  if (found.length !== 1) {
    throw new Error(
      'expected exactly one "' + label + " " + context + '" control, found ' +
        found.length
    );
  }
  return found[0];
};

const queryControl = (container, label, context) =>
  controls(container, label, context)[0] || null;

// Every SECTION edit control on the page, for "the public site gains nothing"
// and "signed out means no editing".
//
// The .adminbar filter is not tidying: the sign-in submit button is a raw
// <button className="editcontrol editcontroldark"> in adminbar/index.js rather
// than an <Editcontrol>, so it answers this selector while having nothing to do
// with editing a section. An open sign-in panel is exactly the state these
// assertions expect to see.
const allControls = (container) =>
  Array.prototype.slice
    .call(container.querySelectorAll("button.editcontrol"))
    .filter((node) => !node.closest(".adminbar"));


afterEach(() => {
  delete window.__ENV__;
  window.sessionStorage.clear();
});

describe("edit flow: the public render gains nothing", () => {
  it("paints no admin bar and no Edit control without the flag", async () => {
    const { container, queryByText, queryByLabelText } = await renderLoadedApp();

    expect(container.querySelector(".adminbar")).toBeNull();
    expect(container.querySelector(".editbar")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(allControls(container)).toHaveLength(0);
    expect(queryByLabelText("Username")).toBeNull();
    // The structural properties the 57 existing assertions protect, restated
    // here so a regression is caught in this file too rather than only in
    // site/index.test.js.
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll("section")).toHaveLength(3);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("still paints nothing when a stale token is in storage but the flag is off", async () => {
    seedStoredSession();
    const { container, queryByText } = await renderLoadedApp();

    expect(container.querySelector(".adminbar")).toBeNull();
    expect(allControls(container)).toHaveLength(0);
  });

  it("renders the description as plain text, not a field", async () => {
    const fixture = resumeFixture();
    axios.get.mockResolvedValue({ data: fixture });
    const { container } = renderApp();
    await wait(() => {
      expect(container.querySelector("h1")).not.toBeNull();
    });

    const body = container.querySelector(".aboutme .body");
    expect(body.textContent).toBe(fixture.profile.description);
    expect(body.querySelector("textarea")).toBeNull();
  });
});

describe("edit flow: signing in", () => {
  it("shows the sign-in form, and no Edit control, before a token exists", async () => {
    enableAdminUi();
    const {
      container, getByText, getByLabelText, queryByLabelText, queryByText,
    } = await renderLoadedApp();

    expect(container.querySelector(".adminbar")).not.toBeNull();
    // Collapsed by default: the trigger is the only admin chrome on screen, so
    // the admin vhost reads as the site rather than as a tool.
    expect(queryByLabelText("Username")).toBeNull();

    fireEvent.click(getByText("Admin"));
    expect(getByLabelText("Username")).toBeInTheDocument();
    expect(getByLabelText("Password")).toBeInTheDocument();
    expect(allControls(container)).toHaveLength(0);
  });

  it("exchanges the password for a token and unlocks the Edit control", async () => {
    enableAdminUi();
    axios.post.mockResolvedValue({
      data: { token: TOKEN, expiresIn: 28800 },
    });
    const { container, getByLabelText, getByText } = await renderLoadedApp();

    fireEvent.click(getByText("Admin"));
    fireEvent.change(getByLabelText("Username"), { target: { value: "ada" } });
    fireEvent.change(getByLabelText("Password"), { target: { value: "hunter2" } });
    fireEvent.click(getByText("Sign in"));

    await wait(() => {
      expect(control(container, "Edit", "About Me")).toBeInTheDocument();
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body] = axios.post.mock.calls[0];
    expect(url).toBe("/api/session");
    expect(body).toEqual({ username: "ada", password: "hunter2" });
    // The token is kept out of Redux on purpose; sessionStorage is its only
    // home, so a DevTools state snapshot never contains a write credential.
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)).token).toBe(
      TOKEN
    );
  });

  it("names a wrong password as a wrong password, not as a dead session", async () => {
    // The reason adminApi checks the body's `code` before the HTTP status:
    // POST /session answers a bad password with 401 invalid_credentials, and a
    // status-first branch would tell the user to sign in again -- i.e. to redo
    // the thing that just failed.
    enableAdminUi();
    axios.post.mockRejectedValue(
      httpError(401, { code: "invalid_credentials", error: "Invalid username or password" })
    );
    const { getByLabelText, getByText, queryByText, container } =
      await renderLoadedApp();

    fireEvent.click(getByText("Admin"));
    fireEvent.change(getByLabelText("Username"), { target: { value: "ada" } });
    fireEvent.change(getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(getByText("Sign in"));

    await wait(() => {
      expect(container.querySelector(".adminbarmessage")).not.toBeNull();
    });
    expect(container.querySelector(".adminbarmessage").textContent).toMatch(
      /did not match/i
    );
    expect(container.querySelector(".adminbarmessage").textContent).not.toMatch(
      /sign in again/i
    );
    expect(allControls(container)).toHaveLength(0);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("says what to fix when the server has no session secret", async () => {
    enableAdminUi();
    axios.post.mockRejectedValue(httpError(503, { code: "not_configured" }));
    const { getByLabelText, getByText, container } = await renderLoadedApp();

    fireEvent.click(getByText("Admin"));
    fireEvent.change(getByLabelText("Username"), { target: { value: "ada" } });
    fireEvent.change(getByLabelText("Password"), { target: { value: "hunter2" } });
    fireEvent.click(getByText("Sign in"));

    await wait(() => {
      expect(container.querySelector(".adminbarmessage")).not.toBeNull();
    });
    expect(container.querySelector(".adminbarmessage").textContent).toMatch(
      /ADMIN_SESSION_SECRET/
    );
  });

  it("signs out of both copies of the session at once", async () => {
    enableAdminUi();
    seedStoredSession();
    const { container, getByText, queryByText } = await renderLoadedApp();

    // Seeded from storage when the store was created, so the reload case is
    // covered too: a live session comes back to the editor, not to the form.
    expect(control(container, "Edit", "About Me")).toBeInTheDocument();

    // Signed in, so the trigger reads "Editing" and Sign out is in the panel.
    fireEvent.click(getByText("Editing"));
    fireEvent.click(getByText("Sign out"));

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(allControls(container)).toHaveLength(0);
  });
});

describe("edit flow: editing About Me", () => {
  const signedInApp = async () => {
    enableAdminUi();
    seedStoredSession();
    return renderLoadedApp();
  };

  it("opens a field seeded from the store, named by the existing sub-heading", async () => {
    const fixture = resumeFixture();
    enableAdminUi();
    seedStoredSession();
    axios.get.mockResolvedValue({ data: fixture });
    const { container, getByText } = renderApp();
    await wait(() => {
      expect(container.querySelector("h1")).not.toBeNull();
    });

    fireEvent.click(control(container, "Edit", "About Me"));

    const field = container.querySelector("textarea");
    expect(field).not.toBeNull();
    expect(field.value).toBe(fixture.profile.description);
    // The <h3> that was already there is the field's accessible name, so edit
    // mode introduces no new id.
    expect(field.getAttribute("aria-labelledby")).toBe("aboutmeTitle");
    const ids = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((node) => node.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("adds no heading, section, anchor or list while editing", async () => {
    const { container, getByText } = await signedInApp();
    const before = {
      headings: container.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
      sections: container.querySelectorAll("section").length,
      anchors: container.querySelectorAll("a").length,
      lists: container.querySelectorAll("ul").length,
      items: container.querySelectorAll("li").length,
    };

    fireEvent.click(control(container, "Edit", "About Me"));

    expect(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).toHaveLength(
      before.headings
    );
    expect(container.querySelectorAll("section")).toHaveLength(before.sections);
    expect(container.querySelectorAll("a")).toHaveLength(before.anchors);
    expect(container.querySelectorAll("ul")).toHaveLength(before.lists);
    expect(container.querySelectorAll("li")).toHaveLength(before.items);
  });

  it("keeps Save inert until something actually changed", async () => {
    const { container, getByText } = await signedInApp();
    fireEvent.click(control(container, "Edit", "About Me"));

    expect(control(container, "Save", "About Me").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(control(container, "Save", "About Me"));
    expect(axios.put).not.toHaveBeenCalled();

    fireEvent.change(container.querySelector("textarea"), {
      target: { value: "Rewritten." },
    });
    expect(control(container, "Save", "About Me").getAttribute("aria-disabled")).toBeNull();
    expect(container.querySelector(".editstatus").textContent).toBe(
      "Unsaved changes"
    );
  });

  it("PUTs only the changed path, with the bearer token, and takes the response as truth", async () => {
    const { container, getByText } = await signedInApp();
    const saved = resumeFixture();
    saved.profile.description = "Server's own copy.";
    axios.put.mockResolvedValue({ data: saved });

    fireEvent.click(control(container, "Edit", "About Me"));
    fireEvent.change(container.querySelector("textarea"), {
      target: { value: "Rewritten." },
    });
    fireEvent.click(control(container, "Save", "About Me"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    expect(axios.put).toHaveBeenCalledTimes(1);
    const [url, body, config] = axios.put.mock.calls[0];
    expect(url).toBe("/api/updateResume");
    // Exactly one allowlist path, and no other field is sent along for the ride.
    expect(body).toEqual({ updates: { "profile.description": "Rewritten." } });
    expect(config.headers.Authorization).toBe(`Bearer ${TOKEN}`);

    // The field repaints from the document the API returned, not from the local
    // draft: public_view() is shared by GET and PUT so the response is the only
    // correct picture of what the page should now show.
    expect(container.querySelector("textarea").value).toBe("Server's own copy.");
    // Save saves; Done exits. The editor is still open.
    expect(control(container, "Done", "About Me")).toBeInTheDocument();
  });

  it("reverts to the stored value on Cancel without leaving edit mode", async () => {
    const fixture = resumeFixture();
    enableAdminUi();
    seedStoredSession();
    axios.get.mockResolvedValue({ data: fixture });
    const { container, getByText } = renderApp();
    await wait(() => {
      expect(container.querySelector("h1")).not.toBeNull();
    });

    fireEvent.click(control(container, "Edit", "About Me"));
    fireEvent.change(container.querySelector("textarea"), {
      target: { value: "Throw this away." },
    });
    fireEvent.click(control(container, "Cancel", "About Me"));

    expect(container.querySelector("textarea").value).toBe(
      fixture.profile.description
    );
    expect(axios.put).not.toHaveBeenCalled();
    expect(control(container, "Done", "About Me")).toBeInTheDocument();
  });

  it("closes on Done and puts the paragraph back", async () => {
    const fixture = resumeFixture();
    enableAdminUi();
    seedStoredSession();
    axios.get.mockResolvedValue({ data: fixture });
    const { container, getByText } = renderApp();
    await wait(() => {
      expect(container.querySelector("h1")).not.toBeNull();
    });

    fireEvent.click(control(container, "Edit", "About Me"));
    fireEvent.click(control(container, "Done", "About Me"));

    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector(".aboutme .body").textContent).toBe(
      fixture.profile.description
    );
    expect(control(container, "Edit", "About Me")).toBeInTheDocument();
  });

  it("asks before discarding unsaved text on Done", async () => {
    // jsdom's window.confirm is a stub that logs "Not implemented" and returns
    // undefined, so it MUST be replaced here -- an unstubbed run would make this
    // assertion depend on that stub's falsy return.
    const confirmSpy = jest
      .spyOn(window, "confirm")
      .mockImplementation(() => false);
    try {
      const { container, getByText } = await signedInApp();
      fireEvent.click(control(container, "Edit", "About Me"));
      fireEvent.change(container.querySelector("textarea"), {
        target: { value: "Half a sentence" },
      });

      fireEvent.click(control(container, "Done", "About Me"));
      expect(confirmSpy).toHaveBeenCalled();
      // Declined: still editing, text intact.
      expect(container.querySelector("textarea").value).toBe("Half a sentence");

      confirmSpy.mockImplementation(() => true);
      fireEvent.click(control(container, "Done", "About Me"));
      expect(container.querySelector("textarea")).toBeNull();
    } finally {
      confirmSpy.mockRestore();
    }
  });
});

describe("edit flow: when a save fails", () => {
  const signedInApp = async () => {
    enableAdminUi();
    seedStoredSession();
    return renderLoadedApp();
  };

  const typeAndSave = (container, text) => {
    fireEvent.click(control(container, "Edit", "About Me"));
    fireEvent.change(container.querySelector("textarea"), {
      target: { value: text },
    });
    fireEvent.click(control(container, "Save", "About Me"));
  };

  it("names the field the server rejected and keeps the typed text", async () => {
    const { container, getByText } = await signedInApp();
    axios.put.mockRejectedValue(
      httpError(400, {
        code: "validation_failed",
        errors: [
          { path: "profile.description", detail: "longer than 4000 characters" },
        ],
      })
    );

    typeAndSave(container, "Far too long.");

    await wait(() => {
      expect(container.querySelector(".editerror")).not.toBeNull();
    });
    const message = container.querySelector(".editerror").textContent;
    expect(message).toMatch(/profile\.description/);
    expect(message).toMatch(/longer than 4000 characters/);
    // The draft is the only copy of the user's work: a failure must not touch
    // it and must not close the section.
    expect(container.querySelector("textarea").value).toBe("Far too long.");
    expect(control(container, "Save", "About Me")).toBeInTheDocument();
    // The field points at the message, so it is read out with the field.
    expect(container.querySelector("textarea").getAttribute("aria-describedby")).toBe(
      "profile-saveerror"
    );
  });

  it("says the read-only vhost when nginx refuses the write with a 403", async () => {
    // The forged-flag path: the admin bundle opened on port 80, where
    // `limit_except GET HEAD { deny all; }` answers an HTML 403 that never
    // reaches Flask. "Something went wrong" would send someone hunting through
    // logs that contain no record of the request.
    const { container, getByText } = await signedInApp();
    axios.put.mockRejectedValue({
      response: { status: 403, data: "<html>403 Forbidden</html>" },
    });

    typeAndSave(container, "Rewritten.");

    await wait(() => {
      expect(container.querySelector(".editerror")).not.toBeNull();
    });
    expect(container.querySelector(".editerror").textContent).toMatch(
      /read-only/i
    );
  });

  it("keeps the draft on screen when the session expires mid-edit", async () => {
    const { container, getByText, getByLabelText } = await signedInApp();
    axios.put.mockRejectedValue(
      httpError(401, { code: "session_expired", error: "Session expired" })
    );

    typeAndSave(container, "Written over eight hours.");

    await wait(() => {
      expect(container.querySelector(".editerror")).not.toBeNull();
    });

    // Signed out of both copies...
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    fireEvent.click(getByText("Admin"));
    expect(getByLabelText("Username")).toBeInTheDocument();
    // ...but the session expired, and the paragraph being typed did not. The
    // editor is gated on the open section, not on being signed in, precisely so
    // a clock cannot delete someone's work.
    expect(container.querySelector("textarea").value).toBe(
      "Written over eight hours."
    );
    expect(container.querySelector(".editerror").textContent).toMatch(
      /still here/i
    );
    // Save is inert until there is a token again.
    expect(control(container, "Save", "About Me").getAttribute("aria-disabled")).toBe("true");
  });

  it("offers a retryable message, and no lost text, when the API is unreachable", async () => {
    const { container, getByText } = await signedInApp();
    axios.put.mockRejectedValue(new Error("Network Error"));

    typeAndSave(container, "Rewritten.");

    await wait(() => {
      expect(container.querySelector(".editerror")).not.toBeNull();
    });
    expect(container.querySelector(".editerror").textContent).toMatch(
      /usually temporary/i
    );
    expect(container.querySelector("textarea").value).toBe("Rewritten.");
  });
});

describe("edit flow: editing before the resume loads is impossible", () => {
  it("offers no Edit control against the un-hydrated skeleton", () => {
    // The gate that does not depend on App's render decision. `loaded` is set by
    // the resume slice's `update` reducer and by nothing else, so a store that
    // has never seen a payload cannot open an editor -- even with the admin flag
    // on and a live token in storage.
    enableAdminUi();
    seedStoredSession();
    const { container, queryByText } = renderWithStore(<Site />, {
      resume: null,
    });

    expect(allControls(container)).toHaveLength(0);
    expect(container.querySelector(".editbar")).toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("offers it once a real payload has been merged", () => {
    enableAdminUi();
    seedStoredSession();
    const { container, getByText } = renderWithStore(<Site />);
    expect(control(container, "Edit", "About Me")).toBeInTheDocument();
  });
});

describe("edit flow: the admin panel opens and closes", () => {
  // The panel's WIDTH is not asserted anywhere: jsdom does no layout, so a
  // box-sizing regression (which is exactly what escaped last time) would pass
  // vacuously here. That one is verified in a browser.
  it("stays closed until asked, and closes again on a second click", async () => {
    enableAdminUi();
    const { getByText, queryByLabelText } = await renderLoadedApp();

    expect(queryByLabelText("Username")).toBeNull();
    fireEvent.click(getByText("Admin"));
    expect(queryByLabelText("Username")).not.toBeNull();
    fireEvent.click(getByText("Admin"));
    expect(queryByLabelText("Username")).toBeNull();
  });

  it("closes when you click outside, and stays open when you click inside", async () => {
    enableAdminUi();
    const { container, getByText, getByLabelText, queryByLabelText } =
      await renderLoadedApp();

    fireEvent.click(getByText("Admin"));

    // mousedown, not click: the handler listens for mousedown so that selecting
    // text in a field and releasing past its edge does not close the panel out
    // from under the drag.
    fireEvent.mouseDown(getByLabelText("Username"));
    expect(queryByLabelText("Username")).not.toBeNull();

    fireEvent.mouseDown(container.querySelector("h1"));
    expect(queryByLabelText("Username")).toBeNull();
    expect(getByText("Admin").getAttribute("aria-expanded")).toBe("false");
  });

  it("opens empty every time, however it was closed", async () => {
    // Three ways to close, and none of them may leave a half-typed credential
    // sitting in the DOM for the next time the panel opens.
    enableAdminUi();
    const { container, getByText, getByLabelText } = await renderLoadedApp();

    const type = () => {
      fireEvent.change(getByLabelText("Username"), { target: { value: "ada" } });
      fireEvent.change(getByLabelText("Password"), { target: { value: "hunter2" } });
    };
    const reopen = () => {
      fireEvent.click(getByText("Admin"));
      return {
        user: getByLabelText("Username").value,
        pass: getByLabelText("Password").value,
      };
    };

    // 1. the trigger
    fireEvent.click(getByText("Admin"));
    type();
    fireEvent.click(getByText("Admin"));
    expect(reopen()).toEqual({ user: "", pass: "" });

    // 2. a click outside
    type();
    fireEvent.mouseDown(container.querySelector("h1"));
    expect(reopen()).toEqual({ user: "", pass: "" });

    // 3. Escape
    type();
    fireEvent.keyDown(container.querySelector(".adminpanel"), { key: "Escape" });
    expect(reopen()).toEqual({ user: "", pass: "" });
  });

  it("does not keep a failed attempt's error around either", async () => {
    enableAdminUi();
    axios.post.mockRejectedValue(
      httpError(401, { code: "invalid_credentials", error: "Invalid username or password" })
    );
    const { container, getByText, getByLabelText } = await renderLoadedApp();

    fireEvent.click(getByText("Admin"));
    fireEvent.change(getByLabelText("Username"), { target: { value: "ada" } });
    fireEvent.change(getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(getByText("Sign in"));

    await wait(() => {
      expect(container.querySelector(".adminbarmessage")).not.toBeNull();
    });

    fireEvent.click(getByText("Admin"));
    fireEvent.click(getByText("Admin"));
    expect(container.querySelector(".adminbarmessage")).toBeNull();
  });

  it("reports its expanded state to assistive tech", async () => {
    enableAdminUi();
    const { getByText } = await renderLoadedApp();

    const trigger = getByText("Admin");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe("adminpanel");

    fireEvent.click(trigger);
    expect(getByText("Admin").getAttribute("aria-expanded")).toBe("true");
  });
});

// ===========================================================================
// Quotes: the first section with TWO fields, the first indexed path, and the
// first time more than one section on the page is editable at once. Each of
// those three is a new way to be wrong, and none of them is covered by the
// About Me tests above.
// ===========================================================================
describe("edit flow: editing the quotes", () => {
  const signedInAppWith = async (fixture) => {
    enableAdminUi();
    seedStoredSession();
    axios.get.mockResolvedValue({ data: fixture || resumeFixture() });
    const utils = renderApp();
    await wait(() => {
      expect(utils.container.querySelector("h1")).not.toBeNull();
    });
    return utils;
  };

  const fieldsOf = (container, section) => ({
    quote: container.querySelector("#" + section + "-quoteEdit"),
    by: container.querySelector("#" + section + "-byEdit"),
  });

  const openQuote = (container, section, name) => {
    fireEvent.click(control(container, "Edit", name + " quote"));
    return fieldsOf(container, section);
  };

  it("opens both fields, seeded from the slot the section owns", async () => {
    const { container } = await signedInAppWith();

    const { quote, by } = openQuote(container, "abilities", "Abilities");

    // The whole point of the assertion: Abilities owns quotes[1]. An
    // off-by-one renders a plausible-looking editor over another band's text
    // and is invisible until it saves into the wrong slot.
    expect(quote.value).toBe("Abilities quote");
    expect(by.value).toBe("- B");
  });

  it("names the two fields differently", async () => {
    const { container } = await signedInAppWith();

    const { quote, by } = openQuote(container, "experiences", "Experiences");

    // About Me could borrow the <h3> above it for its accessible name. A quote
    // has no such heading -- the only id nearby is the band's own <h2>, which
    // would name BOTH fields "Experiences" and leave a screen-reader user
    // unable to tell the quote from the attribution.
    expect(quote.getAttribute("aria-label")).toBe("Experiences quote");
    expect(by.getAttribute("aria-label")).toBe("Experiences attribution");
    expect(quote.getAttribute("aria-label")).not.toBe(
      by.getAttribute("aria-label")
    );
  });

  it("sends both changed paths in a single PUT", async () => {
    const saved = resumeFixture();
    axios.put.mockResolvedValue({ data: saved });
    const { container } = await signedInAppWith();

    const { quote, by } = openQuote(container, "experiences", "Experiences");
    fireEvent.change(quote, { target: { value: "A better quote." } });
    fireEvent.change(by, { target: { value: "- Ada" } });
    fireEvent.click(control(container, "Save", "Experiences quote"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    const [url, body] = axios.put.mock.calls[0];
    expect(url).toBe("/api/updateResume");
    expect(body).toEqual({
      updates: {
        "quotes.0.quote": "A better quote.",
        "quotes.0.by": "- Ada",
      },
    });
  });

  it("sends only the field that changed, not both", async () => {
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInAppWith();

    const { by } = openQuote(container, "abilities", "Abilities");
    fireEvent.change(by, { target: { value: "- Someone else" } });
    fireEvent.click(control(container, "Save", "Abilities quote"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    // The guard against a FIELDS.map that sends every path in the section
    // whether or not it was touched -- which would rewrite an untouched quote
    // with its own value and hide a concurrent edit.
    const [, body] = axios.put.mock.calls[0];
    expect(body).toEqual({ updates: { "quotes.1.by": "- Someone else" } });
    expect(Object.keys(body.updates)).not.toContain("quotes.1.quote");
  });

  it("keeps Save inert when a field is typed back to its stored value", async () => {
    const { container } = await signedInAppWith();

    const { quote } = openQuote(container, "experiences", "Experiences");
    const save = control(container, "Save", "Experiences quote");
    expect(save.getAttribute("aria-disabled")).toBe("true");

    fireEvent.change(quote, { target: { value: "Something else." } });
    expect(
      control(container, "Save", "Experiences quote").getAttribute(
        "aria-disabled"
      )
    ).toBeNull();

    // Dirtiness is derived by comparing the draft to the store, so typing it
    // back is genuinely clean -- not merely "a draft exists for this path".
    fireEvent.change(quote, { target: { value: "Experiences quote" } });
    expect(
      control(container, "Save", "Experiences quote").getAttribute(
        "aria-disabled"
      )
    ).toBe("true");
  });

  it("repaints from the response rather than the local draft", async () => {
    const saved = resumeFixture();
    saved.quotes[2].quote = "Server's own copy.";
    axios.put.mockResolvedValue({ data: saved });
    const { container } = await signedInAppWith();

    const { quote } = openQuote(container, "contact", "Contact");
    fireEvent.change(quote, { target: { value: "Mine." } });
    fireEvent.click(control(container, "Save", "Contact quote"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    expect(fieldsOf(container, "contact").quote.value).toBe(
      "Server's own copy."
    );
  });

  it("offers an attribution field even when the stored attribution is empty", async () => {
    const fixture = resumeFixture();
    fixture.quotes[0].by = "";
    const { container } = await signedInAppWith(fixture);

    // Read mode drops the element entirely when `by` is empty. If edit mode
    // did the same, clearing an attribution would remove the only control that
    // could type it back -- the mistake would delete its own fix.
    expect(container.querySelectorAll(".titles .subtitle.by")).toHaveLength(2);

    const { quote, by } = openQuote(container, "experiences", "Experiences");
    expect(quote).not.toBeNull();
    expect(by).not.toBeNull();
    expect(by.value).toBe("");
  });

  it("adds no heading, section, anchor or list while a quote is edited", async () => {
    const { container } = await signedInAppWith();
    const count = (selector) => container.querySelectorAll(selector).length;

    const before = {
      headings: count("h1,h2,h3,h4,h5,h6"),
      sections: count("section"),
      anchors: count("a"),
      lists: count("ul"),
      items: count("li"),
    };

    // The footer, deliberately: its editor lands inside the contentinfo
    // landmark, immediately beside a <ul> of three links.
    openQuote(container, "contact", "Contact");

    expect(count("h1,h2,h3,h4,h5,h6")).toBe(before.headings);
    expect(count("section")).toBe(before.sections);
    expect(count("a")).toBe(before.anchors);
    expect(count("ul")).toBe(before.lists);
    expect(count("li")).toBe(before.items);
  });

  it("keeps the landmarks and the band's accessible name while editing", async () => {
    const { container, getAllByRole } = await signedInAppWith();

    openQuote(container, "contact", "Contact");

    expect(getAllByRole("contentinfo")).toHaveLength(1);
    expect(getAllByRole("main")).toHaveLength(1);
    expect(getAllByRole("banner")).toHaveLength(1);
    // The <h2> is the aria-labelledby target for its band. Replacing it,
    // rather than the .subtitle below it, would leave a band named by nothing.
    expect(container.querySelector("#contact-title").textContent.trim()).toBe(
      "Contact"
    );
  });

  it("keeps every id on the page unique with a quote editor open", async () => {
    const { container } = await signedInAppWith();

    openQuote(container, "experiences", "Experiences");

    const ids = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((node) => node.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("opens one section at a time", async () => {
    const { container } = await signedInAppWith();

    openQuote(container, "experiences", "Experiences");
    expect(fieldsOf(container, "experiences").quote).not.toBeNull();

    openQuote(container, "abilities", "Abilities");
    expect(fieldsOf(container, "experiences").quote).toBeNull();
    expect(fieldsOf(container, "abilities").quote).not.toBeNull();
  });

  it("asks before opening a second section over unsaved work", async () => {
    const { container } = await signedInAppWith();
    const confirm = jest.spyOn(window, "confirm");
    try {
      const { quote } = openQuote(container, "experiences", "Experiences");
      fireEvent.change(quote, { target: { value: "Half a thought" } });

      // sectionOpened empties the drafts, so without this guard clicking a
      // second Edit discards the first section's typing with no prompt and no
      // undo. jsdom's window.confirm is a stub returning undefined, which is
      // falsy -- so an unguarded implementation would still pass a test that
      // only mocked it to false. Assert the draft survives instead.
      confirm.mockImplementation(() => false);
      fireEvent.click(control(container, "Edit", "Abilities quote"));

      expect(confirm).toHaveBeenCalled();
      expect(fieldsOf(container, "experiences").quote.value).toBe(
        "Half a thought"
      );
      expect(fieldsOf(container, "abilities").quote).toBeNull();

      confirm.mockImplementation(() => true);
      fireEvent.click(control(container, "Edit", "Abilities quote"));
      expect(fieldsOf(container, "experiences").quote).toBeNull();
      expect(fieldsOf(container, "abilities").quote).not.toBeNull();
    } finally {
      confirm.mockRestore();
    }
  });

  it("does not ask when the first section has nothing unsaved", async () => {
    const { container } = await signedInAppWith();
    const confirm = jest.spyOn(window, "confirm").mockImplementation(() => false);
    try {
      openQuote(container, "experiences", "Experiences");
      // Opened and touched nothing: there is no work to lose, so a prompt here
      // would be a nag that trains the operator to dismiss the real one.
      fireEvent.click(control(container, "Edit", "Abilities quote"));

      expect(confirm).not.toHaveBeenCalled();
      expect(fieldsOf(container, "abilities").quote).not.toBeNull();
    } finally {
      confirm.mockRestore();
    }
  });

  it("opens over a backfilled slot without offering to save it", async () => {
    // One quote in the database; the reducer backfills the other two to
    // { quote: "", by: "" } so the fixed-index reads cannot throw.
    const thin = resumeFixture();
    thin.quotes = [{ quote: "only one", by: "- A" }];
    const { container } = await signedInAppWith(thin);

    const { quote, by } = openQuote(container, "contact", "Contact");

    expect(quote.value).toBe("");
    expect(by.value).toBe("");
    // The quotes-specific half of the "Save blanked my resume" gate: a
    // backfilled slot is not itself dirty, so Save has nothing to write into a
    // document whose array is shorter than this index.
    expect(
      control(container, "Save", "Contact quote").getAttribute("aria-disabled")
    ).toBe("true");
    expect(axios.put).not.toHaveBeenCalled();
  });

  it("names the rejected path and keeps both drafts when the server refuses", async () => {
    axios.put.mockRejectedValue(
      httpError(400, {
        code: "validation_failed",
        errors: [
          { path: "quotes.1.quote", detail: "longer than 4000 characters" },
        ],
      })
    );
    const { container } = await signedInAppWith();

    const { quote, by } = openQuote(container, "abilities", "Abilities");
    fireEvent.change(quote, { target: { value: "Far too long." } });
    fireEvent.change(by, { target: { value: "- Ada" } });
    fireEvent.click(control(container, "Save", "Abilities quote"));

    await wait(() => {
      expect(container.querySelector(".editerror")).not.toBeNull();
    });

    const band = container.querySelector(".editerror");
    expect(band.textContent).toMatch(/quotes\.1\.quote/);
    expect(band.id).toBe("abilities-saveerror");

    // The draft is the only copy of the user's work; a refusal never touches it.
    const after = fieldsOf(container, "abilities");
    expect(after.quote.value).toBe("Far too long.");
    expect(after.by.value).toBe("- Ada");
    expect(after.quote.getAttribute("aria-describedby")).toBe(
      "abilities-saveerror"
    );
  });
});
