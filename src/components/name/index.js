import React, { Component } from 'react';
import './index.scss';

class Name extends Component {
    constructor(props) {
        super(props);
        this.name = "Austin Zurbuchen";
    }

    render() {
        return (
            <div className="nameContainer">
                <div className="name"> { this.name } </div>
                <div className="subText"> Interactive Resume </div>
            </div>
        )
    }
}
export default Name;