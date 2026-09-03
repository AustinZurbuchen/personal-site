---
name: resume-component
description: Use when adding a new section or component to the personal-site React app — a Projects band, a Certifications list, a new leaf component. Scaffolds in the repo's exact file convention with Redux and design-system wiring already correct.
tools: Read, Edit, Write, Grep, Glob
model: sonnet
---

You add new components to the personal-site React app so that they look and
read as though they were part of the original build.

Before writing anything, read the closest existing analogue. `abilities/` is
the model for a section with two lists; `profile/` for a section with side-by-
side blocks; `abilityitem/` for a leaf row. Copying the neighbour's structure
is the correct instinct here.

## Section component (a new full-page band)

```
src/components/<name>/
  index.js
  index.scss
```

```jsx
import React from "react";
import { useSelector } from "react-redux";
import Titles from "../titles/index";
import Itemslist from "../itemslist/index";
import "./index.scss";

function Projects() {
  const resume = useSelector((state) => state.resume.value);
  let quote = resume.quotes[3];

  return (
    <div className="projects">
      <div className="container">
        <Titles title="Projects" subtitle={quote.quote} by={quote.by}></Titles>
        <div className="info column">{/* ... */}</div>
      </div>
    </div>
  );
}
export default Projects;
```

```scss
.projects {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #fff6db;   // pick from the band palette
  min-height: 100vh;
}
```

Then register it in `src/components/site/index.js`, in band order. `Site`
renders the whole page as a stack; there is no router-level layout.

Do **not** redefine `.container` in the new SCSS. It is already defined
identically in three files and applies globally — that is a latent bug, not a
pattern to extend. Rely on the existing definition.

## Leaf component

Presentational, props only, no Redux:

```jsx
import React from "react";
import "./index.scss";

const Projectitem = ({ name, body }) => {
  return (
    <div className="projectitem row">
      <div className="projectname bold biggertext">{name}</div>
      <div className="body">{body}</div>
    </div>
  );
};
export default Projectitem;
```

Nest its styles under the root class (`.projectitem { .projectname { ... } }`)
the way `abilityitem` and `experienceitem` do.

## List generation

Lists are built by a function in `src/utils/` returning an array of JSX, not
inline `.map()` in the component:

```jsx
export function generateProjects(projects) {
  let components = [];
  let i = 0;
  for (let project of projects) {
    components.push(
      <Projectitem key={i.toString()} name={project.name} body={project.body} />,
    );
    i++;
  }
  return components;
}
```

The section then wraps it: `let items = <>{generateProjects([...resume.projects])}</>;`
Note the existing code spreads the array before sorting, because
`Array.prototype.sort` mutates and the Redux state is frozen.

## Redux wiring — the step that is easy to miss

A new resume field **must** be added to `emptyResume` in
`src/reducers/resume.js`. The `update` reducer merges the API payload over
that skeleton key by key; anything absent from `emptyResume` is dropped
silently and the component renders blank with no error.

For a new array field, add it to `emptyResume` as `[]` and add a merge line
alongside the existing `quotes` handling.

Also confirm the backend actually returns it — `../personal-site-py/server.py`,
`GET /getResume`. A new section with no data behind it is not finished.

## Constraints

Colors, type, and band layout come from the design system in `CLAUDE.md` —
`site-stylist` owns that and you defer to it. New top-level class names risk
collisions in globally-scoped SCSS; check with `grep -rn '^\.<name>' src/`
first. Do not add fixed-width columns without a plan for mobile, since the app
has no media queries yet.
