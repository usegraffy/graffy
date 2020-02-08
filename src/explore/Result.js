import React from 'react';
import { useGraffy } from '@graffy/react';

export default function Source({ query }) {
  const [result, loading, error] = useGraffy(query);
  return loading ? (
    <div>Loading...</div>
  ) : error ? (
    <div>{error.toString()}</div>
  ) : (
    <pre>{JSON.stringify(result, null, 2)}</pre>
  );
}
