import React from "react";
import Titles from "../titles/index";
import useStore from "../../store";
import "./index.scss";

function Footer() {
  const resume = useStore(
    (state) => state.resume
  );
  let quote = resume.quotes?.[2] || {
    quote: "",
    by: "",
  };
  let links = resume.links;

  return (
    <div className="footer">
      <div className="container">
        <Titles
          title="Contact"
          subtitle={quote.quote}
          by={quote.by}
        ></Titles>
        <div className="links">
          <div className="link email">
            {links.email}
          </div>
          <div className="link linkedin">
            <a href={links.linkedin}>
              Linkedin
            </a>
          </div>
          <div className="link github">
            <a href={links.github}>
              Github
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Footer;
