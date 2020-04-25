import React from 'react';
import PropTypes from 'prop-types';
import Visitor from './Visitor';

export default function VisitorList({ visitors }) {
  return (
    <div className="List">
      {visitors.map((visitor) => (
        <Visitor key={visitor.id} {...visitor} />
      ))}
    </div>
  );
}

VisitorList.propTypes = {
  visitors: PropTypes.array.isRequired,
  anchor: PropTypes.number,
};
