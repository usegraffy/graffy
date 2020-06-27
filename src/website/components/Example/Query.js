import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { pretty } from '@graffy/testing';

export default function Query({ query, onChange }) {
  const [error, setError] = useState(false);
  const onChangElement = (event) => {
    try {
      const value = JSON.parse(event.target.value);
      onChange(value);
    } catch (_) {
      setError(true);
    }
  };

  return (
    <>
      <textarea
        className={`Query ${error.current ? 'Query--error' : ''}`}
        onBlur={onChangElement}
        defaultValue={pretty(query)}
      />
      <style jsx>{`
        .Query {
          position: fixed;
          display: block;
          top: -1px;
          left: -60%;
          height: 100%;
          width: 60%;
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
            monospace;
          font-size: 16px;
          line-height: 1.5em;
          box-sizing: content-box;
          border: none;
          background: #eee;
          z-index: 1;
          padding: 24px;
          transition: all 0.2s ease-out;
          cursor: pointer;
        }

        .Query:focus {
          left: 0;
          cursor: text;
          background: #fff;
          box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </>
  );
}

Query.propTypes = {
  query: PropTypes.any,
  onChange: PropTypes.func,
};
