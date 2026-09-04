import React from "react";
import Site from "./index";
import { renderWithStore } from "../../test-utils/renderWithStore";
import { resumeFixture } from "../../test-utils/fixtures";

// The accessibility structure of this page is an EMERGENT property of seven
// component files -- site, name, titles, aboutme, details, itemslist,
// experienceitem, abilityitem, footer. No single component's test can protect
// it, and every way it breaks (a tag swapped during a styling pass, a dropped
// `id` prop, an <li> turned back into a <div>) renders byte-identical pixels and
// throws nothing.
//
// These assertions are deliberately written against the DOM (querySelectorAll /
// attribute lookup) rather than ByRole where ByRole is unreliable on this
// toolchain. dom-testing-library 6.16 -- the copy @testing-library/react 9.5
// actually resolves -- silently IGNORES the `level` option on ByRole queries, so
// `getAllByRole("heading", { level: 1 })` returns every heading on the page and
// the canonical single-h1 assertion passes no matter what the markup says.

describe("Site: landmarks and headings", () => {
  it("has exactly one banner, one main and one contentinfo", () => {
    const { getAllByRole } = renderWithStore(<Site />);
    expect(getAllByRole("banner")).toHaveLength(1);
    expect(getAllByRole("main")).toHaveLength(1);
    expect(getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("has exactly one h1, and it carries the resume name", () => {
    const fixture = resumeFixture();
    const { container } = renderWithStore(<Site />, { resume: fixture });
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent.trim()).toBe(fixture.profile.name);
  });

  it("never skips a heading level in document order", () => {
    const { container } = renderWithStore(<Site />);
    const levels = Array.prototype.slice
      .call(container.querySelectorAll("h1,h2,h3,h4,h5,h6"))
      .map((node) => Number(node.tagName[1]));

    expect(levels.length).toBeGreaterThan(1);
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) {
        expect(level - levels[i - 1]).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe("Site: section labelling", () => {
  it("names every band by an aria-labelledby that resolves to real text", () => {
    // Titles is a shared four-line leaf and is the ONLY place `id={id}` is
    // applied. Dropping that prop while tidying it up would strip the accessible
    // name off three landmarks at once, with no other symptom.
    const { container } = renderWithStore(<Site />);
    const sections = Array.prototype.slice.call(
      container.querySelectorAll("section")
    );

    expect(sections).toHaveLength(3);
    sections.forEach((section) => {
      const id = section.getAttribute("aria-labelledby");
      expect(id).toBeTruthy();
      const label = container.querySelector("#" + id);
      expect(label).not.toBeNull();
      expect(label.textContent.trim()).not.toBe("");
    });
  });

  it("has no duplicate ids, since Titles renders four times", () => {
    const { container } = renderWithStore(<Site />);
    const ids = Array.prototype.slice
      .call(container.querySelectorAll("[id]"))
      .map((node) => node.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  it("points the skip link at the main landmark", () => {
    const { container, getByRole } = renderWithStore(<Site />);
    const skip = container.querySelector(".skip-link");
    expect(skip).not.toBeNull();
    expect(skip.textContent.trim()).not.toBe("");
    expect(container.querySelector(skip.getAttribute("href"))).toBe(
      getByRole("main")
    );
  });
});

describe("Site: list semantics", () => {
  it("keeps every ability, experience and contact row an li inside a ul", () => {
    // The <li> elements are produced in src/utils/{abilities,experiences}.js
    // while their <ul> parents live in itemslist and footer: the pairing spans
    // four files and nothing in the code enforces it. An <li> that loses its
    // <ul> still renders identically.
    const fixture = resumeFixture();
    const { getAllByRole } = renderWithStore(<Site />, { resume: fixture });

    const expectedItems =
      fixture.experiences.school.length +
      fixture.experiences.work.length +
      fixture.abilities.languages.length +
      fixture.abilities.technologies.length +
      3; // email / linkedin / github in the footer

    const items = getAllByRole("listitem");
    expect(items).toHaveLength(expectedItems);
    items.forEach((li) => expect(li.parentElement.tagName).toBe("UL"));

    // Educations, Careers, Languages, Technologies, contact.
    expect(getAllByRole("list")).toHaveLength(5);
  });

  it("renders Name / Age / Location as a paired definition list", () => {
    const fixture = resumeFixture();
    const { container } = renderWithStore(<Site />, { resume: fixture });
    const dl = container.querySelector(".details dl");
    expect(dl).not.toBeNull();

    const terms = dl.querySelectorAll("dt");
    const definitions = dl.querySelectorAll("dd");
    expect(terms).toHaveLength(definitions.length);
    expect(definitions[0].textContent).toBe(fixture.profile.name);
    expect(definitions[1].textContent).toBe(fixture.profile.age);
    expect(definitions[2].textContent).toBe(fixture.profile.location);
  });
});

describe("Site: contact links", () => {
  it("gives every contact link a destination and a non-empty label", () => {
    const fixture = resumeFixture();
    const { getAllByRole } = renderWithStore(<Site />, { resume: fixture });
    const links = getAllByRole("link").filter(
      (a) => a.className.indexOf("skip-link") === -1
    );

    expect(links).toHaveLength(3);
    links.forEach((a) => {
      expect(a.textContent.trim()).not.toBe("");
      expect(a.getAttribute("href")).toBeTruthy();
      expect(a.getAttribute("href")).not.toBe("mailto:");
    });
  });
});

describe("Site: resilience to a thin resume document", () => {
  it("renders without throwing when the API sends fewer than three quotes", () => {
    // Regression guard for a confirmed crash: the merge used to pass a short
    // quotes array straight through and Footer's quotes[2].quote white-screened
    // the whole site.
    const thin = resumeFixture();
    thin.quotes = [{ quote: "only one", by: "- A" }];
    expect(() => renderWithStore(<Site />, { resume: thin })).not.toThrow();
  });

  it("renders without throwing against the untouched empty skeleton", () => {
    // Also pins the [...spread] copies in src/components/abilities/index.js:
    // generateLanguages/Technologies sort their argument in place, and RTK's
    // immer deep-freezes store state, so removing those copies throws here.
    expect(() => renderWithStore(<Site />, { resume: null })).not.toThrow();
  });
});
