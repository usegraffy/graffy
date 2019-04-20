import React from 'react';
import PropTypes from 'prop-types';
import Visitor from './Visitor';

export default function VisitorList({ visitors, anchor }) {
  return (
    <div className="List">
      {visitors.map(visitor => (
        <Visitor key={visitor.id} {...visitor} muted={anchor === visitor.id} />
      ))}
    </div>
  );
}

VisitorList.propTypes = {
  visitors: PropTypes.array.isRequired,
  anchor: PropTypes.string,
};
