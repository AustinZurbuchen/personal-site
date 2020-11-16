import React, { Component } from "react";
import Titles from "../titles/index";
import "./index.scss";

class Experiences extends Component {
  render() {
    return (
      <div className="experiences">
        <div className="container">
          <Titles
            title="Experiences"
            subtitle='"The most important word a man can say are, ‘I will do better.‘"'
            by='- "Dalinar Kholin", Oathbringer by Brandon Sanderson'
          ></Titles>
          <div className="info column"></div>
        </div>
      </div>
    );
  }
}
export default Experiences;
