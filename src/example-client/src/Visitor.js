import React from 'react';

export default function Visitor({ id, name, ts }) {
  return (
    <div className="Visitor">
      <div className="Visitor-id">{id}</div>
      <div className="Visitor-name">{name}</div>
      <div className="Visitor-ts">{ts}</div>
    </div>
  );
}
