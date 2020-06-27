import React from 'react';
import PropTypes from 'prop-types';
import Visitor from './Visitor';

export default function VisitorList({ visitors }) {
  return (
    <div className="List">
      {visitors.map((visitor) => (
        <Visitor key={visitor.id} {...visitor} />
      ))}
      <style jsx>{`
        .List {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(12em, 1fr));
          grid-gap: 1em;
        }
      `}</style>
    </div>
  );
}

VisitorList.propTypes = {
  visitors: PropTypes.array.isRequired,
  anchor: PropTypes.number,
};
