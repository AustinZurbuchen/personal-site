import React from 'react';
import './index.scss';

const Titles = ({title, subtitle}) => {
    return (
        <div className="titles">
            <div className="title">{ title }</div>
            <div className="subtitle">{ subtitle }</div>
        </div>
    )
}
export default Titles;