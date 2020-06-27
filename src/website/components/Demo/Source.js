import React, { useState, useCallback, useEffect } from 'react';
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
  store.onWatch(() => watcher.watch(undefined));
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
  const [html, setHtml] = useState(JSON.stringify(state, null, 2));

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
    const sourceStream = watcher.watch();
    (async () => {
      for await (const _ of sourceStream) {
        setHtml(JSON.stringify(state, null, 2));
      }
    })();
    return () => sourceStream.return();
  }, []);

  return (
    <>
      <pre
        className="editor"
        contentEditable
        onFocus={clearError}
        onBlur={handleChange}
        dangerouslySetInnerHTML={{ __html: html }}
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
