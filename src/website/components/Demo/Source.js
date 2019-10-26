import React from 'react';
// import JsonView from 'react-json-view';
import { useGraffy } from '@graffy/react';

export default function Source() {
  const [result, loading] = useGraffy({
    players: [{ after: '', before: '\uffff' }, { name: true, avatar: true }],
  });
  return loading ? (
    <div>Loading...</div>
  ) : (
    <pre>{JSON.stringify(result, null, 2)}</pre>
  );
}
