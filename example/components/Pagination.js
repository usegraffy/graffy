import React from 'react';
import PropTypes from 'prop-types';
import getTime from './getTime';

export default function Pagination({ range, count, onNext, onPrev }) {
  const getButtonProps = fn => (fn ? { onClick: fn } : { disabled: true });

  return (
    <div className="Pagination">
      <button {...getButtonProps(onPrev)}>&lt;</button>
      <span>
        {range.first && `First ${range.first} `}
        {range.last && `Last ${range.last} `}
        {range.after && `after ${getTime(parseInt(range.after))} `}
        {range.before && `before ${getTime(parseInt(range.before))} `}
        {count !== (range.first || range.last) ? `(got ${count})` : ''}
      </span>
      <button {...getButtonProps(onNext)}>&gt;</button>
    </div>
  );
}

Pagination.propTypes = {
  count: PropTypes.number.isRequired,
  range: PropTypes.shape({
    first: PropTypes.number,
    last: PropTypes.number,
    after: PropTypes.string,
    before: PropTypes.string,
  }),
  onNext: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]).isRequired,
  onPrev: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]).isRequired,
};
