import PropTypes from 'prop-types';
import React from 'react';
import Visitor from './Visitor.jsx';

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
