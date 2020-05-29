import React, { useState, useCallback, useEffect } from 'react';
import { makeStream } from '@graffy/stream';
import { page, encodeKey, makeWatcher } from '@graffy/common';

const watcher = makeWatcher();

function finalize(value) {
  if (!value || typeof value !== 'object') return value;
  const obj = {};
  if (Array.isArray(value)) {
    value.forEach((v, i) => (obj[encodeKey(i)] = finalize(v)));
    return page(obj);
  }
  for (const i in value) obj[i] = finalize(value[i]);
  return obj;
}

let seed = 1000003;
const generateState = () => {
  seed = (seed * 73) % 9999991;
  return {
    players: [
      { name: 'Leia', score: seed % 43 },
      { name: 'Luke', score: seed % 41 },
      { name: 'R2D2', score: 0 },
    ],
  };
};

let state = generateState();

export function provider(store) {
  store.onRead(() => finalize(state));
  store.onWatch(() => makeWatcher(undefined));
}

function setState(change) {
  state = change;
  watcher.write(finalize(change));
}

let paused = false;
let resumeTimer;

function simulateChange() {
  if (paused) return;
  setState(generateState());
  setTimeout(simulateChange, 1000);
}

setTimeout(simulateChange, 1000);

export default function Source() {
  const [error, setError] = useState(null);
  const [_, forceRender] = useState(null);

  const handleChange = useCallback((event) => {
    let change;
    resumeTimer = setTimeout(() => {
      paused = false;
      resumeTimer = null;
      simulateChange();
    }, 5000);
    try {
      change = JSON.parse(event.target.textContent);
    } catch (e) {
      setError(e.message);
      return;
    }
    setState(change);
  });

  const clearError = useCallback(() => {
    if (resumeTimer) clearTimeout(resumeTimer);
    paused = true;
    resumeTimer = null;
    setError(null);
  });

  useEffect(() => {
    listeners.add(forceRender);
    return () => listeners.delete(forceRender);
  }, []);

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
