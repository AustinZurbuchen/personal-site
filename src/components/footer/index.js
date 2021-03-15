import React, { Component } from "react";
import Titles from "../titles/index";
import "./index.scss";

const quote = require("../../data/quotes.json")[2];
const links = require("../../data/links.json");

class Footer extends Component {
  render() {
    return (
      <div className="footer">
        <div className="container">
          <Titles title="Contact" subtitle={quote.quote} by={quote.by}></Titles>
          <div className="links">
            <div className="link email">{links.email}</div>
            <div className="link linkedin">
              {" "}
              <a href={links.linkedin}>linkedin</a>
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
}
export default Footer;
