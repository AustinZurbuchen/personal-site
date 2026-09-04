import React from "react";
import { render } from "@testing-library/react";
import Abilityitem from "./index";

// The star rating is the only place in the app where the sighted output and the
// screen-reader output are computed by two different files: the glyphs come from
// generateStars in src/utils/abilities.js, the "{n} out of 5" alternative is
// written in this component. Both halves are separately deletable and neither
// deletion changes a pixel for a sighted reviewer.
//
// Abilityitem takes props, so no Provider is needed. The <li> is wrapped in a
// <ul> to keep the markup valid.
const renderItem = (stars) =>
  render(
    <ul>
      <Abilityitem ability="Dart" stars={stars} />
    </ul>
  );

const glyphsOf = (container) =>
  Array.prototype.slice
    .call(container.querySelectorAll(".stars > *"))
    .map((node) => node.textContent.trim());

it("exposes the rating as text and hides the glyphs from the a11y tree", () => {
  const { container, getByText } = renderItem(3);
  expect(getByText("3 out of 5")).toBeInTheDocument();
  const glyphs = container.querySelectorAll(".stars > *");
  expect(glyphs).toHaveLength(5);
  Array.prototype.forEach.call(glyphs, (glyph) =>
    expect(glyph).toHaveAttribute("aria-hidden", "true")
  );
});

it("distinguishes filled from empty by glyph shape, not colour alone", () => {
  // The two star colours are 2.24:1 against each other, so the filled/empty
  // state has to survive with colour ignored. jsdom loads no CSS and cannot
  // check contrast, but it can check that the shapes still differ -- which is
  // the half that actually satisfies the requirement.
  const glyphs = glyphsOf(renderItem(3).container);
  expect(glyphs.filter((g) => g === "★")).toHaveLength(3); // filled
  expect(glyphs.filter((g) => g === "☆")).toHaveLength(2); // outline
});

it("renders a string star count from the database", () => {
  // The pre-Mongo fixtures stored stars as strings ({"stars": "4"}), and both
  // `i < stars` and `b.stars - a.stars` survive only on coercion. Anyone
  // tightening either comparison breaks live data with no local symptom.
  const { container, getByText } = renderItem("4");
  expect(getByText("4 out of 5")).toBeInTheDocument();
  expect(glyphsOf(container).filter((g) => g === "★")).toHaveLength(4);
});

it("announces a clamped rating rather than the raw value", () => {
  // Previously "7 out of 5" — self-contradictory, and read aloud verbatim.
  const { getByText } = renderItem(7);
  expect(getByText("5 out of 5")).toBeInTheDocument();
});

it("announces a rating even when the value is missing", () => {
  // Previously rendered " out of 5", giving the element an empty accessible
  // name that screen readers skip or announce as blank.
  const { getByText } = renderItem(undefined);
  expect(getByText("0 out of 5")).toBeInTheDocument();
});
