import useQuery from './useQuery.js';

export default function Query({ query, options, children }) {
  const { data, loading, error } = useQuery(query, options);
  return children({ data, loading, error });
}
