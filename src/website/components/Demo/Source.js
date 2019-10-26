import React, { useState, useCallback } from 'react';
import makeStream from '@graffy/stream';
import { page } from '@graffy/common';

const listeners = new Set();

function finalize(value) {
  if (!value || typeof value !== 'object') return value;
  const obj = {};
  if (Array.isArray(value)) {
    value.forEach((v, i) => (obj[`${i}`.padStart(10, '0')] = finalize(v)));
    return page(obj);
  }
  for (const i in value) obj[i] = finalize(value[i]);
  return obj;
}

let state = {
  players: [
    { name: 'Leia', avatar: 'leia.png' },
    { name: 'Luke', avatar: 'luke.png' },
  ],
};

export function provider(store) {
  store.onWatch(() =>
    makeStream(push => {
      listeners.add(push);
      push(finalize(state));
      return () => listeners.delete(push);
    }),
  );
}

export default function Source() {
  const [error, setError] = useState(null);

  const handleChange = useCallback(event => {
    let change;
    try {
      change = JSON.parse(event.target.textContent);
    } catch (e) {
      setError(e.message);
      return;
    }
    state = change;
    for (const push of listeners) push(finalize(change));
  });

  const clearError = useCallback(() => setError(null));

  return (
    <>
      <pre
        className="editor"
        contentEditable
        onFocus={clearError}
        onBlur={handleChange}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(state, null, 2) }}
      />
      {error && <div className="error">{error}</div>}
      <style jsx>{`
        .error {
          position: absolute;
          background: #f36;
          color: #fff;
          padding: 1rem;
        }
      `}</style>
    </>
  );
}
