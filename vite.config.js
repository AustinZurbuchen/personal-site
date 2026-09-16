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
