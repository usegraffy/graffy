import React from 'react';
import { useGraffy } from '@graffy/react';

export default function Source({ query }) {
  const [result, loading] = useGraffy(query);
  return loading ? (
    <div>Loading...</div>
  ) : (
    <pre>{JSON.stringify(result, null, 2)}</pre>
  );
}
