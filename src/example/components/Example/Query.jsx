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
    </>
  );
}

Query.propTypes = {
  query: PropTypes.any,
  onChange: PropTypes.func,
};
