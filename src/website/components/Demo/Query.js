import React, { useCallback, useState } from 'react';

export default function Query({ value, onChange }) {
  const [error, setError] = useState(null);

  const handleChange = useCallback((event) => {
    let query;
    try {
      query = JSON.parse(event.target.textContent);
    } catch (e) {
      setError(e.message);
      return;
    }
    onChange(query);
  });

  const clearError = useCallback(() => setError(null));

  return (
    <pre>
      store.watch(
      <div
        id="query-editor"
        className="editor"
        contentEditable
        onFocus={clearError}
        onBlur={handleChange}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(value, null, 2) }}
      />
      ){error && <div className="error">{error}</div>}
      <style jsx>{`
        .editor {
          margin-left: 1rem;
        }
        .error {
          position: absolute;
          background: #f36;
          color: #fff;
          padding: 1rem;
        }
      `}</style>
    </pre>
  );
}
