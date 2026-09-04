import { generateStars, generateLanguages } from "./abilities";

// generateStars returns raw React elements, so these run with no DOM at all.
const filledCount = (elements) =>
  elements.filter((el) => el.props.children === "★").length;

describe("generateStars", () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 3],
    [5, 5],
    [7, 5], // clamped: the loop is bounded at 5, not by `stars`
    [-1, 0],
    [undefined, 0],
    [null, 0],
    ["3", 3], // string counts from Mongo
  ])("renders 5 glyphs with %p filled for stars=%p", (stars, expectedFilled) => {
    const elements = generateStars(stars);
    // The literal 5 here has to stay in step with Abilityitem's "out of 5"
    // label, which lives in a different file. A refactor to
    // Array.from({length: stars}) would return 7 nodes for stars=7 and 0 for
    // stars=undefined, silently desyncing the two.
    expect(elements).toHaveLength(5);
    expect(filledCount(elements)).toBe(expectedFilled);
  });
});

describe("generateLanguages", () => {
  it("orders abilities strongest first", () => {
    // Neither call site sorts, so a reader would not expect ordering to happen
    // in here at all -- which is precisely why it is worth pinning.
    const rendered = generateLanguages([
      { ability: "Go", stars: 2 },
      { ability: "JavaScript", stars: 5 },
      { ability: "Python", stars: 4 },
    ]);
    expect(rendered.map((el) => el.props.ability)).toEqual([
      "JavaScript",
      "Python",
      "Go",
    ]);
  });
});
