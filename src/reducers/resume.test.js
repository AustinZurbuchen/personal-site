import reducer, { update } from "./resume";

// The reducer is the one place this app can regress in total silence: every
// component dereferences `resume.abilities.languages`, `resume.quotes[1]`,
// `resume.profile.name` with no optional chaining, on the strength of the
// emptyResume merge. If the merge narrows, the failure surfaces as a TypeError
// in a component three files away.

const initialState = () => reducer(undefined, { type: "@@INIT" });
const merge = (payload) => reducer(initialState(), update(payload)).value;

describe("resume reducer: sections the API omitted", () => {
  it("fills in every section a partial payload left out", () => {
    const value = merge({ profile: { name: "Ada" } });

    // Only the four containers the components actually index into. Deep-equalling
    // the whole skeleton would turn this into a change-detector that fails on
    // every legitimate content addition.
    expect(value.profile.subtitle).toBe("");
    expect(value.experiences.school).toEqual([]);
    expect(value.experiences.work).toEqual([]);
    expect(value.abilities.languages).toEqual([]);
    expect(value.abilities.technologies).toEqual([]);
    expect(value.links.github).toBe("");
  });

  it("stays fully shaped for an empty, null or undefined payload", () => {
    [undefined, null, {}].forEach((payload) => {
      const value = merge(payload);
      expect(value.profile.name).toBe("");
      expect(value.experiences.school).toEqual([]);
      expect(value.abilities.languages).toEqual([]);
      expect(value.links.email).toBe("");
      expect(value.quotes).toHaveLength(3);
    });
  });

  it("lets the payload win over the skeleton, not the reverse", () => {
    // Guards against a spread-order 'cleanup' to {...payload, ...emptyResume},
    // which would blank every value the API actually sent.
    expect(merge({ profile: { name: "Ada" } }).profile.name).toBe("Ada");
  });
});

describe("resume reducer: the three quote slots", () => {
  // Experiences reads quotes[0], Abilities quotes[1], Footer quotes[2], all
  // unguarded. The resume document is hand-edited in Mongo Atlas, so a deleted
  // quote is a live failure mode with no build or deploy involved.
  it.each([
    ["no quotes key", undefined],
    ["an empty array", []],
    ["one quote", [{ quote: "a", by: "- A" }]],
    ["two quotes", [{ quote: "a", by: "- A" }, { quote: "b", by: "- B" }]],
    ["a non-array", "nope"],
  ])("guarantees quotes[0..2] are readable given %s", (_label, quotes) => {
    const value = merge({ quotes });
    expect(value.quotes.length).toBeGreaterThanOrEqual(3);
    [0, 1, 2].forEach((i) => {
      expect(typeof value.quotes[i].quote).toBe("string");
      expect(typeof value.quotes[i].by).toBe("string");
    });
  });

  it("keeps the quotes the payload did supply", () => {
    const value = merge({ quotes: [{ quote: "first", by: "- A" }] });
    expect(value.quotes[0]).toEqual({ quote: "first", by: "- A" });
  });
});

describe("resume reducer: fields emptyResume does not declare", () => {
  // NOTE FOR THE NEXT READER: CLAUDE.md says "a new field must be added to
  // emptyResume or it will be dropped". That is stale. `...payload` is spread
  // AFTER `...emptyResume`, and the same holds for the nested profile spread, so
  // unknown fields pass through. profile.age and profile.location are live proof
  // -- src/components/details/index.js renders both and neither is in
  // emptyResume. This test pins pass-through deliberately, so that a future
  // refactor to an explicit allow-list merge (the behaviour the doc describes)
  // fails loudly here instead of silently blanking the Details block.
  it("carries through unknown top-level and nested fields", () => {
    const value = merge({
      profile: { name: "Ada", age: "36 years", location: "London" },
      certifications: [{ name: "CKA" }],
    });
    expect(value.profile.age).toBe("36 years");
    expect(value.profile.location).toBe("London");
    expect(value.certifications).toEqual([{ name: "CKA" }]);
  });
});

describe("resume reducer: update replaces, it does not patch", () => {
  it("reverts keys a later payload omits back to the skeleton", () => {
    // Not obvious from App.js's single dispatch, and exactly what a future
    // "save my edits" flow would get wrong.
    const loaded = reducer(
      initialState(),
      update({ profile: { name: "Ada", subtitle: "sub" } })
    );
    const next = reducer(loaded, update({ profile: { name: "Grace" } })).value;
    expect(next.profile.name).toBe("Grace");
    expect(next.profile.subtitle).toBe("");
  });
});
