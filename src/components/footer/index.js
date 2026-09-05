import React from "react";
import Titles from "../titles/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import "./index.scss";
import { useSelector } from "react-redux";

function Footer() {
  const resume = useSelector((state) => state.resume.value);
  let quote = resume.quotes[2];
  let links = resume.links;

  // quotes[2]. The section key is "contact" rather than "footer" to match the
  // band's own heading and its #contact-title id -- the error band this derives
  // is #contact-saveerror.
  const { editor, editProps, context } = useQuoteEditor("contact", 2, "Contact");

  return (
    <footer className="footer">
      <div className="container">
        {/* Inside the existing contentinfo landmark, never wrapping it:
            site/index.test.js asserts exactly one contentinfo, one banner and
            one main. `dark` because this band is #444242 -- the controls carry
            .editcontroldark, and the field, status and error are darkened by the
            .footer-scoped rules in index.scss. */}
        <Editbar context={context} editor={editor} dark></Editbar>
        <Titles
          id="contact-title"
          title="Contact"
          subtitle={quote.quote}
          by={quote.by}
          edit={editProps}
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
