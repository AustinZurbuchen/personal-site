import React, { Component } from 'react';
import Button from "../button/index.js";
import "./index.scss";

class Header extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="header">
        <Button text="Style 1" onClick={() => console.log("Style 1")} />
        <Button text="Style 2" onClick={() => console.log("Style 2")} />
        <Button text="Style 3" onClick={() => console.log("Style 3")} />
      </div>
    )
  }
}
export default Header;