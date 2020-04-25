import React, { useCallback, useState } from 'react';
import { Query, useStore } from '@graffy/react';
import * as common from '@graffy/common';

function Result({ result, loading, error }) {
  return (
    <>
      {loading ? (
        <div className="status">Loading...</div>
      ) : error ? (
        <div className="error">{error.toString()}</div>
      ) : result ? (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      ) : (
        <div className="status">No results</div>
      )}
      <style jsx>{`
        .error {
          color: #c00;
          padding: 1rem;
        }
        .status {
          color: #888;
          padding: 1rem;
        }
      `}</style>
    </>
  );
}

function evaluate(expression) {
  const names = Object.keys(common);
  const fn = new Function(...names, `return ${expression};`);
  return fn(...names.map((name) => common[name]));
}

export default function Explore(options) {
  const [input, setInput] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [watching, setWatching] = useState(null);
  const store = useStore();

  const onInputEnd = useCallback((event) => {
    try {
      setInput(evaluate(event.target.textContent));
    } catch (e) {
      setError(e.message);
    }
  });

  const onInputStart = useCallback(() => setError(null));

  const onReadClick = async () => {
    setWatching(false);
    setLoading(true);
    try {
      setResult(await store.read(input, options));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onWriteClick = async () => {
    setWatching(false);
    setLoading(true);
    try {
      setResult(await store.write(input, options));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onWatchClick = () => {
    setResult(null);
    setLoading(false);
    setWatching((w) => !w);
  };

  return (
    <div>
      <pre
        className="editor"
        contentEditable
        onFocus={onInputStart}
        onBlur={onInputEnd}
      />
      <div className="opbar">
        <button className="opbtn" disabled={watching} onClick={onReadClick}>
          read()
        </button>
        <button className="opbtn" disabled={watching} onClick={onWriteClick}>
          write()
        </button>
        <button className="opbtn" data-active={watching} onClick={onWatchClick}>
          watch()
        </button>
      </div>
      {error ? (
        <div className="error">{error}</div>
      ) : watching ? (
        <Query query={input} options={options}>
          {(props) => <Result {...props} />}
        </Query>
      ) : (
        <Result {...{ result, loading, error }} />
      )}

      <style jsx>{`
        .error {
          color: #c00;
          padding: 1rem;
        }
        .editor {
          min-height: 1rem;
          width: 100%;
        }
        .opbar {
          display: flex;
        }
        .opbtn {
          flex: 1 1 0;
          background: #ccc;
          color: #333;
          padding: 0.5rem 1rem;
          border: none;
        }
        .opbtn:first-child {
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
        }
        .opbtn:last-child {
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
        }
        .opbtn:not(:disabled):hover {
          cursor: pointer;
          box-shadow: inset 0 0 0 20px rgba(0, 0, 0, 0.1);
        }
        .opbtn[data-active='true']:not(:disabled),
        .opbtn:not(:disabled):active {
          background: #f36;
          color: #fff;
        }
        .opbtn:disabled {
          color: #888;
        }
      `}</style>
    </div>
  );
}
