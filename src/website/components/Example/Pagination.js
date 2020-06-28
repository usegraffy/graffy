import React from 'react';
import PropTypes from 'prop-types';
import getTime from './getTime';

export default function Pagination({ range, count, onNext, onPrev }) {
  const getButtonProps = (fn) => (fn ? { onClick: fn } : { disabled: true });

  return (
    <div className="Pagination">
      <button className="PrevPage" {...getButtonProps(onPrev)}>
        &lt;
      </button>
      <span className="CurrPage">
        {range.first && `First ${range.first} `}
        {range.last && `Last ${range.last} `}
        {range.after && `after ${getTime(range.after)} `}
        {range.before && `before ${getTime(range.before)} `}
        {count !== (range.first || range.last) ? `(got ${count})` : ''}
      </span>
      <button className="NextPage" {...getButtonProps(onNext)}>
        &gt;
      </button>
      <style jsx>{`
        .Pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2em;
        }

        .Pagination > * {
          font-size: 1.25em;
          line-height: 1em;
          padding: 1em 0;
          background: #eee;
          color: #333;
        }

        .Pagination > span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .Pagination > button {
          width: 3em;
          border-radius: 0;
          border: none;
          cursor: pointer;
        }

        .Pagination > button:disabled {
          color: #ccc;
          cursor: default;
        }

        .Pagination > button:hover:not(:disabled) {
          background: #fff;
          box-shadow: inset 0 0 16px 8px #eee;
        }

        .Pagination > button:first-child {
          border-radius: 100% 0 0 100%;
        }

        .Pagination > button:last-child {
          border-radius: 0 100% 100% 0;
        }
      `}</style>
    </div>
  );
}

Pagination.propTypes = {
  count: PropTypes.number.isRequired,
  range: PropTypes.shape({
    first: PropTypes.number,
    last: PropTypes.number,
    after: PropTypes.number,
    before: PropTypes.number,
  }),
  onNext: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]).isRequired,
  onPrev: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]).isRequired,
};
