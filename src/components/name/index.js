import React, { useEffect, useState } from "react";
import { useSelector } from 'react-redux';
import "./index.scss";

// class Name extends Component {
function Name() {
  const [name, setName] = useState("");
  const resume = useSelector((state) => state.resume.value);

  useEffect(() => {
    setName(resume.profile.name);
  }, [resume]);

  // render() {
    return (
      <div className="nameContainer">
        <div className="name"> {name} </div>
        <div className="subText"> Resume </div>
      </div>
    );
  }
// }
export default Name;
