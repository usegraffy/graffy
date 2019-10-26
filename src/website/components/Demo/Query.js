import React, { useCallback } from 'react';

export default function Query({ value, onChange }) {
  const handleChange = useCallback(event => {
    console.log('HandleChange', event.target.textContent);
    let query;
    try {
      query = JSON.parse(event.target.textContent);
    } catch (_) {
      return;
    }
    onChange(query);
  });
  return (
    <pre>
      store.watch(
      <div className="editor" contentEditable onBlur={handleChange}>
        {JSON.stringify(value, null, 2)}
      </div>
      )
      <style jsx>{`
        .editor {
          margin-left: 1rem;
        }
      `}</style>
    </pre>
  );
}
