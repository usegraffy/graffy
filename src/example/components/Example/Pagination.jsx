import React from 'react';
import PropTypes from 'prop-types';
import getTime from './getTime.js';

export default function Pagination({ range, count, onNext, onPrev }) {
  const getButtonProps = (fn) => (fn ? { onClick: fn } : { disabled: true });

  return (
    <div className="Pagination">
      <button className="PrevPage" {...getButtonProps(onPrev)}>
        &lt;
      </button>
      <span className="CurrPage">
        {range.$first && `First ${range.$first} `}
        {range.$last && `Last ${range.$last} `}
        {range.$after && `after ${getTime(range.$after[0])} `}
        {range.$before && `before ${getTime(range.$before[0])} `}
        {range.$since && `since ${getTime(range.$since[0])} `}
        {range.$until && `until ${getTime(range.$until[0])} `}
        {count !== (range.$first || range.$last) ? `(got ${count})` : ''}
      </span>
      <button className="NextPage" {...getButtonProps(onNext)}>
        &gt;
      </button>
    </div>
  );
}

Pagination.propTypes = {
  count: PropTypes.number.isRequired,
  range: PropTypes.shape({
    $first: PropTypes.number,
    $last: PropTypes.number,
    $after: PropTypes.arrayOf(PropTypes.number),
    $before: PropTypes.arrayOf(PropTypes.number),
  }),
  onNext: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  onPrev: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
};
