import React from "react";
import Titles from "../titles/index";
import "./index.scss";
import { useSelector } from "react-redux";

function Footer() {
  const resume = useSelector((state) => state.resume.value);
  let quote = resume.quotes[2];
  let links = resume.links;

  return (
    <div className="footer">
      <div className="container">
        <Titles title="Contact" subtitle={quote.quote} by={quote.by}></Titles>
        <div className="links">
          <div className="link email">{links.email}</div>
          <div className="link linkedin">
            {" "}
            <a href={links.linkedin}>Linkedin</a>
          </div>
          <div className="link github">
            {" "}
            <a href={links.github}>Github</a>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Footer;
