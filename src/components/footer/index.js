import React from "react";
import Titles from "../titles/index";
import "./index.scss";
import { useSelector } from "react-redux";

function Footer() {
  const resume = useSelector((state) => state.resume.value);
  let quote = resume.quotes[2];
  let links = resume.links;

  return (
    <footer className="footer">
      <div className="container">
        <Titles
          id="contact-title"
          title="Contact"
          subtitle={quote.quote}
          by={quote.by}
        ></Titles>
        <ul className="links">
          <li className="link email">
            <a href={`mailto:${links.email}`}>{links.email}</a>
          </li>
          <li className="link linkedin">
            <a href={links.linkedin}>Linkedin</a>
          </li>
          <li className="link github">
            <a href={links.github}>Github</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
export default Footer;
