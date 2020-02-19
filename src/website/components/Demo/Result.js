import React from 'react';
import { useQuery } from '@graffy/react';

export default function Source({ query }) {
  const [result, loading] = useQuery(query);
  return loading ? (
    <div>Loading...</div>
  ) : (
    <pre>{JSON.stringify(result, null, 2)}</pre>
  );
}
