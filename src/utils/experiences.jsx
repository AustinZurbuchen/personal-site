import React from "react";
import ExperienceItem from "../components/experienceitem/index";

// One builder, two exported names -- the two functions were identical apart
// from a variable name.
//
// NO SORT HERE, in either mode, and that is the difference from the ability
// lists. The server sorts `work` in public_view() before it ever reaches the
// client, so what the store holds is already the display order: a rendered
// index and a stored index are the same number, and there is nothing to reorder
// under a keystroke. `school` is never sorted at all.
const buildExperienceRows = (rows, edit) =>
  rows.map((row, index) => (
    <ExperienceItem
      key={index.toString()}
      company={row.company}
      dateLabel={row.dateLabel}
      title={row.title}
      body={row.body}
      edit={edit ? edit.forRow(index) : undefined}
    ></ExperienceItem>
  ));

export function generateEducations(educations, edit) {
  return buildExperienceRows(educations, edit);
}

export function generateCareers(careers, edit) {
  return buildExperienceRows(careers, edit);
}
