// jest-dom adds matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
//
// The entry point is /vitest, not /extend-expect: jest-dom 7 exposes only
// ./vitest, ./jest-globals and ./matchers, so the old import is a hard error
// rather than a deprecation. This one registers the matchers on vitest's expect.
import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// RTL 9's asyncUtilTimeout was 4500ms. Modern waitFor defaults to 1000ms, and
// not one of the 53 converted call sites passes an explicit timeout, so taking
// the default would be a silent 4.5x tightening applied to the whole suite at
// once. Restored here rather than annotated in 53 places. The cost is paid only
// on failure: a genuinely broken assertion now takes 4.5s to fail instead of 1s.
// Lower it deliberately later if faster red is worth more than the headroom.
configure({ asyncUtilTimeout: 4500 });
