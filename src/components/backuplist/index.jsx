import React from "react";
import "./index.scss";

// The save history, read-only. Presentational: props only, no store, no
// network -- the admin bar owns the request.
//
// WHAT THIS IS FOR. The API snapshots the whole prior document on every save
// and keeps fifty generations, but a restore is a whole-document replacement --
// exactly the operation the server's allowlist exists to refuse -- so there is
// deliberately no button here that performs one. This answers "which generation
// do I want?", and the restore itself stays a deliberate mongosh command. A
// list that told you nothing but the count would not be worth the request; the
// timestamp and the paths that moved are what you actually choose on.
//
// Four states, not one nullable list. "Not asked", "asking", "none exist" and
// "could not ask" are four different things to put on screen, and collapsing
// them renders an empty list that reads as a confident answer.

// The server sends ISO 8601 with an offset so the browser can render local
// time. Anything else -- a row written before created_at existed, a clock that
// produced something Date cannot parse -- says so rather than printing
// "Invalid Date".
const formatWhen = (iso) => {
  if (typeof iso !== "string" || !iso) return "date unknown";
  const when = new Date(iso);
  if (isNaN(when.getTime())) return "date unknown";
  return when.toLocaleString();
};

const Backuplist = ({ rows, busy, error }) => {
  if (busy) {
    return (
      <p className="adminbarstatus" role="status">
        Loading save history…
      </p>
    );
  }

  if (error) {
    // role="alert", announced on insertion, matching how a failed sign-in and a
    // failed save already report themselves.
    return (
      <p className="adminbarmessage" role="alert">
        {error}
      </p>
    );
  }

  if (!rows) return null;

  if (rows.length === 0) {
    return (
      <p className="adminbarstatus" role="status">
        No saves recorded yet.
      </p>
    );
  }

  return (
    <>
      <p className="adminbarstatus">
        {rows.length === 1 ? "1 saved version" : rows.length + " saved versions"}
        , newest first. Restoring one is a mongosh command, not a button.
      </p>
      <ul className="backuplist">
        {rows.map((row, index) => (
          // The server's own id, falling back to the index only if a row
          // somehow arrives without one -- a duplicate React key silently drops
          // rows from the render, which on this list would understate how many
          // generations exist.
          <li className="backuprow" key={row.id || "row-" + index}>
            {/* <time> so the machine-readable value survives alongside the
                localised text a person reads. */}
            <time className="backupwhen" dateTime={row.createdAt || undefined}>
              {formatWhen(row.createdAt)}
            </time>
            <span className="backuppaths">
              {Array.isArray(row.changedPaths) && row.changedPaths.length
                ? row.changedPaths.join(", ")
                : "no paths recorded"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
};
export default Backuplist;
