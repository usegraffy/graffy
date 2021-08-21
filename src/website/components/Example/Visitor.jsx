import React from 'react';
import PropTypes from 'prop-types';
import getTime from './getTime.js';

export default function Visitor({ avatar, name, ts, pageviews }) {
  const timeString = getTime(ts);
  return (
    <div className="Visitor">
      <div className="Visitor-meta">
        <img className="Visitor-avatar" src={avatar} alt={name} />
        <div className="Visitor-name">{name}</div>
      </div>
      <div className="Visitor-pages">
        {pageviews.map((url, i) => (
          <div key={i} className="Visitor-page">
            {url}
          </div>
        ))}
      </div>
      <div className="Visitor-ts">{timeString}</div>
    </div>
  );
}

Visitor.propTypes = {
  avatar: PropTypes.string,
  name: PropTypes.string,
  ts: PropTypes.number,
  pageviews: PropTypes.array,
  muted: PropTypes.bool,
};
