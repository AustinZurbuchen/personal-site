import React from "react";
import "./index.scss";

// Shown when GET /getResume fails. Before this existed, a dead API left the
// empty emptyResume skeleton on screen as the final state — a resume with a
// blank name and no experience, which reads as fact rather than as a failure.
const Loaderror = () => {
  return (
    <main className="loaderror">
      <div className="container">
        <h1 className="loaderrortitle">Something went wrong</h1>
        <p className="loaderrorbody">
          The resume could not be loaded. This is usually temporary — please try
          again in a moment.
        </p>
        <button
          className="loaderrorretry"
          type="button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    </main>
  );
};
export default Loaderror;
