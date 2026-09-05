import React from "react";
import { render, fireEvent, wait } from "@testing-library/react";
import { Provider } from "react-redux";
import axios from "axios";
import App from "./App";
import Site from "./components/site/index";
import { makeStore, renderWithStore } from "./test-utils/renderWithStore";
import { resumeFixture } from "./test-utils/fixtures";
import { sameValue, useSectionEditor } from "./utils/useSectionEditor";
import { sectionOpened, draftChanged } from "./reducers/editMode";

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
//   * getByText matches an element's DIRECT text nodes, so `control(container, "Save", "Profile")`
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
// control(container, "Save", "Profile") matches four buttons and throws. The accessible name is
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
      expect(control(container, "Edit", "Profile")).toBeInTheDocument();
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
    expect(control(container, "Edit", "Profile")).toBeInTheDocument();

    // Signed in, so the trigger reads "Editing" and Sign out is in the panel.
    fireEvent.click(getByText("Editing"));
    fireEvent.click(getByText("Sign out"));

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(allControls(container)).toHaveLength(0);
  });
});

// The Profile band opens FIVE fields now -- subtitle, About Me, name, age and
// location -- so container.querySelector("textarea") no longer means "the About
// Me field"; it means whichever comes first in the DOM, which is the subtitle.
// These target #aboutmeEdit by id. The .toBeNull() assertions are left alone:
// they mean "no field anywhere", which is still exactly what they say.
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

    fireEvent.click(control(container, "Edit", "Profile"));

    const field = container.querySelector("#aboutmeEdit");
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

    fireEvent.click(control(container, "Edit", "Profile"));

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
    fireEvent.click(control(container, "Edit", "Profile"));

    expect(control(container, "Save", "Profile").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(control(container, "Save", "Profile"));
    expect(axios.put).not.toHaveBeenCalled();

    fireEvent.change(container.querySelector("#aboutmeEdit"), {
      target: { value: "Rewritten." },
    });
    expect(control(container, "Save", "Profile").getAttribute("aria-disabled")).toBeNull();
    expect(container.querySelector(".editstatus").textContent).toBe(
      "Unsaved changes"
    );
  });

  it("PUTs only the changed path, with the bearer token, and takes the response as truth", async () => {
    const { container, getByText } = await signedInApp();
    const saved = resumeFixture();
    saved.profile.description = "Server's own copy.";
    axios.put.mockResolvedValue({ data: saved });

    fireEvent.click(control(container, "Edit", "Profile"));
    fireEvent.change(container.querySelector("#aboutmeEdit"), {
      target: { value: "Rewritten." },
    });
    fireEvent.click(control(container, "Save", "Profile"));

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
    expect(container.querySelector("#aboutmeEdit").value).toBe("Server's own copy.");
    // Save saves; Done exits. The editor is still open.
    expect(control(container, "Done", "Profile")).toBeInTheDocument();
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

    fireEvent.click(control(container, "Edit", "Profile"));
    fireEvent.change(container.querySelector("#aboutmeEdit"), {
      target: { value: "Throw this away." },
    });
    fireEvent.click(control(container, "Cancel", "Profile"));

    expect(container.querySelector("#aboutmeEdit").value).toBe(
      fixture.profile.description
    );
    expect(axios.put).not.toHaveBeenCalled();
    expect(control(container, "Done", "Profile")).toBeInTheDocument();
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

    fireEvent.click(control(container, "Edit", "Profile"));
    fireEvent.click(control(container, "Done", "Profile"));

    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector(".aboutme .body").textContent).toBe(
      fixture.profile.description
    );
    expect(control(container, "Edit", "Profile")).toBeInTheDocument();
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
      fireEvent.click(control(container, "Edit", "Profile"));
      fireEvent.change(container.querySelector("#aboutmeEdit"), {
        target: { value: "Half a sentence" },
      });

      fireEvent.click(control(container, "Done", "Profile"));
      expect(confirmSpy).toHaveBeenCalled();
      // Declined: still editing, text intact.
      expect(container.querySelector("#aboutmeEdit").value).toBe("Half a sentence");

      confirmSpy.mockImplementation(() => true);
      fireEvent.click(control(container, "Done", "Profile"));
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
    fireEvent.click(control(container, "Edit", "Profile"));
    fireEvent.change(container.querySelector("#aboutmeEdit"), {
      target: { value: text },
    });
    fireEvent.click(control(container, "Save", "Profile"));
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
    expect(container.querySelector("#aboutmeEdit").value).toBe("Far too long.");
    expect(control(container, "Save", "Profile")).toBeInTheDocument();
    // The field points at the message, so it is read out with the field.
    expect(container.querySelector("#aboutmeEdit").getAttribute("aria-describedby")).toBe(
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
    expect(container.querySelector("#aboutmeEdit").value).toBe(
      "Written over eight hours."
    );
    expect(container.querySelector(".editerror").textContent).toMatch(
      /still here/i
    );
    // Save is inert until there is a token again.
    expect(control(container, "Save", "Profile").getAttribute("aria-disabled")).toBe("true");
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
    expect(container.querySelector("#aboutmeEdit").value).toBe("Rewritten.");
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
    expect(control(container, "Edit", "Profile")).toBeInTheDocument();
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
    fireEvent.click(control(container, "Edit", name));
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
    fireEvent.click(control(container, "Save", "Experiences"));

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
    fireEvent.click(control(container, "Save", "Abilities"));

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
    const save = control(container, "Save", "Experiences");
    expect(save.getAttribute("aria-disabled")).toBe("true");

    fireEvent.change(quote, { target: { value: "Something else." } });
    expect(
      control(container, "Save", "Experiences").getAttribute(
        "aria-disabled"
      )
    ).toBeNull();

    // Dirtiness is derived by comparing the draft to the store, so typing it
    // back is genuinely clean -- not merely "a draft exists for this path".
    fireEvent.change(quote, { target: { value: "Experiences quote" } });
    expect(
      control(container, "Save", "Experiences").getAttribute(
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
    fireEvent.click(control(container, "Save", "Contact"));

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
    expect(count("ul")).toBe(before.lists);
    expect(count("li")).toBe(before.items);

    // The anchors are the ONE deliberate exception, and only in this band: the
    // footer editor owns links.email/linkedin/github, and each link's field
    // REPLACES its <a> rather than sitting beside it. The <li>s that hold them
    // are untouched above, so the list semantics survive; what goes is the
    // three links themselves, leaving only the skip link.
    expect(count("a")).toBe(before.anchors - 3);
    expect(container.querySelectorAll("a.skip-link")).toHaveLength(1);
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
      fireEvent.click(control(container, "Edit", "Abilities"));

      expect(confirm).toHaveBeenCalled();
      expect(fieldsOf(container, "experiences").quote.value).toBe(
        "Half a thought"
      );
      expect(fieldsOf(container, "abilities").quote).toBeNull();

      confirm.mockImplementation(() => true);
      fireEvent.click(control(container, "Edit", "Abilities"));
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
      fireEvent.click(control(container, "Edit", "Abilities"));

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
      control(container, "Save", "Contact").getAttribute("aria-disabled")
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
    fireEvent.click(control(container, "Save", "Abilities"));

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

// ===========================================================================
// The rest of the scalars the server allowlists: the Profile band's subtitle,
// name, age and location, and the footer's three contact links. No new section
// and no new mechanism -- these are entries in an existing FIELDS array, which
// is the property worth pinning.
// ===========================================================================
describe("edit flow: editing the remaining profile fields", () => {
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

  const openProfile = (container) =>
    fireEvent.click(control(container, "Edit", "Profile"));

  const openContact = (container) =>
    fireEvent.click(control(container, "Edit", "Contact"));

  it("opens all five profile fields, each seeded from its own path", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInAppWith(fixture);

    openProfile(container);

    expect(container.querySelector("#profile-subtitleEdit").value).toBe(
      fixture.profile.subtitle
    );
    expect(container.querySelector("#aboutmeEdit").value).toBe(
      fixture.profile.description
    );
    expect(container.querySelector("#profile-nameEdit").value).toBe(
      fixture.profile.name
    );
    expect(container.querySelector("#profile-ageEdit").value).toBe(
      fixture.profile.age
    );
    expect(container.querySelector("#profile-locationEdit").value).toBe(
      fixture.profile.location
    );
  });

  it("leaves the h1 a plain heading while the name is being edited", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInAppWith(fixture);

    openProfile(container);
    fireEvent.change(container.querySelector("#profile-nameEdit"), {
      target: { value: "Someone Else" },
    });

    // profile.name renders twice -- here and as the <h1>. It is editable in the
    // Details list precisely so the h1 is never a field: exactly one, still a
    // heading, and still showing the SAVED name rather than the draft.
    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].querySelector("textarea")).toBeNull();
    expect(headings[0].textContent.trim()).toBe(fixture.profile.name);
  });

  it("keeps the definition list intact, with the fields inside the cells", async () => {
    const { container } = await signedInAppWith();

    openProfile(container);

    const dl = container.querySelector(".details dl");
    expect(dl).not.toBeNull();
    expect(dl.querySelectorAll("dt")).toHaveLength(3);
    expect(dl.querySelectorAll("dd")).toHaveLength(3);
    // Each field is INSIDE its <dd>, not in place of it -- the dt/dd pairing is
    // the whole accessibility story of this block.
    const cells = dl.querySelectorAll("dd");
    expect(cells[0].querySelector("#profile-nameEdit")).not.toBeNull();
    expect(cells[1].querySelector("#profile-ageEdit")).not.toBeNull();
    expect(cells[2].querySelector("#profile-locationEdit")).not.toBeNull();
    // The visible term and the accessible name agree.
    expect(cells[0].querySelector("textarea").getAttribute("aria-label")).toBe(
      "Name"
    );
    expect(dl.querySelectorAll("dt")[0].textContent).toBe("Name:");
  });

  it("sends every changed profile path in one PUT, and only those", async () => {
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInAppWith();

    openProfile(container);
    fireEvent.change(container.querySelector("#profile-nameEdit"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.change(container.querySelector("#profile-locationEdit"), {
      target: { value: "New York" },
    });
    fireEvent.click(control(container, "Save", "Profile"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    const [, body] = axios.put.mock.calls[0];
    expect(body).toEqual({
      updates: {
        "profile.name": "Grace Hopper",
        "profile.location": "New York",
      },
    });
    // Five fields are open; three were not touched and must not be sent.
    expect(Object.keys(body.updates)).toHaveLength(2);
  });

  it("swaps each contact link's anchor for a field holding its URL", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInAppWith(fixture);

    openContact(container);

    expect(container.querySelector("#contact-emailEdit").value).toBe(
      fixture.links.email
    );
    expect(container.querySelector("#contact-linkedinEdit").value).toBe(
      fixture.links.linkedin
    );
    expect(container.querySelector("#contact-githubEdit").value).toBe(
      fixture.links.github
    );

    // The list survives; the anchors do not, deliberately. An <a> whose href is
    // half-retyped is not a link, and clicking it would navigate away and lose
    // the draft.
    const items = container.querySelectorAll(".footer .links li");
    expect(items).toHaveLength(3);
    items.forEach((li) => {
      expect(li.querySelector("a")).toBeNull();
      expect(li.querySelector("textarea")).not.toBeNull();
    });
  });

  it("names each link field for what it holds", async () => {
    const { container } = await signedInAppWith();

    openContact(container);

    // "Linkedin" as link text names the destination; it does not name a field
    // holding a URL, and all three would otherwise be "link".
    expect(
      container.querySelector("#contact-emailEdit").getAttribute("aria-label")
    ).toBe("Email address");
    expect(
      container.querySelector("#contact-linkedinEdit").getAttribute("aria-label")
    ).toBe("LinkedIn URL");
    expect(
      container.querySelector("#contact-githubEdit").getAttribute("aria-label")
    ).toBe("GitHub URL");
  });

  it("saves a link and the quote together, from one Save", async () => {
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInAppWith();

    openContact(container);
    fireEvent.change(container.querySelector("#contact-quoteEdit"), {
      target: { value: "A new closing line." },
    });
    fireEvent.change(container.querySelector("#contact-githubEdit"), {
      target: { value: "https://github.example/grace" },
    });
    fireEvent.click(control(container, "Save", "Contact"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    // One band, one Save, whichever of its five paths changed.
    const [, body] = axios.put.mock.calls[0];
    expect(body).toEqual({
      updates: {
        "quotes.2.quote": "A new closing line.",
        "links.github": "https://github.example/grace",
      },
    });
  });

  it("restores the links when the editor closes", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInAppWith(fixture);

    openContact(container);
    fireEvent.click(control(container, "Done", "Contact"));

    const anchors = container.querySelectorAll(".footer .links a");
    expect(anchors).toHaveLength(3);
    expect(anchors[0].getAttribute("href")).toBe("mailto:" + fixture.links.email);
    expect(anchors[1].getAttribute("href")).toBe(fixture.links.linkedin);
    expect(anchors[2].getAttribute("href")).toBe(fixture.links.github);
  });

  it("keeps every id unique with the biggest editor open", async () => {
    const { container } = await signedInAppWith();

    openProfile(container);
    const ids = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((node) => node.id);
    expect(ids).toHaveLength(new Set(ids).size);

    openContact(container);
    const after = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((node) => node.id);
    expect(after).toHaveLength(new Set(after).size);
  });

  it("gives every field a single row, so a short one is not padded to two", async () => {
    const { container } = await signedInAppWith();

    openProfile(container);

    // The wrapper is a 1x1 grid and the cell takes the taller of the textarea
    // and the hidden mirror. Left at the HTML default of rows="2" the control
    // imposes a two-line floor, and a one-line Name sat in a 74px box against
    // the mirror's correct 46px. jsdom does no layout, so the heights cannot be
    // asserted here -- the attribute that causes them can.
    Array.prototype.slice
      .call(container.querySelectorAll("textarea"))
      .forEach((field) => expect(field.rows).toBe(1));
  });

  it("still gains nothing on the public render", async () => {
    const { container } = await renderLoadedApp();

    // Eleven editable paths now, across two sections. The gate is unchanged and
    // this is the assertion that proves it.
    expect(allControls(container)).toHaveLength(0);
    expect(container.querySelectorAll("textarea")).toHaveLength(0);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelectorAll(".footer .links a")).toHaveLength(3);
    expect(container.querySelector(".details dl")).not.toBeNull();
  });
});

// ===========================================================================
// The two pieces of machinery stage 4's list editing rests on. Both were bugs
// before a list needed them -- one latent, one visible in the footer.
// ===========================================================================
describe("edit flow: machinery a list editor depends on", () => {
  const signedInApp = async () => {
    enableAdminUi();
    seedStoredSession();
    return renderLoadedApp();
  };

  // A probe rather than a real section, because no UI holds an array draft yet
  // -- the row editors are still to come. Without this, reverting the dirty
  // check to `!==` leaves the whole suite green, which is exactly the state
  // that lets a safety fix rot.
  const ArrayDraftProbe = ({ path }) => {
    const editor = useSectionEditor("probe", [path]);
    return (
      <div>
        <span data-testid="dirty">{String(editor.dirty)}</span>
        <span data-testid="status">{editor.status}</span>
      </div>
    );
  };

  describe("a list draft equal to the store is not dirty", () => {
    const PATH = "abilities.languages";

    const mountProbe = () => {
      const fixture = resumeFixture();
      const utils = renderWithStore(<ArrayDraftProbe path={PATH} />, {
        resume: fixture,
      });
      return { ...utils, fixture };
    };

    it("stays clean when the draft is a structurally equal COPY", () => {
      const { store, getByTestId, fixture } = mountProbe();

      // Exactly what seeding a list editor does: copy the store's rows so
      // there is something mutable to edit. A different object, same value.
      const copy = fixture.abilities.languages.map((row) => ({ ...row }));
      store.dispatch(sectionOpened("probe"));
      store.dispatch(draftChanged({ path: PATH, value: copy }));

      expect(getByTestId("dirty").textContent).toBe("false");
      expect(getByTestId("status").textContent).toBe("");
    });

    it("goes dirty the moment a row actually changes", () => {
      const { store, getByTestId, fixture } = mountProbe();

      const changed = fixture.abilities.languages.map((row) => ({ ...row }));
      changed[0].stars = "1";
      store.dispatch(sectionOpened("probe"));
      store.dispatch(draftChanged({ path: PATH, value: changed }));

      expect(getByTestId("dirty").textContent).toBe("true");
      expect(getByTestId("status").textContent).toBe("Unsaved changes");
    });

    it("does not call a seeded empty list over the skeleton dirty", () => {
      // THE ONE THAT MATTERS. Over the un-hydrated skeleton every list is [].
      // Under reference identity a seeded [] is a different object, so it reads
      // as dirty -- and one Save would PUT an empty array over the live
      // section. This is gate 4 of the "Save blanked my resume" defence.
      const { store, getByTestId } = renderWithStore(
        <ArrayDraftProbe path={PATH} />,
        { resume: null }
      );

      store.dispatch(sectionOpened("probe"));
      store.dispatch(draftChanged({ path: PATH, value: [] }));

      expect(getByTestId("dirty").textContent).toBe("false");
    });
  });

  // anyDirty is the OTHER caller of sameValue, and it drives the "Discard your
  // unsaved changes?" prompt when you open a second section. It scans every
  // draft, not just this section's fields, so it needs its own cover: a probe
  // for one section while an untouched list draft sits under another.
  const OpenerProbe = ({ section }) => {
    const editor = useSectionEditor(section, ["profile.name"]);
    return (
      <button type="button" onClick={editor.openEditor}>
        open {section}
      </button>
    );
  };

  describe("an untouched list draft does not trigger the discard prompt", () => {
    it("opens a second section without asking", () => {
      enableAdminUi();
      seedStoredSession();
      const fixture = resumeFixture();
      const { store, getByText } = renderWithStore(<OpenerProbe section="b" />, {
        resume: fixture,
      });
      const confirm = jest
        .spyOn(window, "confirm")
        .mockImplementation(() => false);
      try {
        // Section "a" is open and holds a SEEDED list draft nobody has touched.
        store.dispatch(sectionOpened("a"));
        store.dispatch(
          draftChanged({
            path: "abilities.languages",
            value: fixture.abilities.languages.map((row) => ({ ...row })),
          })
        );

        fireEvent.click(getByText("open b"));

        // Under reference identity that seeded copy reads as unsaved work, and
        // every section switch would nag -- which is how a real prompt gets
        // dismissed reflexively.
        expect(confirm).not.toHaveBeenCalled();
        expect(store.getState().editMode.openSection).toBe("b");
      } finally {
        confirm.mockRestore();
      }
    });

    it("still asks when the list draft really differs", () => {
      enableAdminUi();
      seedStoredSession();
      const fixture = resumeFixture();
      const { store, getByText } = renderWithStore(<OpenerProbe section="b" />, {
        resume: fixture,
      });
      const confirm = jest
        .spyOn(window, "confirm")
        .mockImplementation(() => false);
      try {
        const changed = fixture.abilities.languages.map((row) => ({ ...row }));
        changed[0].ability = "Something else";
        store.dispatch(sectionOpened("a"));
        store.dispatch(
          draftChanged({ path: "abilities.languages", value: changed })
        );

        fireEvent.click(getByText("open b"));

        expect(confirm).toHaveBeenCalled();
        expect(store.getState().editMode.openSection).toBe("a");
      } finally {
        confirm.mockRestore();
      }
    });
  });

  describe("value equality, not reference identity", () => {
    it("calls two structurally equal lists the same value", () => {
      const a = [{ ability: "Dart", stars: "3" }, { ability: "Go", stars: "5" }];
      const b = [{ ability: "Dart", stars: "3" }, { ability: "Go", stars: "5" }];
      expect(a).not.toBe(b);
      expect(sameValue(a, b)).toBe(true);
    });

    it("sees a change in any row, at any depth", () => {
      const a = [{ ability: "Dart", stars: "3" }];
      expect(sameValue(a, [{ ability: "Dart", stars: "4" }])).toBe(false);
      expect(sameValue(a, [{ ability: "Go", stars: "3" }])).toBe(false);
      expect(sameValue(a, [{ ability: "Dart" }])).toBe(false);
      expect(sameValue(a, [{ ability: "Dart", stars: "3" }, { ability: "Go" }])).toBe(
        false
      );
      expect(sameValue(a, [])).toBe(false);
    });

    it("does not confuse an array with an object, or a bool with a string", () => {
      expect(sameValue([], {})).toBe(false);
      expect(sameValue({ isCurrent: true }, { isCurrent: "true" })).toBe(false);
      expect(sameValue({ a: 1 }, { b: 1 })).toBe(false);
      // A key present-but-undefined is not the same as absent.
      expect(sameValue({ a: undefined }, {})).toBe(false);
    });

    it("still works for the scalars every existing field uses", () => {
      expect(sameValue("same", "same")).toBe(true);
      expect(sameValue("a", "b")).toBe(false);
      expect(sameValue("", "")).toBe(true);
    });
  });

  describe("one field takes focus, not whichever mounted last", () => {
    it("lands in the quote when the footer editor opens, not the GitHub URL", async () => {
      const { container } = await signedInApp();

      fireEvent.click(control(container, "Edit", "Contact"));

      // Before focus was opt-in every Editfield called focus() on mount, so
      // the last one in document order won -- which in this band is the third
      // contact link.
      expect(document.activeElement.id).toBe("contact-quoteEdit");
      expect(document.activeElement.id).not.toBe("contact-githubEdit");
    });

    it("lands in the first Profile field, not the last", async () => {
      const { container } = await signedInApp();

      fireEvent.click(control(container, "Edit", "Profile"));

      expect(document.activeElement.id).toBe("profile-subtitleEdit");
      expect(document.activeElement.id).not.toBe("profile-locationEdit");
    });

    it("puts the caret at the end rather than selecting the value", async () => {
      const { container } = await signedInApp();

      fireEvent.click(control(container, "Edit", "Contact"));

      const field = container.querySelector("#contact-quoteEdit");
      expect(field.selectionStart).toBe(field.value.length);
      expect(field.selectionEnd).toBe(field.value.length);
    });
  });
});

// ===========================================================================
// Ability rows: the first WHOLE-LIST edit, and the first control that is not a
// text field. The server takes these four array paths as complete lists, never
// by index, because both ability lists are re-sorted by star count for display.
// ===========================================================================
describe("edit flow: editing ability rows", () => {
  const signedInApp = async () => {
    enableAdminUi();
    seedStoredSession();
    return renderLoadedApp();
  };

  const openAbilities = (container) =>
    fireEvent.click(control(container, "Edit", "Abilities"));

  const langField = (container, i) =>
    container.querySelector("#abilities-languages-" + i + "-abilityEdit");

  const groups = (container) =>
    container.querySelectorAll('.abilities [role="radiogroup"]');

  const starsOf = (group) => group.querySelectorAll('[role="radio"]');

  it("opens a field and a rating group for every row in both lists", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInApp();

    openAbilities(container);

    const rows =
      fixture.abilities.languages.length + fixture.abilities.technologies.length;
    expect(container.querySelectorAll(".abilityitem textarea")).toHaveLength(rows);
    expect(groups(container)).toHaveLength(rows);
    groups(container).forEach((g) => expect(starsOf(g)).toHaveLength(5));
  });

  it("seeds each field from its own row", async () => {
    const { container } = await signedInApp();

    openAbilities(container);

    // The fixture's languages are JavaScript (5) then Dart (3) -- already in
    // descending star order, so read and edit order agree here.
    expect(langField(container, 0).value).toBe("JavaScript");
    expect(langField(container, 1).value).toBe("Dart");
  });

  it("does NOT re-sort while editing", async () => {
    const { container } = await signedInApp();

    openAbilities(container);

    // JavaScript is first at 5, Dart second at 3. Drop JavaScript to 1 so the
    // two would genuinely CROSS under a star sort. Raising Dart to 5 instead
    // proves nothing: the sort is stable, so equal values keep their order --
    // which is how the first version of this test passed against a re-sorting
    // build.
    fireEvent.click(starsOf(groups(container)[0])[0]);

    // A re-sort here would put Dart at index 0, re-key every row it passed and
    // remount the field being typed in -- losing focus and the caret mid-word.
    // The ids are position-based too, so they would attach to the wrong rows.
    expect(langField(container, 0).value).toBe("JavaScript");
    expect(langField(container, 1).value).toBe("Dart");
    expect(
      starsOf(groups(container)[0])[0].getAttribute("aria-checked")
    ).toBe("true");
  });

  it("opens in the order read mode was just showing", async () => {
    const { container } = await signedInApp();

    const read = Array.prototype.slice
      .call(container.querySelectorAll(".languages .abilityitem .ability"))
      .map((cell) => cell.textContent);

    openAbilities(container);

    const editing = Array.prototype.slice
      .call(container.querySelectorAll(".languages .abilityitem textarea"))
      .map((field) => field.value);

    // Painting the draft in its STORED order instead reshuffled every row the
    // instant Edit was clicked -- same rows, different order, for no reason the
    // operator caused. The display order comes from the store, which read mode
    // just sorted and which does not change while an editor is open.
    expect(editing).toEqual(read);
  });

  it("addresses a row by its stored index, not its position on screen", async () => {
    const { container } = await signedInApp();

    openAbilities(container);

    // The fixture's languages are JavaScript(5) then Dart(3), so display order
    // and stored order agree here -- what matters is that the id names the
    // STORED index, so it keeps meaning the same row if they ever diverge.
    const ids = Array.prototype.slice
      .call(container.querySelectorAll(".languages .abilityitem textarea"))
      .map((field) => field.id);
    ids.forEach((id) => expect(id).toMatch(/^abilities-languages-\d+-abilityEdit$/));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sends the whole list, with only the touched row changed", async () => {
    const fixture = resumeFixture();
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInApp();

    openAbilities(container);
    fireEvent.change(langField(container, 1), { target: { value: "Dart 3" } });
    fireEvent.click(control(container, "Save", "Abilities"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    const [, body] = axios.put.mock.calls[0];
    expect(Object.keys(body.updates)).toEqual(["abilities.languages"]);
    // A WHOLE list -- every row, not just the edited one -- because the server
    // replaces the array and a partial list would delete the rest.
    expect(body.updates["abilities.languages"]).toHaveLength(
      fixture.abilities.languages.length
    );
    expect(body.updates["abilities.languages"][0].ability).toBe("JavaScript");
    expect(body.updates["abilities.languages"][1].ability).toBe("Dart 3");
    // Untouched technologies are not sent at all.
    expect(Object.keys(body.updates)).not.toContain("abilities.technologies");
  });

  it("sends stars as strings, repairing a row stored as a number", async () => {
    // The document and LIST_SCHEMAS both use strings. A row left as a NUMBER by
    // some earlier hand-edit would otherwise make the whole list unsavable,
    // with an error naming a row the operator never touched and no way to fix
    // it from the UI. This fixture is deliberately given that stale shape.
    const stale = resumeFixture();
    stale.abilities.languages[1].stars = 3;
    enableAdminUi();
    seedStoredSession();
    axios.get.mockResolvedValue({ data: stale });
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const utils = render(
      <Provider store={makeStore()}>
        <App />
      </Provider>
    );
    await wait(() => {
      expect(utils.container.querySelector("h1")).not.toBeNull();
    });
    const { container } = utils;

    openAbilities(container);
    fireEvent.change(langField(container, 0), { target: { value: "JS" } });
    fireEvent.click(control(container, "Save", "Abilities"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    const [, body] = axios.put.mock.calls[0];
    body.updates["abilities.languages"].forEach((row) => {
      expect(typeof row.stars).toBe("string");
    });
  });

  it("clicking a star sets that rating", async () => {
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInApp();

    openAbilities(container);
    const group = groups(container)[1]; // Dart, 3 stars
    expect(starsOf(group)[2].getAttribute("aria-checked")).toBe("true");

    fireEvent.click(starsOf(group)[0]);

    const after = starsOf(groups(container)[1]);
    expect(after[0].getAttribute("aria-checked")).toBe("true");
    expect(after[2].getAttribute("aria-checked")).toBe("false");
    // The row's spoken value follows the glyphs.
    expect(
      container.querySelectorAll(".abilityitem")[1].textContent
    ).toMatch(/1 out of 5/);
  });

  it("is a radiogroup with one tab stop, not five toggle buttons", async () => {
    const { container } = await signedInApp();

    openAbilities(container);
    const group = groups(container)[0]; // JavaScript, 5 stars

    expect(group.getAttribute("aria-label")).toMatch(/JavaScript/);
    const stars = starsOf(group);
    // Exactly one tabbable button: thirty rows of five individually tabbable
    // buttons would be 150 tab stops between the top of the editor and Save.
    const tabbable = Array.prototype.slice
      .call(stars)
      .filter((b) => b.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute("aria-checked")).toBe("true");
    stars.forEach((b) => expect(b.getAttribute("aria-label")).toMatch(/star/));
  });

  it("moves the rating with the arrow keys", async () => {
    const { container } = await signedInApp();

    openAbilities(container);
    const group = groups(container)[1]; // Dart, 3

    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(
      starsOf(groups(container)[1])[1].getAttribute("aria-checked")
    ).toBe("true");

    fireEvent.keyDown(groups(container)[1], { key: "End" });
    expect(
      starsOf(groups(container)[1])[4].getAttribute("aria-checked")
    ).toBe("true");

    fireEvent.keyDown(groups(container)[1], { key: "Home" });
    expect(
      starsOf(groups(container)[1])[0].getAttribute("aria-checked")
    ).toBe("true");
  });

  it("cannot be driven past either end", async () => {
    const { container } = await signedInApp();

    openAbilities(container);
    const first = () => starsOf(groups(container)[0]);

    // JavaScript is already 5.
    fireEvent.keyDown(groups(container)[0], { key: "ArrowRight" });
    expect(first()[4].getAttribute("aria-checked")).toBe("true");

    fireEvent.keyDown(groups(container)[0], { key: "Home" });
    fireEvent.keyDown(groups(container)[0], { key: "ArrowLeft" });
    expect(first()[0].getAttribute("aria-checked")).toBe("true");
  });

  it("adds no heading, section, anchor or list while editing rows", async () => {
    const { container } = await signedInApp();
    const count = (sel) => container.querySelectorAll(sel).length;
    const before = {
      headings: count("h1,h2,h3,h4,h5,h6"),
      sections: count("section"),
      anchors: count("a"),
      lists: count("ul"),
      items: count("li"),
    };

    openAbilities(container);

    expect(count("h1,h2,h3,h4,h5,h6")).toBe(before.headings);
    expect(count("section")).toBe(before.sections);
    expect(count("a")).toBe(before.anchors);
    expect(count("ul")).toBe(before.lists);
    expect(count("li")).toBe(before.items);
    container.querySelectorAll("li").forEach((li) =>
      expect(li.parentElement.tagName).toBe("UL")
    );
  });

  it("keeps every id unique with thirty fields open", async () => {
    const { container } = await signedInApp();

    openAbilities(container);

    const ids = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((n) => n.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("stays clean until a row actually changes", async () => {
    const { container } = await signedInApp();

    openAbilities(container);
    expect(
      control(container, "Save", "Abilities").getAttribute("aria-disabled")
    ).toBe("true");

    fireEvent.change(langField(container, 0), { target: { value: "Changed" } });
    expect(
      control(container, "Save", "Abilities").getAttribute("aria-disabled")
    ).toBeNull();

    // Typed back: value equality, so this is genuinely clean again rather than
    // "a draft exists for this path".
    fireEvent.change(langField(container, 0), { target: { value: "JavaScript" } });
    expect(
      control(container, "Save", "Abilities").getAttribute("aria-disabled")
    ).toBe("true");
  });
});

// ===========================================================================
// Experience rows. Two things here that the ability rows did not have: cells
// that are phrasing-content-only elements, and row keys that are never shown
// and must survive a write anyway.
// ===========================================================================
describe("edit flow: editing experience rows", () => {
  const signedInApp = async (fixture) => {
    enableAdminUi();
    seedStoredSession();
    axios.get.mockResolvedValue({ data: fixture || resumeFixture() });
    const utils = renderApp();
    await wait(() => {
      expect(utils.container.querySelector("h1")).not.toBeNull();
    });
    return utils;
  };

  const openExperiences = (container) =>
    fireEvent.click(control(container, "Edit", "Experiences"));

  const cell = (container, list, index, key) =>
    container.querySelector("#experiences-" + list + "-" + index + "-" + key + "Edit");

  it("opens four fields for every row in both lists", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInApp(fixture);

    openExperiences(container);

    const rows =
      fixture.experiences.school.length + fixture.experiences.work.length;
    expect(container.querySelectorAll(".experienceitem textarea")).toHaveLength(
      rows * 4
    );
    expect(cell(container, "school", 0, "company").value).toBe(
      fixture.experiences.school[0].company
    );
    expect(cell(container, "school", 0, "dateLabel").value).toBe(
      fixture.experiences.school[0].dateLabel
    );
    expect(cell(container, "work", 1, "title").value).toBe(
      fixture.experiences.work[1].title
    );
    expect(cell(container, "work", 1, "body").value).toBe(
      fixture.experiences.work[1].body
    );
  });

  it("puts the fields INSIDE the h4 and the two paragraphs", async () => {
    const { container } = await signedInApp();

    openExperiences(container);

    const row = container.querySelector(".experienceitem");
    // These three take phrasing content only, which is why the field's wrapper
    // is a <span>. A <div> here is invalid, React warns, and a real parser
    // closes the <p> before it -- so the row would come apart in the DOM.
    expect(row.querySelector("h4.institution textarea")).not.toBeNull();
    expect(row.querySelector("p.experiencetitle textarea")).not.toBeNull();
    expect(row.querySelector("p.body textarea")).not.toBeNull();
    expect(row.querySelectorAll("h4")).toHaveLength(1);
    expect(row.querySelectorAll("p")).toHaveLength(2);
    // No block element smuggled inside a paragraph.
    expect(row.querySelectorAll("p div")).toHaveLength(0);
    expect(row.querySelectorAll("h4 div")).toHaveLength(0);
  });

  it("carries the invisible sort keys through a save untouched", async () => {
    const fixture = resumeFixture();
    // A work row as the document really stores it: the label is display text,
    // and startDate/endDate/isCurrent are what the server sorts on.
    fixture.experiences.work[0].startDate = "2021-05";
    fixture.experiences.work[0].endDate = "2022-07";
    fixture.experiences.work[0].isCurrent = false;
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInApp(fixture);

    openExperiences(container);
    fireEvent.change(cell(container, "work", 0, "dateLabel"), {
      target: { value: "May 2021 - July 2022" },
    });
    fireEvent.click(control(container, "Save", "Experiences"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    const [, body] = axios.put.mock.calls[0];
    const sent = body.updates["experiences.work"][0];
    // Rebuilding a row from its four visible fields would drop these, and the
    // server would refuse the write naming keys the operator never saw.
    expect(sent.startDate).toBe("2021-05");
    expect(sent.endDate).toBe("2022-07");
    expect(sent.isCurrent).toBe(false);
    expect(sent.dateLabel).toBe("May 2021 - July 2022");
  });

  it("sends the whole list, and only the list that changed", async () => {
    const fixture = resumeFixture();
    axios.put.mockResolvedValue({ data: resumeFixture() });
    const { container } = await signedInApp(fixture);

    openExperiences(container);
    fireEvent.change(cell(container, "work", 0, "company"), {
      target: { value: "Somewhere Else" },
    });
    fireEvent.click(control(container, "Save", "Experiences"));

    await wait(() => {
      expect(container.querySelector(".editstatus").textContent).toBe("Saved");
    });

    const [, body] = axios.put.mock.calls[0];
    expect(Object.keys(body.updates)).toEqual(["experiences.work"]);
    expect(body.updates["experiences.work"]).toHaveLength(
      fixture.experiences.work.length
    );
    expect(body.updates["experiences.work"][0].company).toBe("Somewhere Else");
    expect(body.updates["experiences.work"][1].company).toBe(
      fixture.experiences.work[1].company
    );
  });

  it("keeps the heading walk and the list semantics while editing", async () => {
    const { container } = await signedInApp();
    const count = (sel) => container.querySelectorAll(sel).length;
    const before = {
      headings: count("h1,h2,h3,h4,h5,h6"),
      sections: count("section"),
      anchors: count("a"),
      lists: count("ul"),
      items: count("li"),
    };

    openExperiences(container);

    expect(count("h1,h2,h3,h4,h5,h6")).toBe(before.headings);
    expect(count("section")).toBe(before.sections);
    expect(count("a")).toBe(before.anchors);
    expect(count("ul")).toBe(before.lists);
    expect(count("li")).toBe(before.items);

    // The <h4>s still have to be headings, not fields wearing a heading's
    // class -- the level walk in site/index.test.js reads tag names.
    const levels = Array.prototype.slice
      .call(container.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .map((node) => Number(node.tagName[1]));
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
    });
  });

  it("keeps every id unique with both lists open", async () => {
    const { container } = await signedInApp();

    openExperiences(container);

    const ids = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((n) => n.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("leaves the caret in the quote, not in a row", async () => {
    const { container } = await signedInApp();

    openExperiences(container);

    // Two claimants would hand it to whichever mounted last, which is how the
    // footer used to land in its GitHub URL.
    expect(document.activeElement.id).toBe("experiences-quoteEdit");
  });

  it("stays clean until a row actually changes", async () => {
    const fixture = resumeFixture();
    const { container } = await signedInApp(fixture);

    openExperiences(container);
    expect(
      control(container, "Save", "Experiences").getAttribute("aria-disabled")
    ).toBe("true");

    fireEvent.change(cell(container, "school", 0, "title"), {
      target: { value: "Something else" },
    });
    expect(
      control(container, "Save", "Experiences").getAttribute("aria-disabled")
    ).toBeNull();

    fireEvent.change(cell(container, "school", 0, "title"), {
      target: { value: fixture.experiences.school[0].title },
    });
    expect(
      control(container, "Save", "Experiences").getAttribute("aria-disabled")
    ).toBe("true");
  });
});
