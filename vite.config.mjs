import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Replaces react-scripts. CRA 5 pinned Jest 27, and @testing-library/jest-dom 6+
// requires Jest >= 28, so the React 19 upgrade could not take the test stack with
// it while CRA was in the way. See CLAUDE.md.
export default defineConfig(({ mode }) => {
  // CRA exposed REACT_APP_* on process.env. src/utils/env.js still reads it, and
  // .env.local still spells the keys that way, so both keep working untouched.
  const env = loadEnv(mode, process.cwd(), ["REACT_APP_"]);

  return {
    plugins: [react()],

    // CLAUDE.md and .claude/launch.json both say the dev server is on 3000.
    server: { port: 3000 },

    build: {
      // The Dockerfile does `COPY --from=builder /app/build`, and .gitignore and
      // .dockerignore both say "build". One line here beats editing all three.
      outDir: "build",
    },

    test: {
      // Four of the six test files use only describe/it/expect and never import
      // them; globals keeps those files untouched by the runner swap.
      globals: true,
      // jsdom is an OPTIONAL peer of vitest, so it has to be an explicit devDep.
      environment: "jsdom",
      setupFiles: "./src/setupTests.js",
      // CRA's Jest set resetMocks: true implicitly. Every test in this suite sets
      // its mock implementation inline and depends on the previous one being
      // gone; without this the suite fails wholesale.
      mockReset: true,
      // MASKS A KNOWN, MEASURED DEFECT. Read this before removing it.
      //
      // The React 19 migration introduced a read/commit race in the SUITE, not
      // in the app. Clicking a control dispatches to Redux and React commits the
      // result asynchronously; roughly one interaction in 600 the commit lands
      // AFTER the test's next synchronous query, so the test reads the pre-click
      // DOM and fails on a control or field that does exist a moment later. It
      // recovers within 50ms but NOT within a microtask, so no synchronous flush
      // fixes it -- only awaiting the UI does.
      //
      // Measured on 9fb73d1, whole-suite runs: 4 failures in 25 (16%) without
      // this line, 0 in 25 with it. At 16% CI would go red about one push in six
      // and block the image on a defect that is not in the image.
      //
      // Why retrying is honest here rather than a cover-up: in every observed
      // failure the PRODUCT did the right thing and only the test read early --
      // the store had opened the section, window.confirm was never called, and
      // the DOM caught up. A genuine regression is deterministic and fails both
      // attempts, so this hides the race and not a bug.
      //
      // The root cause is NOT identified. React 17 under CRA's Jest never showed
      // it, because legacy ReactDOM.render flushed these updates synchronously
      // where createRoot schedules them. The real fix is `await waitFor` at every
      // synchronous read that follows an interaction; the casualties landed in
      // four different describe blocks, so the site list is not yet bounded.
      //
      // This is NOT silent: publish.yml re-reads the JSON reporter and annotates
      // any test that passed only on retry, so the 16% stays measurable instead
      // of disappearing. If those annotations stop appearing, the race is gone
      // and this line can go with it.
      retry: 1,
      include: ["src/**/*.test.{js,jsx}"],
    },

    // DELIBERATELY process.env, not import.meta.env. src/utils/env.js gates its
    // dev-only fallback layer on NODE_ENV === "development", which was "test"
    // under Jest, so the layer was dead inside the suite. import.meta.env.DEV is
    // TRUE under Vitest, and .env.local sets REACT_APP_ADMIN=true -- switching to
    // it would turn the admin UI on inside every test and change the DOM that the
    // accessibility-structure assertions are written against.
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.REACT_APP_SERVER_URL": JSON.stringify(
        env.REACT_APP_SERVER_URL ?? ""
      ),
      "process.env.REACT_APP_ADMIN": JSON.stringify(env.REACT_APP_ADMIN ?? ""),
    },
  };
});
