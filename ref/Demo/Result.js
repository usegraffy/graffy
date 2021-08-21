import React from 'react';
import { useQuery } from '@graffy/react';

export default function Source({ query }) {
  const { data, loading } = useQuery(query);
  return loading ? (
    <div>Loading...</div>
  ) : (
    <pre>{JSON.stringify(data, null, 2)}</pre>
  );
}
