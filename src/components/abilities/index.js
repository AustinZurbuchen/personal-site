import React from "react";
import { useSelector } from "react-redux";
import { generateLanguages, generateTechnologies } from "../../utils/abilities";
import Itemslist from "../itemslist";
import Titles from "../titles/index";
import Editbar from "../editbar/index";
import { useQuoteEditor } from "../../utils/useQuoteEditor";
import "./index.scss";

function Abilities() {
  const resume = useSelector((state) => state.resume.value);
  let languages = <>{generateLanguages([...resume.abilities.languages])}</>;
  let technologies = (
    <>{generateTechnologies([...resume.abilities.technologies])}</>
  );
  let quote = resume.quotes[1];

  const { editor, editProps, context } = useQuoteEditor(
    "abilities",
    1,
    "Abilities"
  );

  return (
    <section className="abilities" aria-labelledby="abilities-title">
      <div className="container">
        <Editbar context={context} editor={editor}></Editbar>
        <Titles
          id="abilities-title"
          title="Abilities"
          subtitle={quote.quote}
          by={quote.by}
          edit={editProps}
        ></Titles>
        <div className="list column">
          <div className="languages">
            <Itemslist title="Languages" items={languages}></Itemslist>
          </div>
          <div className="technologies">
            <Itemslist title="Technologies" items={technologies}></Itemslist>
          </div>
        </div>
      </div>
    </section>
  );
}
export default Abilities;
