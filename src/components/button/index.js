import React from 'react';
import "./index.scss";

const Button = ({text, onClick, style}) => {
  return (
    <div className="button" style={style} onClick={onClick}>{ text }</div>
  )
}
export default Button;