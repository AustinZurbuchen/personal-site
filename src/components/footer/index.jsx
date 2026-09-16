import React from "react";
import Titles from "../titles/index";
import Editfield from "../editfield/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import "./index.scss";
import { useSelector } from "react-redux";

function Footer() {
  const resume = useSelector((state) => state.resume.value);
  let quote = resume.quotes[2];
  let links = resume.links;

  // The whole band behind one Save: quotes[2], its attribution, and the three
  // contact links. Every path here is server.py's ALLOWLIST entry verbatim.
  //
  // The section key is "contact" rather than "footer" to match the band's own
  // heading and its #contact-title id -- the error band it derives is
  // #contact-saveerror.
  const EMAIL = "links.email";
  const LINKEDIN = "links.linkedin";
  const GITHUB = "links.github";
  const { editor, editProps, context } = useQuoteEditor("contact", 2, "Contact", [
    EMAIL,
    LINKEDIN,
    GITHUB,
  ]);

  // A link's field REPLACES its anchor rather than sitting beside it. An <a>
  // whose href you are in the middle of retyping is not a link, and offering it
  // as one invites a click that navigates away mid-edit and loses the draft.
  // The <ul> and its three <li>s stay exactly as they are, so the list
  // semantics site/index.test.js pins are untouched -- only the cell changes,
  // the same way the <dd>s do in components/details/.
  const linkField = (path, id, label) =>
    editor.editing ? (
      <Editfield
        id={id}
        label={label}
        value={editor.valueOf(path)}
        onChange={editor.onChangeOf(path)}
        readOnly={editor.saving}
        describedBy={editor.describedBy}
        onSubmit={editor.save}
        onCancel={editor.closeEditor}
      ></Editfield>
    ) : null;

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
        <ul className={editor.editing ? "links linksediting" : "links"}>
          <li className="link email">
            {linkField(EMAIL, "contact-emailEdit", "Email address") || (
              <a href={`mailto:${links.email}`}>{links.email}</a>
            )}
          </li>
          <li className="link linkedin">
            {linkField(LINKEDIN, "contact-linkedinEdit", "LinkedIn URL") || (
              <a href={links.linkedin}>Linkedin</a>
            )}
          </li>
          <li className="link github">
            {linkField(GITHUB, "contact-githubEdit", "GitHub URL") || (
              <a href={links.github}>Github</a>
            )}
          </li>
        </ul>
      </div>
    </footer>
  );
}
export default Footer;
