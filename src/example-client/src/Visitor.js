import React from 'react';

export default function Visitor({ id, avatar, name, ts, pageviews }) {
  return (
    <div className="Visitor">
      <img className="Visitor-avatar" src={avatar} alt={name} />
      <div className="Visitor-name">{name}</div>
      <div className="Visitor-ts">{new Date(ts).toLocaleString()}</div>
    </div>
  );
}
