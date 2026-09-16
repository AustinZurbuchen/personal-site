// jest-dom adds matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
//
// The entry point is /vitest, not /extend-expect: jest-dom 7 exposes only
// ./vitest, ./jest-globals and ./matchers, so the old import is a hard error
// rather than a deprecation. This one registers the matchers on vitest's expect.
import "@testing-library/jest-dom/vitest";
